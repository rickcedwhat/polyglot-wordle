/**
 * Combined dictionary review: Gemini writes 1-3 meanings per word, then Jev answers
 * word-level questions (real word, form, main meaning, obscure, level) and per-meaning
 * questions (accuracy, format, offensive, slang).
 *
 * Usage:
 *   npm run eval:dict:review -- --lang=pt --pilot       (same words as the label pilot)
 *   npm run eval:dict:review -- --lang=pt --sample=200
 *   npm run eval:dict:review -- --lang=it --words=cazzo,porno
 *   npm run eval:dict:review -- --lang=pt                (every word in public/pt.json)
 *   npm run eval:dict:review -- --lang=pt --step=meanings (Gemini only)
 *
 * Artifacts (resumable; pass --fresh to redo):
 *   evals/artifacts/meanings_{lang}.json   Gemini meanings
 *   evals/artifacts/review_{lang}.json     Jev answers
 *   evals/artifacts/review_{lang}.summary.md
 */
import fs from 'fs';
import path from 'path';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { loadEnv, mapPool } from './cli';
import { loadDictionary } from './dataset';
import { generateMeanings, MEANINGS_TASK, MeaningsInput, MeaningsResult } from './meanings';
import { Language } from './types';
import {
  decide,
  mainMeaningIndex,
  offensiveBucket,
  REVIEW_TASK,
  ReviewResult,
  reviewWordWithJev,
} from './wordReview';

loadEnv();

const ARTIFACTS_DIR = path.resolve(process.cwd(), 'evals', 'artifacts');
const GEMINI_BATCH = 25;

interface Options {
  lang: Language;
  pilot: boolean;
  sample: number;
  words: string[];
  step: 'all' | 'meanings' | 'review';
  concurrency: number;
  fresh: boolean;
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    lang: 'pt',
    pilot: false,
    sample: 0,
    words: [],
    step: 'all',
    concurrency: 10,
    fresh: false,
  };
  for (const arg of argv) {
    const [flag, value = ''] = arg.split('=');
    if (flag === '--lang') {
      options.lang = value;
    } else if (flag === '--pilot') {
      options.pilot = true;
    } else if (flag === '--sample') {
      options.sample = Number(value);
    } else if (flag === '--words') {
      options.words = value
        .split(',')
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean);
    } else if (flag === '--step') {
      if (value !== 'all' && value !== 'meanings' && value !== 'review') {
        throw new Error('--step must be all, meanings or review');
      }
      options.step = value;
    } else if (flag === '--concurrency') {
      options.concurrency = Number(value);
    } else if (flag === '--fresh') {
      options.fresh = true;
    }
  }
  if (!/^[a-z]{2}$/.test(options.lang)) {
    throw new Error('--lang must be a two-letter code (e.g. --lang=pt)');
  }
  if (!Number.isInteger(options.sample) || options.sample < 0) {
    throw new Error('--sample must be a whole number');
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error('--concurrency must be at least 1');
  }
  return options;
}

/** Deterministic shuffle so the same sample is drawn every run. */
function seededSample<T>(items: T[], count: number, seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  }
  const random = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

interface ArtifactFile<T> {
  lang: Language;
  task: string;
  updatedAt: string;
  results: Record<string, T>;
}

function readArtifact<T>(
  file: string,
  lang: Language,
  task: string,
  fresh: boolean
): ArtifactFile<T> {
  if (!fresh && fs.existsSync(file)) {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8')) as ArtifactFile<T>;
    if (saved.task === task) {
      return saved;
    }
  }
  return { lang, task, updatedAt: '', results: {} };
}

