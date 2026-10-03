#!/usr/bin/env node
/**
 * Read-only: pulls every player's word flags from Firestore, grouped by word, with the
 * word's current dictionary entry for context.
 *
 * Usage:
 *   node scripts/reviewFlags.mjs [--lang fr] [--reason missing|other] [--out flags.json]
 */
import fs from 'node:fs';
import { fetchCollection } from './firestoreAdmin.mjs';

const arg = (name) => {
  const index = process.argv.indexOf(`--${name}`);
  return index > -1 ? process.argv[index + 1] : null;
};
const langFilter = arg('lang');
const reasonFilter = arg('reason');
const outPath = arg('out');

const dictionaries = {};
const dictionaryFor = (lang) =>
  (dictionaries[lang] ??= JSON.parse(fs.readFileSync(`public/${lang}.json`, 'utf8')));

const flags = (await fetchCollection('wordFlags')).filter(
  (flag) =>
    (!langFilter || flag.lang === langFilter) && (!reasonFilter || flag.reason === reasonFilter)
);

const groups = new Map();
for (const flag of flags) {
  const key = `${flag.lang}:${flag.wordKey}`;
  if (!groups.has(key)) {
    const entry = dictionaryFor(flag.lang)[flag.wordKey];
    groups.set(key, {
      lang: flag.lang,
      wordKey: flag.wordKey,
      display: entry?.display || flag.display || flag.wordKey,
      inDictionary: Boolean(entry),
      def: entry?.def ?? null,
      players: 0,
      reasons: {},
      notes: [],
      firstFlaggedAt: flag.flaggedAt,
      lastFlaggedAt: flag.flaggedAt,
    });
  }
  const group = groups.get(key);
  group.players += 1;
  group.reasons[flag.reason] = (group.reasons[flag.reason] ?? 0) + 1;
  if (flag.note?.trim()) group.notes.push(flag.note.trim());
  if (flag.flaggedAt < group.firstFlaggedAt) group.firstFlaggedAt = flag.flaggedAt;
  if (flag.flaggedAt > group.lastFlaggedAt) group.lastFlaggedAt = flag.flaggedAt;
}

const sorted = [...groups.values()].sort(
  (a, b) =>
    b.players - a.players || a.lang.localeCompare(b.lang) || a.wordKey.localeCompare(b.wordKey)
);

console.log(`${flags.length} flags on ${sorted.length} words\n`);
for (const group of sorted) {
  const reasons = Object.entries(group.reasons)
    .map(([reason, count]) => `${reason} ×${count}`)
    .join(', ');
  const status = group.inDictionary ? 'in dictionary' : 'NOT in dictionary';
  console.log(
    `${group.lang} ${group.display.toUpperCase().padEnd(6)} ${String(group.players).padStart(2)} player(s)  ${reasons}  (${status})`
  );
  if (group.def) console.log(`    def: ${group.def}`);
  [...new Set(group.notes)]
    .filter((note) => note !== 'Missing word (rejected as a guess)')
    .forEach((note) => console.log(`    note: ${note}`));
}

if (outPath) {
  fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2));
  console.log(`\nWrote ${sorted.length} words to ${outPath}`);
}
