#!/usr/bin/env node
/**
 * Read-only: pulls completed games from Firestore and summarizes score spread.
 *
 * Usage:
 *   FIREBASE_SERVICE_ACCOUNT=~/.config/polyglot-wordle-admin.json node scripts/analyzeScores.mjs [--out file.json]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const keyPath = (
  process.env.FIREBASE_SERVICE_ACCOUNT || '~/.config/polyglot-wordle-admin.json'
).replace(/^~/, os.homedir());
const outIndex = process.argv.indexOf('--out');
const outPath = outIndex > -1 ? process.argv[outIndex + 1] : null;

const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto
    .sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key)
    .toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

/** Firestore typed value -> plain JS. */
function decode(value) {
  if (value == null) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)])
    );
  }
  return value;
}

async function fetchAllGames(token) {
  const base = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
  const games = [];
  let pageToken;
  do {
    const url = new URL(`${base}/games`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json.error) throw new Error(JSON.stringify(json.error));
    for (const doc of json.documents || []) {
      games.push({ id: path.basename(doc.name), ...decode({ mapValue: { fields: doc.fields } }) });
    }
    pageToken = json.nextPageToken;
  } while (pageToken);
  return games;
}

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

const token = await getAccessToken();
const games = await fetchAllGames(token);
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
