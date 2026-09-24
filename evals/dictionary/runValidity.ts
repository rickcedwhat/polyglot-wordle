/**
 * Jev lexical-validity screen for dictionary seed lists.
 *
 * Usage:
 *   npm run eval:dict:validity -- --lang pt
 *   npm run eval:dict:validity -- --lang pt --prune --hard-reject-min=0.55 --non-word-min=0.5
 *   npm run eval:dict:validity -- --lang pt --dry-run
 *
 * Dual-signal screen: lexical suitability + form (lemma | inflection | not_a_word_form).
 * Default is analysis-only (writes artifacts, does not prune) unless --prune is passed.
 */
import fs from 'fs';
import path from 'path';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { loadDictionary } from './dataset';
import {
  DEFAULT_PRUNE_THRESHOLDS,
  decideShouldRemove,
  evaluateLexicalValidityWithJev,
  FormVerdict,
  HARD_REJECT_VERDICTS,
  LexicalValidityResult,
  LexicalVerdict,
  PruneThresholds,
  REJECT_VERDICTS,
} from './lexicalValidity';
import { DictionaryEntry, Language, RawDictionary } from './types';

function loadEnv() {
  for (const rel of ['.env.local', '.env']) {
    const file = path.resolve(process.cwd(), rel);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq);
      const val = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '');
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  }
}
loadEnv();

const ARTIFACTS_DIR = path.resolve(process.cwd(), 'evals', 'artifacts');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const DATA_DIR = path.resolve(process.cwd(), 'data');

function parseArgs(argv: string[]) {
  let lang: Language = 'pt';
  let limit = 0;
  let dryRun = false;
  let prune = false;
  let concurrency = 8;
  const thresholds: PruneThresholds = { ...DEFAULT_PRUNE_THRESHOLDS };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') dryRun = true;
    else if (arg === '--prune') prune = true;
    else if (arg === '--require-not-a-word-form') thresholds.requireNotAWordForm = true;
    else if (arg === '--lang' && argv[i + 1]) lang = argv[++i] as Language;
    else if (arg.startsWith('--lang=')) lang = arg.slice('--lang='.length) as Language;
    else if (arg === '--limit' && argv[i + 1]) limit = Number(argv[++i]);
    else if (arg.startsWith('--limit=')) limit = Number(arg.slice('--limit='.length));
    else if (arg === '--concurrency' && argv[i + 1]) concurrency = Number(argv[++i]);
    else if (arg.startsWith('--concurrency=')) concurrency = Number(arg.slice('--concurrency='.length));
    else if (arg === '--min-confidence' && argv[i + 1]) {
      // Back-compat: applies to hard rejects.
      thresholds.hardRejectMin = Number(argv[++i]);
    } else if (arg.startsWith('--min-confidence=')) {
      thresholds.hardRejectMin = Number(arg.slice('--min-confidence='.length));
    } else if (arg === '--hard-reject-min' && argv[i + 1]) {
      thresholds.hardRejectMin = Number(argv[++i]);
    } else if (arg.startsWith('--hard-reject-min=')) {
      thresholds.hardRejectMin = Number(arg.slice('--hard-reject-min='.length));
    } else if (arg === '--non-word-min' && argv[i + 1]) {
      thresholds.nonWordMin = Number(argv[++i]);
    } else if (arg.startsWith('--non-word-min=')) {
      thresholds.nonWordMin = Number(arg.slice('--non-word-min='.length));
    } else if (arg === '--inflection-protect-min' && argv[i + 1]) {
      thresholds.formProtectMin = Number(argv[++i]);
    } else if (arg.startsWith('--inflection-protect-min=')) {
      thresholds.formProtectMin = Number(arg.slice('--inflection-protect-min='.length));
    } else if (arg === '--form-protect-min' && argv[i + 1]) {
      thresholds.formProtectMin = Number(argv[++i]);
    } else if (arg.startsWith('--form-protect-min=')) {
      thresholds.formProtectMin = Number(arg.slice('--form-protect-min='.length));
    } else if (arg === '--not-a-word-form-min' && argv[i + 1]) {
      thresholds.notAWordFormMin = Number(argv[++i]);
    } else if (arg.startsWith('--not-a-word-form-min=')) {
      thresholds.notAWordFormMin = Number(arg.slice('--not-a-word-form-min='.length));
    }
  }

  if (!/^[a-z]{2}$/.test(lang)) {
    throw new Error('--lang must be a two-letter code (e.g. pt)');
  }
  if (!Number.isFinite(limit) || limit < 0) {
    throw new Error('--limit must be a non-negative number');
  }
  if (!Number.isFinite(concurrency) || concurrency < 1) {
    throw new Error('--concurrency must be >= 1');
  }
  for (const [name, value] of Object.entries(thresholds)) {
    if (typeof value === 'number' && (!Number.isFinite(value) || value < 0 || value > 1)) {
      throw new Error(`${name} must be between 0 and 1`);
    }
  }

  return { lang, limit, dryRun, prune, concurrency, thresholds };
}

