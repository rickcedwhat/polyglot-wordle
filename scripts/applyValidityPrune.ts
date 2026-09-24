/**
 * Re-apply dual-signal prune thresholds to the latest validity_{lang}.json
 * results, and also drop entries whose Gemini definition already admits
 * the token is English / not Portuguese.
 *
 *   npx vite-node scripts/applyValidityPrune.ts
 *   npx vite-node scripts/applyValidityPrune.ts -- --lang=pt
 */
import fs from 'fs';
import path from 'path';
import {
  decideShouldRemove,
  DEFAULT_PRUNE_THRESHOLDS,
  LexicalValidityResult,
} from '../evals/dictionary/lexicalValidity';

const ARTIFACTS = path.resolve('evals/artifacts');
const langArg = process.argv.find((a) => a.startsWith('--lang='));
const lang = langArg ? langArg.slice('--lang='.length) : 'pt';
const thresholds = { ...DEFAULT_PRUNE_THRESHOLDS };

/** Gemini often confesses when the seed is junk. */
const DEF_ADMITS_NOT_PT =
  /not a (recognized |common |standard )?Portuguese|does not appear to be a standard Portuguese|\bAn English\b|\bIn English,|^A proper noun\b/i;

const raw = JSON.parse(fs.readFileSync(path.join(ARTIFACTS, `validity_${lang}.json`), 'utf8'));
const dictPath = path.resolve('public', `${lang}.json`);
const wordsPath = path.resolve('data', `${lang}_words.txt`);
const queuePath = path.join(ARTIFACTS, `review_queue_${lang}.json`);
const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8')) as Record<
  string,
  { def?: string; display?: string }
>;

const applied: LexicalValidityResult[] = (raw.results as LexicalValidityResult[]).map((r) => {
  const d = decideShouldRemove(
    r.verdict,
    r.confidence,
    r.formVerdict,
    r.formConfidence,
    thresholds
  );
  return { ...r, shouldRemove: d.shouldRemove, removeReason: d.reason };
});

const fromJev = applied.filter((r) => r.shouldRemove && dict[r.word]);
const fromDef: { word: string; reason: string; def: string }[] = [];
for (const [word, entry] of Object.entries(dict)) {
  if (fromJev.some((r) => r.word === word)) continue;
  const def = entry.def || '';
  if (DEF_ADMITS_NOT_PT.test(def)) {
    fromDef.push({
      word,
      reason: 'def_admits_not_portuguese',
      def: def.slice(0, 100),
    });
  }
}

const removeKeys = new Set<string>([...fromJev.map((r) => r.word), ...fromDef.map((r) => r.word)]);

const check = ['rolly', 'graff', 'gross', 'smoke', 'raton', 'indio', 'tenor', 'music', 'drill'];
console.log('thresholds', thresholds);
console.log({
  jevRemovals: fromJev.length,
  defConfessRemovals: fromDef.length,
  totalUnique: removeKeys.size,
});
console.log(
  'spot',
  check.map((w) => ({
    word: w,
    remove: removeKeys.has(w),
    via:
      fromJev.find((r) => r.word === w)?.removeReason ||
      fromDef.find((r) => r.word === w)?.reason ||
      null,
  }))
);

const before = Object.keys(dict).length;
for (const k of removeKeys) delete dict[k];
fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');
const after = Object.keys(dict).length;

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
  const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const beforeQ = q.queue?.length || 0;
  q.queue = (q.queue || []).filter((item: { word: string }) => !removeKeys.has(item.word));
  queueRemoved = beforeQ - q.queue.length;
  q.total = q.queue.length;
  fs.writeFileSync(queuePath, JSON.stringify(q, null, 2) + '\n');
}

const removalRows = [
  ...fromJev.map(
    (r) =>
      `${r.word}\t${r.display}\t${r.verdict}\t${r.confidence.toFixed(3)}\t${r.formVerdict}\t${r.formConfidence.toFixed(3)}\t${r.removeReason}`
  ),
  ...fromDef.map((r) => `${r.word}\t${r.word}\t\t\t\t\t${r.reason}`),
];
fs.writeFileSync(
  path.join(ARTIFACTS, `validity_remove_${lang}.txt`),
  removalRows.sort().join('\n') + '\n'
);

raw.thresholds = thresholds;
raw.removeCount = removeKeys.size;
raw.keepCount = after;
raw.results = applied;
raw.defConfessRemovals = fromDef;
raw.prunedAt = new Date().toISOString();
fs.writeFileSync(
  path.join(ARTIFACTS, `validity_${lang}.json`),
  JSON.stringify(raw, null, 2) + '\n'
);

console.log({ dict: `${before} → ${after}`, removed: before - after, queueRemoved });
console.log('kept?', {
  indio: 'indio' in dict,
  tenor: 'tenor' in dict,
  rolly: 'rolly' in dict,
  smoke: 'smoke' in dict,
  raton: 'raton' in dict,
  graff: 'graff' in dict,
});