function writeArtifact<T>(file: string, data: ArtifactFile<T>) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  data.updatedAt = new Date().toISOString();
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function selectTargets(options: Options): MeaningsInput[] {
  const dictionary = loadDictionary(options.lang);
  const byWord = new Map(dictionary.map((entry) => [entry.word, entry]));
  const fromWords = (words: string[]) => words.map((word) => byWord.get(word) ?? { word });

  if (options.pilot) {
    const pilotFile = path.join(ARTIFACTS_DIR, `labels_${options.lang}.json`);
    if (!fs.existsSync(pilotFile)) {
      throw new Error(`--pilot needs ${pilotFile} from the label pilot`);
    }
    const pilot = JSON.parse(fs.readFileSync(pilotFile, 'utf8')) as {
      results: Record<string, unknown>;
    };
    return fromWords([...Object.keys(pilot.results), ...options.words]);
  }
  if (options.sample) {
    const sample = seededSample(dictionary, options.sample, `labels-${options.lang}`);
    const extra = options.words.filter((w) => !sample.some((s) => s.word === w));
    return [...sample, ...fromWords(extra)];
  }
  return options.words.length ? fromWords(options.words) : dictionary;
}

function summarize(lang: Language, results: ReviewResult[]) {
  const rows = results.map((r) => ({ r, outcome: decide(r) }));
  const words = (list: typeof rows) =>
    list
      .map(({ r }) => r.display)
      .sort()
      .join(', ') || '(none)';
  const group = new Map<string, typeof rows>();
  for (const row of rows) {
    const o = row.outcome;
    const key =
      o.kind === 'answer'
        ? `answer: ${o.level}`
        : `${o.kind.replace('_', '-')}: ${o.gate} ${o.bucket}`;
    group.set(key, [...(group.get(key) ?? []), row]);
  }

  let md = `# Jev word review: ${lang.toUpperCase()}\n\n`;
  md += `Reviewed: ${results.length}\n\n| Outcome | Words |\n| :--- | ---: |\n`;
  const keys = [...group.keys()].sort();
  for (const key of keys) {
    md += `| ${key} | ${group.get(key)!.length} |\n`;
  }

  const buckets = new Map<string, number>();
  for (const { outcome } of rows) {
    for (const s of outcome.steps) {
      const key = `${s.gate}: ${s.sure ? '' : 'maybe '}${s.bucket}`;
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }
  md += `\n## Buckets at each gate (words that reached it)\n\n| Gate: bucket | Words |\n| :--- | ---: |\n`;
  for (const [key, n] of buckets) {
    md += `| ${key} | ${n} |\n`;
  }

  const forms = new Map<string, number>();
  for (const { r } of rows) {
    forms.set(r.jev.form.choice, (forms.get(r.jev.form.choice) ?? 0) + 1);
  }
  md += `\n## Word forms\n\n| Form | Words |\n| :--- | ---: |\n`;
  for (const [form, n] of forms) {
    md += `| ${form} | ${n} |\n`;
  }

  for (const key of keys) {
    md += `\n## ${key}\n\n${words(group.get(key)!)}\n`;
  }

  const mixed = rows.filter(
    ({ r }) =>
      r.meanings.length > 1 &&
      new Set(r.meanings.map((m) => offensiveBucket(m.jev).replace('?', ''))).size > 1
  );
  md += `\n## Mixed meanings (main meaning decides)\n\n`;
  for (const { r, outcome } of mixed) {
    const main = mainMeaningIndex(r);
    md += `- **${r.display}** → ${outcome.kind === 'answer' ? `answer (${outcome.level})` : outcome.kind}\n`;
    r.meanings.forEach((m, i) => {
      md += `  - ${i === main ? '★ ' : ''}${offensiveBucket(m.jev)}${m.jev.slang.choice === 'yes' ? ', slang' : ''}: ${m.def}\n`;
    });
  }
  return md;
}

async function runMeanings(options: Options, targets: MeaningsInput[]) {
  const file = path.join(ARTIFACTS_DIR, `meanings_${options.lang}.json`);
  const saved = readArtifact<MeaningsResult>(file, options.lang, MEANINGS_TASK, options.fresh);
  const todo = targets.filter((t) => !saved.results[t.word]);
  console.log(`\n📚 Gemini meanings: ${options.lang.toUpperCase()} — ${todo.length} to write`);
  if (!todo.length) {
    return saved;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in .env.local');
  }
  const batches: MeaningsInput[][] = [];
  for (let i = 0; i < todo.length; i += GEMINI_BATCH) {
    batches.push(todo.slice(i, i + GEMINI_BATCH));
  }
  const failures: string[] = [];
  await mapPool(
    batches,
    4,
    async (batch) => {
      try {
        for (const result of await generateMeanings(options.lang, batch, apiKey)) {
          saved.results[result.word] = result;
        }
        writeArtifact(file, saved);
      } catch (err) {
        failures.push(...batch.map((b) => b.word));
        console.warn(`\n  ⚠️ batch failed: ${err instanceof Error ? err.message : err}`);
      }
    },
    (done, total) => process.stdout.write(`\r  ${done}/${total} batches   `)
  );
  writeArtifact(file, saved);
  if (failures.length) {
    console.log(
      `\n⚠️  ${failures.length} words failed (re-run to retry): ${failures.slice(0, 20).join(', ')}`
    );
  }
  return saved;
}

async function runJev(
  options: Options,
  targets: MeaningsInput[],
  meanings: ArtifactFile<MeaningsResult>
) {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing TYPESAFE_API_KEY in .env.local');
  }
  const file = path.join(ARTIFACTS_DIR, `review_${options.lang}.json`);
  const saved = readArtifact<ReviewResult>(file, options.lang, REVIEW_TASK, options.fresh);
  const ready = targets.filter((t) => meanings.results[t.word]);
  const todo = ready.filter((t) => !saved.results[t.word]);
  console.log(`\n🔎 Jev review: ${options.lang.toUpperCase()} — ${todo.length} to review`);

  const client = new TypeSafeClient({ apiKey });
  const failures: { word: string; error: string }[] = [];
  let sinceSave = 0;
  const start = Date.now();
  await mapPool(
    todo,
    options.concurrency,
    async (t) => {
      const m = meanings.results[t.word];
      try {
        saved.results[t.word] = await reviewWordWithJev(client, {
          word: t.word,
          lang: options.lang,
          display: m.display,
          meanings: m.meanings,
        });
        if (++sinceSave >= 50) {
          sinceSave = 0;
          writeArtifact(file, saved);
        }
      } catch (err) {
        failures.push({ word: t.word, error: err instanceof Error ? err.message : String(err) });
      }
    },
    (done, total) => {
      if (done % 25 === 0 || done === total) {
        process.stdout.write(
          `\r  ${done}/${total} (${((Date.now() - start) / 1000).toFixed(0)}s)   `
        );
      }
    }
  );
  writeArtifact(file, saved);

  const selected = ready
    .map((t) => saved.results[t.word])
    .filter((r): r is ReviewResult => Boolean(r));
  const summaryPath = file.replace(/\.json$/, '.summary.md');
  fs.writeFileSync(summaryPath, summarize(options.lang, selected));
  console.log(`\n✅ ${selected.length} reviewed, ${failures.length} failed`);
  console.log(`📄 ${summaryPath}`);
  if (failures.length) {
    const failPath = file.replace(/\.json$/, '.failures.json');
    fs.writeFileSync(failPath, `${JSON.stringify(failures, null, 2)}\n`);
    console.log(`⚠️  Failures: ${failPath} (re-run to retry them)`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets = selectTargets(options);
  console.log(`Selected ${targets.length} words`);
  const meanings =
    options.step === 'review'
      ? readArtifact<MeaningsResult>(
          path.join(ARTIFACTS_DIR, `meanings_${options.lang}.json`),
          options.lang,
          MEANINGS_TASK,
          false
        )
      : await runMeanings(options, targets);
  if (options.step !== 'meanings') {
    await runJev(options, targets, meanings);
  }
}

main().catch((err) => {
  console.error('\n❌ Review failed:', err);
  process.exit(1);
});