class MockValidityClient {
  async systemOne({ state }: { state: { word: string; display: string } }) {
    const englishish = new Set(['about', 'there', 'where', 'house', 'water', 'apple', 'crane']);
    const token = (state.display || state.word).toLowerCase();
    const lexical: LexicalVerdict = englishish.has(token) ? 'foreign_leak' : 'valid';
    const form: FormVerdict = englishish.has(token) ? 'not_a_word_form' : 'lemma';
    return {
      answers: {
        lexical: { choice: lexical, confidence: 0.9 },
        form: { choice: form, confidence: 0.9 },
      },
    };
  }
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let done = 0;

  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
      done++;
      onProgress?.(done, items.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

function applyThresholds(
  results: LexicalValidityResult[],
  thresholds: PruneThresholds
): LexicalValidityResult[] {
  return results.map((r) => {
    const decision = decideShouldRemove(
      r.verdict,
      r.confidence,
      r.formVerdict,
      r.formConfidence,
      thresholds
    );
    return {
      ...r,
      shouldRemove: decision.shouldRemove,
      removeReason: decision.reason,
    };
  });
}

function summarize(results: LexicalValidityResult[]) {
  const byVerdict = {} as Record<LexicalVerdict, number>;
  const byForm = {} as Record<FormVerdict, number>;
  for (const v of [
    'valid',
    'proper_noun',
    'foreign_leak',
    'non_word',
    'multiword_or_clitic',
    'abbreviation',
    'offensive',
  ] as LexicalVerdict[]) {
    byVerdict[v] = 0;
  }
  for (const f of ['lemma', 'inflection', 'not_a_word_form'] as FormVerdict[]) {
    byForm[f] = 0;
  }
  for (const r of results) {
    byVerdict[r.verdict]++;
    byForm[r.formVerdict]++;
  }

  const removals = results.filter((r) => r.shouldRemove);
  const rejectAny = results.filter((r) => REJECT_VERDICTS.has(r.verdict));
  const protectedForms = results.filter((r) => r.removeReason?.startsWith('protected_'));
  const nonWord = results.filter((r) => r.verdict === 'non_word');

  return {
    byVerdict,
    byForm,
    removals,
    rejectAny,
    protectedInflections: protectedForms,
    nonWord,
    total: results.length,
  };
}

function crossTab(results: LexicalValidityResult[]) {
  const table: Record<string, Record<string, number>> = {};
  for (const r of results) {
    if (!table[r.verdict]) table[r.verdict] = {};
    table[r.verdict][r.formVerdict] = (table[r.verdict][r.formVerdict] || 0) + 1;
  }
  return table;
}

function writeThresholdSweep(lang: Language, raw: LexicalValidityResult[]) {
  const hardOpts = [0.45, 0.5, 0.55, 0.6, 0.7];
  const nonWordOpts = [0.4, 0.45, 0.5, 0.55, 0.6];
  const protectOpts = [0.4, 0.45, 0.5, 0.55, 0.6];

  const sweep = [];
  for (const hardRejectMin of hardOpts) {
    for (const nonWordMin of nonWordOpts) {
      for (const formProtectMin of protectOpts) {
        for (const requireNotAWordForm of [false, true]) {
          const thresholds: PruneThresholds = {
            hardRejectMin,
            nonWordMin,
            formProtectMin,
            requireNotAWordForm,
            notAWordFormMin: nonWordMin,
          };
          const applied = applyThresholds(raw, thresholds);
          const removals = applied.filter((r) => r.shouldRemove);
          const protectedN = applied.filter((r) =>
            r.removeReason?.startsWith('protected_')
          ).length;
          const nonWordRemoved = removals.filter((r) => r.verdict === 'non_word').length;
          const hardRemoved = removals.filter((r) => HARD_REJECT_VERDICTS.has(r.verdict)).length;
          sweep.push({
            ...thresholds,
            removeCount: removals.length,
            hardRemoved,
            nonWordRemoved,
            protectedForms: protectedN,
            keepCount: applied.length - removals.length,
          });
        }
      }
    }
  }

  const pathOut = path.join(ARTIFACTS_DIR, `validity_threshold_sweep_${lang}.json`);
  fs.writeFileSync(pathOut, JSON.stringify({ lang, generatedAt: new Date().toISOString(), sweep }, null, 2) + '\n');
  return pathOut;
}

function pickEdgeCases(results: LexicalValidityResult[]) {
  const nonWord = results.filter((r) => r.verdict === 'non_word');
  return {
    nonWordProtectedAsInflection: nonWord
      .filter((r) => r.formVerdict === 'inflection')
      .sort((a, b) => b.formConfidence - a.formConfidence)
      .slice(0, 40),
    nonWordConfirmedGibberish: nonWord
      .filter((r) => r.formVerdict === 'not_a_word_form')
      .sort((a, b) => b.confidence + b.formConfidence - (a.confidence + a.formConfidence))
      .slice(0, 40),
    nonWordCalledLemma: nonWord
      .filter((r) => r.formVerdict === 'lemma')
      .sort((a, b) => b.formConfidence - a.formConfidence)
      .slice(0, 30),
    hardRejectBorderline: results
      .filter((r) => HARD_REJECT_VERDICTS.has(r.verdict) && r.confidence >= 0.45 && r.confidence < 0.6)
      .sort((a, b) => a.confidence - b.confidence)
      .slice(0, 40),
    disagreementValidButNotAWordForm: results
      .filter((r) => r.verdict === 'valid' && r.formVerdict === 'not_a_word_form')
      .slice(0, 30),
    disagreementHardRejectButInflection: results
      .filter((r) => HARD_REJECT_VERDICTS.has(r.verdict) && r.formVerdict === 'inflection')
      .slice(0, 30),
  };
}

function writeArtifacts(
  lang: Language,
  results: LexicalValidityResult[],
  thresholds: PruneThresholds
) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const { byVerdict, byForm, removals, rejectAny, protectedInflections, nonWord, total } =
    summarize(results);

  const jsonPath = path.join(ARTIFACTS_DIR, `validity_${lang}.json`);
  const removePath = path.join(ARTIFACTS_DIR, `validity_remove_${lang}.txt`);
  const mdPath = path.join(ARTIFACTS_DIR, `validity_summary_${lang}.md`);
  const edgesPath = path.join(ARTIFACTS_DIR, `validity_edge_cases_${lang}.json`);
  const crossPath = path.join(ARTIFACTS_DIR, `validity_crosstab_${lang}.json`);

  const edgeCases = pickEdgeCases(results);
  const crosstab = crossTab(results);

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        lang,
        generatedAt: new Date().toISOString(),
        thresholds,
        total,
        removeCount: removals.length,
        keepCount: total - removals.length,
        rejectAnyCount: rejectAny.length,
        protectedInflectionCount: protectedInflections.length,
        nonWordCount: nonWord.length,
        byVerdict,
        byForm,
        results,
      },
      null,
      2
    ) + '\n'
  );

  fs.writeFileSync(
    removePath,
    removals
      .sort((a, b) => a.verdict.localeCompare(b.verdict) || a.word.localeCompare(b.word))
      .map(
        (r) =>
          `${r.word}\t${r.display}\t${r.verdict}\t${r.confidence.toFixed(3)}\t${r.formVerdict}\t${r.formConfidence.toFixed(3)}\t${r.removeReason || ''}`
      )
      .join('\n') + (removals.length ? '\n' : '')
  );

  fs.writeFileSync(edgesPath, JSON.stringify({ lang, generatedAt: new Date().toISOString(), edgeCases }, null, 2) + '\n');
  fs.writeFileSync(crossPath, JSON.stringify({ lang, generatedAt: new Date().toISOString(), crosstab }, null, 2) + '\n');

  let md = `# Jev Lexical Validity — ${lang.toUpperCase()}\n\n`;
  md += `**Evaluated:** ${total.toLocaleString()}\n`;
  md += `**Proposed prune (thresholds below):** ${removals.length.toLocaleString()}\n`;
  md += `**Protected non_word→inflection:** ${protectedInflections.length.toLocaleString()}\n\n`;
  md += `### Thresholds\n\n`;
  md += '```json\n' + JSON.stringify(thresholds, null, 2) + '\n```\n\n';
  md += `## Lexical verdicts\n\n| Verdict | Count |\n| :--- | ---: |\n`;
  for (const [verdict, count] of Object.entries(byVerdict)) {
    const mark = REJECT_VERDICTS.has(verdict as LexicalVerdict) ? '❌' : '✅';
    md += `| ${mark} \`${verdict}\` | ${count} |\n`;
  }
  md += `\n## Form verdicts\n\n| Form | Count |\n| :--- | ---: |\n`;
  for (const [form, count] of Object.entries(byForm)) {
    md += `| \`${form}\` | ${count} |\n`;
  }
  md += `\n## Sample proposed removals (up to 40)\n\n`;
  md += `| Word | Lexical | Form | Reason |\n| :--- | :--- | :--- | :--- |\n`;
  for (const r of removals.slice(0, 40)) {
    md += `| ${r.word} | ${r.verdict}@${r.confidence.toFixed(2)} | ${r.formVerdict}@${r.formConfidence.toFixed(2)} | ${r.removeReason} |\n`;
  }
  fs.writeFileSync(mdPath, md);

  const sweepPath = writeThresholdSweep(lang, results);

  return {
    jsonPath,
    removePath,
    mdPath,
    edgesPath,
    crossPath,
    sweepPath,
    byVerdict,
    byForm,
    removals,
    rejectAny,
    protectedInflections,
    total,
  };
}

