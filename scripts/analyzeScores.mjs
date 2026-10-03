#!/usr/bin/env node
/**
 * Read-only: pulls completed games from Firestore and summarizes score spread.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT=~/.config/polyglot-wordle-admin.json node scripts/analyzeScores.mjs [--out file.json]
 */
import fs from 'node:fs';
import { fetchCollection } from './firestoreAdmin.mjs';

const outIndex = process.argv.indexOf('--out');
const outPath = outIndex > -1 ? process.argv[outIndex + 1] : null;

const stats = (values) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const sd = Math.sqrt(sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / sorted.length);
  const pick = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return {
    n: sorted.length,
    min: sorted[0],
    p25: pick(0.25),
    median: pick(0.5),
    p75: pick(0.75),
    max: sorted.at(-1),
    mean: Math.round(mean),
    sd: Math.round(sd),
  };
};

const games = await fetchCollection('games');
const completed = games.filter((g) => g.isLiveGame === false && typeof g.score === 'number');

const wins = completed.filter((g) => g.isWin);
const losses = completed.filter((g) => !g.isWin);
const byGuesses = {};
for (const game of wins) {
  const n = (game.guessHistory || []).length;
  (byGuesses[n] ||= []).push(game.score);
}

console.log(`Games: ${games.length} total, ${completed.length} completed`);
console.log('\nAll completed:', stats(completed.map((g) => g.score)));
console.log('Wins:', stats(wins.map((g) => g.score)));
console.log('Losses:', stats(losses.map((g) => g.score)));
console.log('\nWins by guesses used:');
for (const [n, scores] of Object.entries(byGuesses).sort(([a], [b]) => a - b)) {
  console.log(`  ${n} guesses:`, stats(scores));
}

if (outPath) {
  const slim = completed.map((g) => ({
    id: g.id,
    score: g.score,
    isWin: g.isWin,
    guessHistory: g.guessHistory,
    words: g.words,
    shuffledLanguages: g.shuffledLanguages,
    difficulties: g.difficulties,
    completedAt: g.completedAt,
  }));
  fs.writeFileSync(outPath, JSON.stringify(slim, null, 2));
  console.log(`\nWrote ${slim.length} games to ${outPath}`);
}
