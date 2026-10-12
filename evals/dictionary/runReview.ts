/**
 * Combined dictionary review: Gemini writes 1-3 meanings per word, then Jev answers
 * word-level questions (real word, fused, form, main meaning, spelling) and per-meaning
 * questions (accuracy, format, censor, form sense, form use, obscure, CEFR level). Words where
 * an unsure answer could change the fate go to a Gemini tie-breaker (settle.ts). A separate
 * Jev check flags words whose meanings may be missing the one most speakers think of first.
 *
 * Usage:
 *   npm run eval:dict:review -- --lang=pt --pilot       (same words as the label pilot)
 *   npm run eval:dict:review -- --lang=pt --sample=200
 *   npm run eval:dict:review -- --lang=it --words=cazzo,porno
 *   npm run eval:dict:review -- --lang=pt                (every word in public/pt.json)
 *   npm run eval:dict:review -- --lang=pt --step=meanings (Gemini only)
 *   npm run eval:dict:review -- --lang=pt --step=obscure  (asks the obscure question where missing; --fresh re-asks all)
 *   npm run eval:dict:review -- --lang=pt --step=coverage (missing-meaning flags only)
 *   npm run eval:dict:review -- --lang=pt --step=settle   (tie-breaker only)
 *
 * Artifacts (resumable; pass --fresh to redo):
 *   evals/artifacts/meanings_{lang}.json   Gemini meanings
 *   evals/artifacts/review_{lang}.json     Jev answers
 *   evals/artifacts/coverage_{lang}.json   Jev missing-meaning flags
 *   evals/artifacts/settle_{lang}.json     Gemini tie-breaker rulings
 *   evals/artifacts/review_{lang}.summary.md
 */