function pruneDictionary(lang: Language, removals: LexicalValidityResult[]) {
  const dictPath = path.join(PUBLIC_DIR, `${lang}.json`);
  const wordsPath = path.join(DATA_DIR, `${lang}_words.txt`);
  const queuePath = path.join(ARTIFACTS_DIR, `review_queue_${lang}.json`);

  const removeKeys = new Set(removals.map((r) => r.word));
  const raw = JSON.parse(fs.readFileSync(dictPath, 'utf8')) as RawDictionary;
  const before = Object.keys(raw).length;
  for (const key of removeKeys) {
    delete raw[key];
  }
  fs.writeFileSync(dictPath, JSON.stringify(raw, null, 2) + '\n');
  const after = Object.keys(raw).length;

  if (fs.existsSync(wordsPath)) {
    const kept = fs
      .readFileSync(wordsPath, 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => {
        const token = line.trim().toLowerCase();
        const key = token.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return !removeKeys.has(key) && !removeKeys.has(token);
      });
    fs.writeFileSync(wordsPath, kept.join('\n') + (kept.length ? '\n' : ''));
  }

  let queueRemoved = 0;
  if (fs.existsSync(queuePath)) {
    const q = JSON.parse(fs.readFileSync(queuePath, 'utf8')) as {
      total?: number;
      failures?: unknown[];
      queue?: { word: string }[];
    };
    const beforeQ = q.queue?.length || 0;
    q.queue = (q.queue || []).filter((item) => !removeKeys.has(item.word));
    queueRemoved = beforeQ - q.queue.length;
    q.total = q.queue.length;
    fs.writeFileSync(queuePath, JSON.stringify(q, null, 2) + '\n');
  }

  return { before, after, removed: before - after, queueRemoved };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const typesafeKey = process.env.TYPESAFE_API_KEY;

  if (!options.dryRun && !typesafeKey) {
    console.error('Missing TYPESAFE_API_KEY. Add it to .env.local or pass --dry-run.');
    process.exit(1);
  }

  let entries: DictionaryEntry[] = loadDictionary(options.lang);
  if (options.limit > 0) {
    entries = entries.slice(0, options.limit);
  }

  console.log(`\n🔎 Jev lexical validity screen (dual-signal)`);
  console.log(`Language: ${options.lang.toUpperCase()}`);
  console.log(`Entries: ${entries.length}${options.limit ? ` (limited)` : ''}`);
  console.log(`Dry run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log(`Prune: ${options.prune ? 'YES' : 'NO (analysis only)'}`);
  console.log(`Thresholds: ${JSON.stringify(options.thresholds)}`);
  console.log(`Concurrency: ${options.concurrency}\n`);

  const client = options.dryRun
    ? new MockValidityClient()
    : new TypeSafeClient({ apiKey: typesafeKey! });

  const failures: { word: string; error: string }[] = [];
  const start = Date.now();

  const settled = await mapPool(
    entries,
    options.dryRun ? Math.min(20, options.concurrency) : options.concurrency,
    async (entry) => {
      try {
        return await evaluateLexicalValidityWithJev(
          client as TypeSafeClient,
          entry,
          'jev-latest',
          options.thresholds
        );
      } catch (err) {
        failures.push({ word: entry.word, error: err instanceof Error ? err.message : String(err) });
        return null;
      }
    },
    (done, total) => {
      if (done % 50 === 0 || done === total) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(0);
        process.stdout.write(`\r  Progress ${done}/${total} (${elapsed}s)   `);
      }
    }
  );

  console.log('\n');

  const raw = settled.filter((r): r is LexicalValidityResult => r !== null);
  const results = applyThresholds(raw, options.thresholds);
  const artifacts = writeArtifacts(options.lang, results, options.thresholds);

  console.log(`✅ Evaluated ${artifacts.total} words (${failures.length} failures)`);
  console.log(`   Proposed keep: ${artifacts.total - artifacts.removals.length}`);
  console.log(`   Proposed prune: ${artifacts.removals.length}`);
  console.log(`   Protected conjugations: ${artifacts.protectedInflections.length}`);
  console.log(`   Lexical: ${JSON.stringify(artifacts.byVerdict)}`);
  console.log(`   Form: ${JSON.stringify(artifacts.byForm)}`);
  console.log(`\n📄 ${artifacts.mdPath}`);
  console.log(`📄 ${artifacts.edgesPath}`);
  console.log(`📄 ${artifacts.sweepPath}`);
  console.log(`📄 ${artifacts.jsonPath}`);

  if (options.prune && !options.dryRun) {
    if (artifacts.removals.length === 0) {
      console.log('\nℹ️ Nothing to prune.');
    } else {
      const pruned = pruneDictionary(options.lang, artifacts.removals);
      console.log(
        `\n✂️  Pruned ${pruned.removed} entries from public/${options.lang}.json (${pruned.before} → ${pruned.after})`
      );
      if (pruned.queueRemoved > 0) {
        console.log(`   Also dropped ${pruned.queueRemoved} items from review_queue_${options.lang}.json`);
      }
    }
  } else {
    console.log('\n⏸️  Analysis only — dictionary not modified. Pass --prune when thresholds look right.');
  }

  if (failures.length > 0) {
    const failPath = path.join(ARTIFACTS_DIR, `validity_failures_${options.lang}.json`);
    fs.writeFileSync(failPath, JSON.stringify(failures, null, 2) + '\n');
    console.log(`⚠️  ${failures.length} failures → ${failPath}`);
  }
}

main().catch((err) => {
  console.error('\n❌ Validity screen failed:', err);
  process.exit(1);
});