import fs from 'fs';
import path from 'path';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { loadEnv, mapPool } from './cli';
import { loadDictionary } from './dataset';
import { generateMeanings, MEANINGS_TASK, MeaningsInput, MeaningsResult } from './meanings';
import { fateLabel, finalOutcome, Override, OVERRIDES } from './overrides';
import { SETTLE_TASK, Settled, settleMaybes } from './settle';
import { Language } from './types';
import {
  Answer,
  askObscureWithJev,
  checkCoverageWithJev,
  Coverage,
  COVERAGE_TASK,
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
/** Jev's probability that the main meaning is missing at which a word is flagged in the summary. */
const MISSING_FLAG_AT = 0.8;

const STEPS = ['all', 'meanings', 'review', 'obscure', 'coverage', 'settle'] as const;
type Step = (typeof STEPS)[number];

interface Options {
  lang: Language;
  pilot: boolean;
  sample: number;
  words: string[];
  step: Step;
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
      if (!(STEPS as readonly string[]).includes(value)) {
        throw new Error(`--step must be one of ${STEPS.join(', ')}`);
      }
      options.step = value as Step;
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

function summarize(
  lang: Language,
  results: ReviewResult[],
  settled: Record<string, Settled> = {},
  coverage: Record<string, Answer<Coverage>> = {}
) {
  const rows = results.map((r) => ({ r, ...finalOutcome(r, settled) }));
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
        ? `answer: ${o.difficulty}`
        : 'manual' in o
          ? `${o.kind.replace('_', '-')}: manual`
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
    md += `- **${r.display}** → ${fateLabel(outcome)}\n`;
    r.meanings.forEach((m, i) => {
      md += `  - ${i === main ? '★ ' : ''}${offensiveBucket(m.jev)}: ${m.def}\n`;
    });
  }

  const missing = rows
    .map((row) => ({ ...row, p: coverage[row.r.word]?.probabilities.missing ?? 0 }))
    .filter(({ p }) => p >= MISSING_FLAG_AT)
    .sort((a, b) => b.p - a.p);
  if (missing.length) {
    md += `\n## Meanings may be missing the main one (flag only)\n\n`;
    for (const { r, outcome, p } of missing) {
      md += `- **${r.display}** (${Math.round(p * 100)}%) → ${fateLabel(outcome)}: ${r.meanings.map((m) => m.def).join(' / ')}\n`;
    }
  }

  const manual = rows.filter(({ source }) => source === 'manual');
  if (manual.length) {
    md += `\n## Manual overrides\n\n`;
    for (const { r, outcome, auto } of manual) {
      const m = OVERRIDES[lang]?.[r.word] as Override;
      const what = m.fate
        ? 'fate set by hand'
        : Object.entries(m.answers ?? {})
            .map(([q, c]) => `${q}: ${c}`)
            .join(', ');
      const agrees = fateLabel(auto) === fateLabel(outcome) ? ' (same as the pipeline)' : '';
      md += `- **${r.display}** → ${fateLabel(outcome)} (${what}), pipeline says ${fateLabel(auto)}${agrees}.${m.reason ? ` ${m.reason}` : ''} (${m.date})\n`;
    }
  }

  const ruled = rows.filter(({ ruling }) => ruling?.rulings.length);
  if (ruled.length) {
    md += `\n## Settled by Gemini\n\n`;
    for (const { r, outcome, ruling } of ruled) {
      md += `- **${r.display}** → ${fateLabel(outcome)}\n`;
      for (const x of ruling!.rulings) {
        md += `  - ${x.question}: Jev ${x.jev} ${Math.round(x.jevProbability * 100)}% → Gemini ${x.gemini}. ${x.reason}\n`;
      }
    }
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
  console.log(`\n✅ ${todo.length - failures.length} reviewed, ${failures.length} failed`);
  if (failures.length) {
    const failPath = file.replace(/\.json$/, '.failures.json');
    fs.writeFileSync(failPath, `${JSON.stringify(failures, null, 2)}\n`);
    console.log(`⚠️  Failures: ${failPath} (re-run to retry them)`);
  }
}

const SETTLE_BATCH = 50;
const settleFile = (lang: Language) => path.join(ARTIFACTS_DIR, `settle_${lang}.json`);
/** Settled outcomes depend on the review answers, so a new review version starts them over. */
const settleTask = `${SETTLE_TASK}+${REVIEW_TASK}`;

function reviewedTargets(options: Options, targets: MeaningsInput[]) {
  const review = readArtifact<ReviewResult>(
    path.join(ARTIFACTS_DIR, `review_${options.lang}.json`),
    options.lang,
    REVIEW_TASK,
    false
  );
  return targets.map((t) => review.results[t.word]).filter((r): r is ReviewResult => Boolean(r));
}

async function runSettle(options: Options, targets: MeaningsInput[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY in .env.local');
  }
  const file = settleFile(options.lang);
  const saved = readArtifact<Settled>(file, options.lang, settleTask, options.fresh);
  const todo = reviewedTargets(options, targets).filter(
    (r) => !saved.results[r.word] && decide(r).kind === 'maybe'
  );
  console.log(`\n⚖️  Gemini tie-breaker: ${options.lang.toUpperCase()} — ${todo.length} maybes`);
  const batches: ReviewResult[][] = [];
  for (let i = 0; i < todo.length; i += SETTLE_BATCH) {
    batches.push(todo.slice(i, i + SETTLE_BATCH));
  }
  let failed = 0;
  await mapPool(batches, 4, async (batch) => {
    try {
      Object.assign(saved.results, await settleMaybes(options.lang, batch, apiKey));
      writeArtifact(file, saved);
    } catch (err) {
      failed += batch.length;
      console.warn(`\n  ⚠️ batch failed: ${err instanceof Error ? err.message : err}`);
    }
  });
  writeArtifact(file, saved);
  const left = todo.filter((r) => saved.results[r.word]?.outcome.kind === 'maybe');
  console.log(
    `\n✅ ${todo.length - failed} settled, ${failed} failed${left.length ? `; still maybe: ${left.map((r) => r.display).join(', ')}` : ''}`
  );
}

/** Asks the obscure question for meanings reviewed before it existed, saving into the review artifact. */
async function runObscure(options: Options, targets: MeaningsInput[]) {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing TYPESAFE_API_KEY in .env.local');
  }
  const file = path.join(ARTIFACTS_DIR, `review_${options.lang}.json`);
  const saved = readArtifact<ReviewResult>(file, options.lang, REVIEW_TASK, false);
  const todo = reviewedTargets(options, targets).flatMap((r) =>
    r.meanings.flatMap((m, i) => (m.jev.obscure && !options.fresh ? [] : [{ r, i }]))
  );
  console.log(
    `\n🔎 Obscure question: ${options.lang.toUpperCase()} — ${todo.length} meanings to ask`
  );
  const client = new TypeSafeClient({ apiKey });
  let failed = 0;
  await mapPool(todo, options.concurrency, async ({ r, i }) => {
    try {
      saved.results[r.word].meanings[i].jev.obscure = await askObscureWithJev(client, r, i);
    } catch (err) {
      failed++;
      console.warn(`\n  ⚠️ ${r.word} #${i + 1}: ${err instanceof Error ? err.message : err}`);
    }
  });
  writeArtifact(file, saved);
  console.log(`\n✅ ${todo.length - failed} asked, ${failed} failed`);
}

const coverageFile = (lang: Language) => path.join(ARTIFACTS_DIR, `coverage_${lang}.json`);
/** Coverage judges Gemini's meanings, so new meanings start it over. */
const coverageTask = `${COVERAGE_TASK}+${MEANINGS_TASK}`;

async function runCoverage(options: Options, targets: MeaningsInput[]) {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing TYPESAFE_API_KEY in .env.local');
  }
  const file = coverageFile(options.lang);
  const saved = readArtifact<Answer<Coverage>>(file, options.lang, coverageTask, options.fresh);
  const todo = reviewedTargets(options, targets).filter(
    (r) => r.meanings.length && !saved.results[r.word]
  );
  console.log(`\n🧭 Meanings coverage: ${options.lang.toUpperCase()} — ${todo.length} to check`);
  const client = new TypeSafeClient({ apiKey });
  let failed = 0;
  await mapPool(todo, options.concurrency, async (r) => {
    try {
      saved.results[r.word] = await checkCoverageWithJev(client, r);
    } catch (err) {
      failed++;
      console.warn(`\n  ⚠️ ${r.word}: ${err instanceof Error ? err.message : err}`);
    }
  });
  writeArtifact(file, saved);
  console.log(`\n✅ ${todo.length - failed} checked, ${failed} failed`);
}

function writeSummary(options: Options, targets: MeaningsInput[]) {
  const settled = readArtifact<Settled>(settleFile(options.lang), options.lang, settleTask, false);
  const coverage = readArtifact<Answer<Coverage>>(
    coverageFile(options.lang),
    options.lang,
    coverageTask,
    false
  );
  const summaryPath = path.join(ARTIFACTS_DIR, `review_${options.lang}.summary.md`);
  fs.writeFileSync(
    summaryPath,
    summarize(options.lang, reviewedTargets(options, targets), settled.results, coverage.results)
  );
  console.log(`📄 ${summaryPath}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const targets = selectTargets(options);
  console.log(`Selected ${targets.length} words`);
  if (options.step === 'all' || options.step === 'meanings' || options.step === 'review') {
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
  if (options.step === 'obscure') {
    await runObscure(options, targets);
  }
  if (options.step === 'all' || options.step === 'coverage') {
    await runCoverage(options, targets);
  }
  if (options.step === 'all' || options.step === 'settle') {
    await runSettle(options, targets);
  }
  if (options.step !== 'meanings') {
    writeSummary(options, targets);
  }
}

main().catch((err) => {
  console.error('\n❌ Review failed:', err);
  process.exit(1);
});
