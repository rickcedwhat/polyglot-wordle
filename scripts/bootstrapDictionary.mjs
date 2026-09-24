#!/usr/bin/env node

/**
 * ============================================================================
 * Polyglot Wordle — End-to-End Dictionary Bootstrapper & Pipeline
 * ============================================================================
 *
 * This script automates the complete lifecycle for bootstrapping, enriching,
 * evaluating, and calibrating a new language dictionary from scratch in a single run.
 *
 * Usage:
 *   npm run bootstrap:dict -- --lang=pt --name=Portuguese --step=seed
 *   npm run bootstrap:dict -- --lang=pt --name=Portuguese --limit=200 --step=all
 *   npm run bootstrap:dict -- --lang=pt --step=filter
 *   npm run bootstrap:dict -- --lang=pt --step=enrich
 *   npm run bootstrap:dict -- --lang=it --name=Italian --step=seed
 *   npm run bootstrap:dict -- --lang=it --step=wave --wave-size=40
 *   npm run bootstrap:dict -- --lang=it --step=remediate --rewrite-limit=80
 *
 * Pipeline Steps:
 *   0. seed:      Download OpenSubtitles frequency list → 5-letter seed wordlist
 *   1. ingest:    Normalize raw words -> 5-letter ASCII keys + unicode displays
 *   2. filter:    Jev lexical validity screen → prune caption noise before enrich
 *   3. enrich:    Gemini 2.5 Flash structured lexicography (POS + English defs)
 *   4. eval:      TypeSafe Jev System One evaluation (accuracy, format, difficulty)
 *   5. remediate: Calibrate + Gemini rewrite (max 2 attempts/word, then manual queue)
 *   6. test:      Validate dictionary schema, formatting hygiene, and consistency
 *
 * Anti-thrash: after --max-rewrite-attempts failed Gemini→Jev cycles (default 2),
 * the word leaves the active review queue and lands in
 * evals/artifacts/manual_review_{lang}.json for human inspection.
 *
 * Seed source (same as historical EN/ES/FR): HermitDave FrequencyWords from the
 * OpenSubtitles caption corpus — https://github.com/hermitdave/FrequencyWords
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { BANNED_WORDS } from './dictUtils.mjs';
import { createDictConsole } from './dictConsoleState.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SUPPORTED_STEPS = new Set([
  'all',
  'seed',
  'ingest',
  'filter',
  'enrich',
  'eval',
  'remediate',
  'wave',
  'test',
]);
const VALID_POS = new Set([
  'noun',
  'verb',
  'adj',
  'adv',
  'pron',
  'intj',
  'num',
  'prep',
  'contraction',
  'det',
  // Compound labels used in EN/ES/FR legacy dictionaries
  'prep/adv',
  'noun/adj',
  'adj/adv',
  'adv/noun',
  'noun/verb',
  'adj/verb',
  'adj/noun',
  'verb/noun',
  'interjection',
]);
/** HermitDave FrequencyWords OpenSubtitles 2018 lists (MIT code / CC-BY-SA content). */
const FREQUENCY_WORDS_BASE =
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018';
const DEFAULT_FILTER_CONFIDENCE = 0.7;

// Load environment variables
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const rel of envFiles) {
    const file = path.join(ROOT_DIR, rel);
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...valParts] = trimmed.split('=');
        const val = valParts.join('=').replace(/^["']|["']$/g, '');
        if (key && val && !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

function optionValue(arg) {
  return arg.slice(arg.indexOf('=') + 1);
}

function parsePositiveInteger(value, optionName) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${optionName} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${optionName} must be a safe positive integer.`);
  }
  return parsed;
}

export function parseOptions(args) {
  const parsed = {
    lang: '',
    name: '',
    wordsFile: '',
    step: 'all',
    batchSize: 40,
    geminiModel: 'gemini-2.5-flash',
    /** Inner remediate passes per invocation (default 1 — re-run / next wave for more). */
    maxRemediatePasses: 1,
    /** Max seed words to keep (frequency order). 0 = no cap. */
    limit: 0,
    /** FrequencyWords path segment (defaults to --lang). Use pt_br for Brazilian lists. */
    freqLang: '',
    /** Force re-download of the cached *_50k.txt corpus. */
    refreshSource: false,
    /** Skip Jev lexical filter on --step=all */
    skipFilter: false,
    /** Minimum Jev confidence to prune on --step=filter (default 0.7). */
    minConfidence: DEFAULT_FILTER_CONFIDENCE,
    /** Concurrency for the Jev validity screen. */
    filterConcurrency: 10,
    /**
     * Max Gemini definition rewrites per remediate invocation.
     * Default 80 keeps runs resumable and rate-limit friendly. Use 0 for unlimited.
     */
    rewriteLimit: 80,
    /**
     * Vertical pipeline wave size (--step=wave): enrich → eval → remediate
     * this many stubs, then stop. Defaults to rewriteLimit when unset.
     */
    waveSize: 0,
    /**
     * After this many failed Gemini→Jev rewrite cycles, move the word to
     * manual_review_{lang}.json and stop auto-rewriting it (default 2).
     */
    maxRewriteAttempts: 2,
  };

  for (const arg of args) {
    if (arg.startsWith('--lang=')) parsed.lang = optionValue(arg);
    else if (arg.startsWith('--name=')) parsed.name = optionValue(arg);
    else if (arg.startsWith('--words=')) parsed.wordsFile = optionValue(arg);
    else if (arg.startsWith('--step=')) parsed.step = optionValue(arg);
    else if (arg.startsWith('--batch-size=')) {
      parsed.batchSize = parsePositiveInteger(optionValue(arg), '--batch-size');
    } else if (arg.startsWith('--model=')) parsed.geminiModel = optionValue(arg);
    else if (arg.startsWith('--max-passes=')) {
      parsed.maxRemediatePasses = parsePositiveInteger(optionValue(arg), '--max-passes');
    } else if (arg.startsWith('--limit=')) {
      parsed.limit = parsePositiveInteger(optionValue(arg), '--limit');
    } else if (arg.startsWith('--freq-lang=')) parsed.freqLang = optionValue(arg);
    else if (arg === '--refresh-source') parsed.refreshSource = true;
    else if (arg === '--skip-filter') parsed.skipFilter = true;
    else if (arg.startsWith('--min-confidence=')) {
      const value = Number(optionValue(arg));
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new Error('--min-confidence must be a number between 0 and 1.');
      }
      parsed.minConfidence = value;
    } else if (arg.startsWith('--filter-concurrency=')) {
      parsed.filterConcurrency = parsePositiveInteger(
        optionValue(arg),
        '--filter-concurrency'
      );
    } else if (arg.startsWith('--rewrite-limit=')) {
      const raw = optionValue(arg);
      if (raw === '0') {
        parsed.rewriteLimit = 0;
      } else {
        parsed.rewriteLimit = parsePositiveInteger(raw, '--rewrite-limit');
      }
    } else if (arg.startsWith('--wave-size=')) {
      parsed.waveSize = parsePositiveInteger(optionValue(arg), '--wave-size');
    } else if (arg.startsWith('--max-rewrite-attempts=')) {
      parsed.maxRewriteAttempts = parsePositiveInteger(
        optionValue(arg),
        '--max-rewrite-attempts'
      );
    }
  }

  if (!/^[a-z]{2}$/.test(parsed.lang)) {
    throw new Error(
      '--lang is required and must be exactly two lowercase letters (for example, --lang=pt).'
    );
  }
  if (!SUPPORTED_STEPS.has(parsed.step)) {
    throw new Error(`--step must be one of: ${[...SUPPORTED_STEPS].join(', ')}.`);
  }
  if (!parsed.freqLang) parsed.freqLang = parsed.lang;
  if (!/^[a-z]{2}(_[a-z]{2})?$/.test(parsed.freqLang)) {
    throw new Error(
      '--freq-lang must be a FrequencyWords code like pt or pt_br (letters with optional _xx).'
    );
  }
  if (!parsed.waveSize) {
    parsed.waveSize = parsed.rewriteLimit > 0 ? parsed.rewriteLimit : 80;
  }

  return parsed;
}

export function resolvePipelinePaths(rootDir, lang) {
  const publicDir = path.resolve(rootDir, 'public');
  const artifactsDir = path.resolve(rootDir, 'evals', 'artifacts');
  const dataDir = path.resolve(rootDir, 'data');
  const resolvedDictPath = path.resolve(publicDir, `${lang}.json`);
  const resolvedQueuePath = path.resolve(artifactsDir, `review_queue_${lang}.json`);
  const resolvedManualPath = path.resolve(artifactsDir, `manual_review_${lang}.json`);
  const resolvedWordsPath = path.resolve(dataDir, `${lang}_words.txt`);

  if (!resolvedDictPath.startsWith(`${publicDir}${path.sep}`)) {
    throw new Error(`Dictionary path escapes the public directory: ${resolvedDictPath}`);
  }
  if (!resolvedQueuePath.startsWith(`${artifactsDir}${path.sep}`)) {
    throw new Error(`Review queue path escapes the artifacts directory: ${resolvedQueuePath}`);
  }
  if (!resolvedManualPath.startsWith(`${artifactsDir}${path.sep}`)) {
    throw new Error(`Manual review path escapes the artifacts directory: ${resolvedManualPath}`);
  }
  if (!resolvedWordsPath.startsWith(`${dataDir}${path.sep}`)) {
    throw new Error(`Words path escapes the data directory: ${resolvedWordsPath}`);
  }

  return {
    dictPath: resolvedDictPath,
    queuePath: resolvedQueuePath,
    manualQueuePath: resolvedManualPath,
    wordsPath: resolvedWordsPath,
    dataDir,
  };
}

/** True when definition/format still needs a Gemini rewrite (not difficulty-only). */
export function needsGeminiRewrite(item) {
  if (!item || item.evaluationFailed) return false;
  const isDefInvalid =
    item.definitionVerdict !== 'accurate' && item.definitionVerdict !== 'inflected_form';
  const isFmtInvalid = item.formatVerdict !== 'clean_dictionary';
  return isDefInvalid || isFmtInvalid;
}

/** Words that already burned their auto-rewrite budget. */
export function isExhaustedRewriteAttempts(item, maxAttempts = 2) {
  return needsGeminiRewrite(item) && (item.geminiRewriteAttempts || 0) >= maxAttempts;
}

/**
 * After a Gemini rewrite + Jev recheck: bump attempts for rewritten words still
 * flagged; promote exhausted words to the manual list; keep the rest in queue.
 */
export function applyRewriteAttemptOutcomes({
  priorItems = [],
  remainingItems = [],
  rewrittenWords = [],
  maxAttempts = 2,
  now = new Date().toISOString(),
} = {}) {
  const priorByWord = new Map(priorItems.map((item) => [item.word, item]));
  const rewritten = new Set(rewrittenWords);
  const kept = [];
  const promoted = [];

  for (const item of remainingItems) {
    const prior = priorByWord.get(item.word);
    let attempts = prior?.geminiRewriteAttempts ?? item.geminiRewriteAttempts ?? 0;
    if (rewritten.has(item.word) && needsGeminiRewrite(item)) {
      attempts += 1;
    }
    const next = {
      ...item,
      geminiRewriteAttempts: attempts,
    };
    if (isExhaustedRewriteAttempts(next, maxAttempts)) {
      promoted.push({
        ...next,
        manualReview: true,
        flaggedAt: now,
        promoteReason: `Failed Gemini→Jev rewrite ${attempts} time(s) (max ${maxAttempts})`,
      });
    } else {
      kept.push(next);
    }
  }

  return { kept, promoted };
}

export function mergeManualReviewQueue(existing = [], incoming = []) {
  const byWord = new Map(existing.map((item) => [item.word, item]));
  for (const item of incoming) {
    if (!item?.word) continue;
    byWord.set(item.word, item);
  }
  return [...byWord.values()];
}

export function frequencyWordsUrl(freqLang, baseUrl = FREQUENCY_WORDS_BASE) {
  return `${baseUrl}/${freqLang}/${freqLang}_50k.txt`;
}

/** Normalize diacritics to a 5-letter ASCII puzzle key. */
export function normalizeKey(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Parse a HermitDave FrequencyWords file (`word count` per line) into Wordle-eligible
 * 5-letter seeds. Preserves subtitle spelling/diacritics for display; requires a
 * 5-letter ASCII key after accent stripping (same rules as ingest).
 */
export function extractFiveLetterSeeds(frequencyText, { limit = 0, banned = BANNED_WORDS } = {}) {
  const seenKeys = new Set();
  const seeds = [];

  for (const line of frequencyText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const word = trimmed.split(/\s+/)[0]?.toLowerCase();
    if (!word || [...word].length !== 5) continue;

    const key = normalizeKey(word);
    if (!/^[a-z]{5}$/.test(key)) continue;
    if (banned.has(word) || banned.has(key)) continue;
    if (seenKeys.has(key)) continue;

    seenKeys.add(key);
    seeds.push(word);
    if (limit > 0 && seeds.length >= limit) break;
  }

  return seeds;
}

const isMain = Boolean(process.argv[1] && path.resolve(process.argv[1]) === __filename);
const options = isMain ? parseOptions(process.argv.slice(2)) : parseOptions(['--lang=en']);

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  it: 'Italian',
  de: 'German',
};

const langName = options.name || LANGUAGE_NAMES[options.lang] || options.lang.toUpperCase();
const pipelinePaths = resolvePipelinePaths(ROOT_DIR, options.lang);
const { dictPath, queuePath, manualQueuePath } = pipelinePaths;
const consoleState = createDictConsole(ROOT_DIR, options.lang);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runViteNodeScript(scriptRelPath, args) {
  return new Promise((resolve, reject) => {
    const viteNodeBin = path.join(ROOT_DIR, 'node_modules', '.bin', 'vite-node');
    const child = spawn(
      viteNodeBin,
      ['--script', path.join(ROOT_DIR, scriptRelPath), '--', ...args],
      {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        env: process.env,
      }
    );
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${scriptRelPath} exited with code ${code}`));
    });
  });
}

export function isValidDisplay(display) {
  return typeof display === 'string' && display.length === 5;
}

export function isValidPos(pos) {
  return VALID_POS.has(pos);
}

export function analyzeGeminiBatch(results, chunk) {
  if (!Array.isArray(results)) {
    throw new Error('Gemini batch response must be an array.');
  }

  const expectedKeys = new Set(chunk.map((item) => item.key));
  const returnedKeys = new Set();
  const duplicates = [];
  const unexpected = [];
  const matched = [];
  const rejected = [];

  for (const item of results) {
    const key = item?.key;
    if (returnedKeys.has(key)) duplicates.push(key);
    returnedKeys.add(key);
    if (!expectedKeys.has(key)) {
      unexpected.push(key);
      continue;
    }
    if (!key) continue;
    if (item.valid === false) {
      if (!rejected.some((r) => r.key === key)) rejected.push(item);
      continue;
    }
    if (dictEntryLooksValid(item) && !matched.some((m) => m.key === key)) {
      matched.push(item);
    }
  }

  const accountedKeys = new Set([
    ...matched.map((item) => item.key),
    ...rejected.map((item) => item.key),
  ]);
  const missing = [...expectedKeys].filter((key) => !accountedKeys.has(key));
  return { missing, duplicates, unexpected, matched, rejected, returnedKeys };
}

function dictEntryLooksValid(item) {
  return (
    item &&
    item.valid !== false &&
    typeof item.key === 'string' &&
    typeof item.def === 'string' &&
    item.def.trim().length >= 4 &&
    isValidPos(item.pos)
  );
}

export function validateGeminiBatch(results, chunk) {
  if (!Array.isArray(results)) {
    throw new Error('Gemini batch response must be an array.');
  }

  const expectedKeys = new Set(chunk.map((item) => item.key));
  const returnedKeys = new Set();
  const duplicates = [];
  const unexpected = [];

  for (const item of results) {
    const key = item?.key;
    if (returnedKeys.has(key)) duplicates.push(key);
    returnedKeys.add(key);
    if (!expectedKeys.has(key)) unexpected.push(key);
  }

  const missing = [...expectedKeys].filter((key) => !returnedKeys.has(key));
  if (duplicates.length > 0 || unexpected.length > 0 || missing.length > 0) {
    const details = [];
    if (missing.length > 0) details.push(`missing: ${missing.join(', ')}`);
    if (duplicates.length > 0) details.push(`duplicate: ${duplicates.join(', ')}`);
    if (unexpected.length > 0) details.push(`unexpected: ${unexpected.join(', ')}`);
    throw new Error(`Gemini batch keys did not match the requested chunk (${details.join('; ')}).`);
  }
}

/**
 * ----------------------------------------------------------------------------
 * Step 0: Seed — OpenSubtitles frequency list → 5-letter wordlist
 * ----------------------------------------------------------------------------
 */
async function stepSeed() {
  console.log(`\n🌱 [Step 0/7] Seeding 5-letter wordlist for ${langName} (${options.lang})...`);
  console.log(`   Source: HermitDave FrequencyWords / OpenSubtitles (${options.freqLang})`);

  const dataDir = pipelinePaths.dataDir;
  fs.mkdirSync(dataDir, { recursive: true });

  const freqCachePath = path.join(dataDir, `${options.freqLang}_50k.txt`);
  const wordsOut = options.wordsFile
    ? path.resolve(options.wordsFile)
    : pipelinePaths.wordsPath;

  let frequencyText;
  if (!options.refreshSource && fs.existsSync(freqCachePath)) {
    console.log(`   Using cached corpus: ${freqCachePath}`);
    frequencyText = fs.readFileSync(freqCachePath, 'utf8');
  } else {
    const url = frequencyWordsUrl(options.freqLang);
    console.log(`   Downloading ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download FrequencyWords list for "${options.freqLang}": HTTP ${response.status}. ` +
          `Check that content/2018/${options.freqLang}/${options.freqLang}_50k.txt exists upstream.`
      );
    }
    frequencyText = await response.text();
    fs.writeFileSync(freqCachePath, frequencyText);
    console.log(`   Cached corpus at ${freqCachePath}`);
  }

  const seeds = extractFiveLetterSeeds(frequencyText, { limit: options.limit });
  if (seeds.length === 0) {
    throw new Error(
      `No 5-letter seeds extracted from ${options.freqLang}_50k.txt. ` +
        `The corpus may be missing or use a non-Latin script.`
    );
  }

  fs.mkdirSync(path.dirname(wordsOut), { recursive: true });
  fs.writeFileSync(wordsOut, seeds.join('\n') + '\n');
  options.wordsFile = wordsOut;

  const limitNote = options.limit > 0 ? ` (capped at --limit=${options.limit})` : '';
  console.log(`✅ Wrote ${seeds.length} seed words to ${wordsOut}${limitNote}`);
  console.log(`   Examples: ${seeds.slice(0, 8).join(', ')}`);
}

/**
 * ----------------------------------------------------------------------------
 * Step 1: Ingest Raw Word List
 * ----------------------------------------------------------------------------
 */
async function stepIngest() {
  console.log(`\n📥 [Step 1/7] Ingesting raw word list for ${langName} (${options.lang})...`);

  const wordsFile = options.wordsFile || pipelinePaths.wordsPath;

  if (!wordsFile || !fs.existsSync(wordsFile)) {
    if (fs.existsSync(dictPath)) {
      console.log(`ℹ️ No --words file provided, but existing dictionary found at ${dictPath}. Proceeding with existing entries.`);
      return;
    }
    throw new Error(
      `Words file not found: ${wordsFile || '(none)'}. ` +
        `Run --step=seed first, or pass --words=path/to/list.txt`
    );
  }

  const rawLines = fs.readFileSync(wordsFile, 'utf8').split(/\r?\n/);
  const dict = fs.existsSync(dictPath) ? JSON.parse(fs.readFileSync(dictPath, 'utf8')) : {};

  let added = 0;
  for (const line of rawLines) {
    const rawWord = line.trim();
    if (!rawWord) continue;

    // Filter length: display must be 5 chars, normalized key must be 5 ASCII [a-z]
    if ([...rawWord].length !== 5) continue;
    const key = normalizeKey(rawWord);
    if (!/^[a-z]{5}$/.test(key)) continue;

    if (!dict[key]) {
      dict[key] = {
        display: rawWord.toLowerCase(),
        d: 0.65,
        pos: 'noun',
        def: '',
        reviewed: false,
      };
      added++;
    }
  }

  fs.mkdirSync(path.dirname(dictPath), { recursive: true });
  fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');
  console.log(`✅ Ingested ${added} new words. Total dictionary size: ${Object.keys(dict).length} entries.`);
}

/**
 * ----------------------------------------------------------------------------
 * Step 2: Filter — Jev lexical validity screen (prune caption noise)
 * ----------------------------------------------------------------------------
 */
async function stepFilter() {
  console.log(`\n🧹 [Step 2/7] Jev lexical validity filter for ${langName} (${options.lang})...`);

  if (options.skipFilter) {
    console.log('ℹ️ Skipping filter (--skip-filter).');
    return;
  }

  if (!fs.existsSync(dictPath)) {
    throw new Error(
      `Dictionary not found at ${dictPath}. Run --step=ingest before --step=filter.`
    );
  }

  const args = [
    `--lang=${options.lang}`,
    '--prune',
    `--min-confidence=${options.minConfidence}`,
    `--concurrency=${options.filterConcurrency}`,
  ];
  if (options.limit > 0) {
    args.push(`--limit=${options.limit}`);
  }

  console.log(
    `   Running evals/dictionary/runValidity.ts (prune confidence ≥ ${options.minConfidence})...`
  );
  await runViteNodeScript('evals/dictionary/runValidity.ts', args);
  console.log(`✅ Lexical filter complete for ${langName}.`);
}

/**
 * ----------------------------------------------------------------------------
 * Step 3: Gemini 2.5 Flash Definition & POS Enrichment
 * ----------------------------------------------------------------------------
 */
async function stepEnrich(filterUnreviewedOnly = true, onlyKeys = null) {
  console.log(`\n✨ [Step 3/7] Enriching definitions and POS with Gemini (${options.geminiModel})...`);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required for dictionary enrichment.');
  }

  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  let candidates = Object.entries(dict).map(([key, item]) => ({
    key,
    display: item.display || key,
    pos: item.pos,
    d: item.d,
    def: item.def,
    reviewed: item.reviewed,
  }));

  if (filterUnreviewedOnly) {
    candidates = candidates.filter((c) => !c.reviewed || !c.def || c.def.length < 15);
  }
  if (onlyKeys) {
    const allow = new Set(onlyKeys);
    candidates = candidates.filter((c) => allow.has(c.key));
  }

  console.log(`Found ${candidates.length} words to enrich in batches of ${options.batchSize}.`);
  if (candidates.length === 0) {
    console.log('✅ All entries are already enriched and reviewed.');
    return { enrichedCount: 0, skippedKeys: [] };
  }

  const chunks = [];
  for (let i = 0; i < candidates.length; i += options.batchSize) {
    chunks.push(candidates.slice(i, i + options.batchSize));
  }

  let enrichedCount = 0;
  const skippedKeys = [];
  const invalidKeys = [];
  let totalRateLimits = 0;

  const applyMatches = (items) => {
    for (const item of items) {
      if (!dict[item.key]) continue;
      dict[item.key].display = item.display || dict[item.key].display;
      dict[item.key].pos = item.pos;
      dict[item.key].def = item.def;
      dict[item.key].reviewed = true;
      enrichedCount++;
    }
  };

  const applyRejects = (items, source = 'gemini_invalid') => {
    for (const item of items) {
      if (!item?.key || !dict[item.key]) continue;
      delete dict[item.key];
      invalidKeys.push({ key: item.key, reason: source, note: item.def || item.reason || '' });
    }
  };

  const callGeminiChunk = async (chunkWords) => {
    const prompt = `You are an expert lexicographer for an educational multilingual Wordle puzzle game.
Your task is to provide accurate, concise, modern English definitions and grammatical part-of-speech (POS) tags for 5-letter ${langName} words — OR reject tokens that are not real ${langName} Wordle words.

Target Language: ${langName} (${options.lang.toUpperCase()})
Instructions:
1. First decide whether each token is a real ${langName} word suitable for a general-audience ${langName} Wordle (native content word or standard inflection — NOT an English lookalike, surname, brand, gibberish, or foreign token that natives would not play).
2. If it is NOT a suitable ${langName} word: set "valid" to false. Still return the key. Use a short English "def" note like "Not a real ${langName} Wordle word (English leak / name / gibberish)." Do NOT invent a fake ${langName} meaning. POS may be "noun".
3. If it IS suitable: set "valid" to true and write a real definition:
   - All definitions MUST be written in English so English-speaking players can learn what the ${langName} word means.
   - Length: 10 to 25 words per definition. Concise, clear, educational, and natural.
   - NEVER use lazy or circular formulas like "A term denoting X", "Plural of X", "Pertaining to X", or "Only used in...".
   - Prefer answer-friendly senses: if a spelling is BOTH a conjugated verb AND a common noun/adjective/adverb (e.g. English tired/bored/known, plural nouns that coincide with 3sg verbs), define the NON-VERB sense and set POS to noun/adj/adv — do NOT define it as “past tense of X”.
   - Only define a conjugated verb form when there is no solid everyday non-verb reading. Then explain what the form means in English first, and cite the lemma in parentheses at the end.
     Format: "[Clear English meaning] (inflection note, e.g. present tense of cantar)."
     Example (conjugation-only): Spanish "frena" → "Slows down or applies the brakes (present tense of frenar)."
     Example (prefer adj): English "tired" → "Feeling a need to rest; weary or exhausted." (pos: adj)
     Example (prefer noun): English "barns" → "Farm buildings used for storing grain, hay, or livestock." (pos: noun)
   - If the word is spelled identically to an English word but IS a real ${langName} word (false friends like "moral", "about", "venue"), explicitly define its ${langName} meaning — never the English one.
   - Do NOT prepend "In ${langName}..." or "In English..." to definitions unnecessarily.
   - For words with archaic or obsolete meanings, prioritize the primary modern everyday meaning.
4. POS (when valid=true): Must be strictly one of: "noun", "verb", "adj", "adv", "pron", "intj", "num". Prefer noun/adj/adv over verb when a common non-verb reading exists.
5. display: Provide the standard diacritics/accents for the word if applicable, or lowercase unaccented if none.
6. ALWAYS return exactly one result object for EVERY input key. Never omit keys.

Input Words:
${JSON.stringify(chunkWords.map((w) => ({ key: w.key, display: w.display, currentDef: w.def, currentPos: w.pos })), null, 2)}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.geminiModel}:generateContent?key=${apiKey}`;
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              valid: { type: 'boolean' },
              display: { type: 'string' },
              pos: { type: 'string', enum: ['noun', 'verb', 'adj', 'adv', 'pron', 'intj', 'num'] },
              def: { type: 'string' },
            },
            required: ['key', 'valid', 'display', 'pos', 'def'],
          },
        },
      },
    };

    let lastError = null;
    let hitRateLimit = false;
    for (let attempts = 1; attempts <= 8; attempts++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(60000),
        });

        if (!res.ok) {
          const errBody = await res.text();
          if (res.status === 429) {
            hitRateLimit = true;
            totalRateLimits++;
            // Longer exponential backoff — short retries just burn quota.
            const waitMs = Math.min(120000, 10000 * 2 ** (attempts - 1));
            console.warn(
              `    ⚠️ Rate limit (429) — backing off ${Math.round(waitMs / 1000)}s (attempt ${attempts}/8)...`
            );
            await sleep(waitMs);
            continue;
          }
          throw new Error(`Gemini API error (${res.status}): ${errBody}`);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const results = JSON.parse(text);
        return analyzeGeminiBatch(results, chunkWords);
      } catch (err) {
        lastError = err;
        console.warn(`    ⚠️ Attempt ${attempts} failed: ${err.message}`);
        if (attempts < 8) await sleep(2000);
      }
    }
    if (hitRateLimit) {
      const err = new Error(
        'Gemini rate limit exhausted after retries — pausing wave to avoid skip-storm.'
      );
      err.code = 'RATE_LIMIT_EXHAUSTED';
      throw err;
    }
    throw lastError || new Error('Gemini chunk failed with no error details.');
  };

  for (let idx = 0; idx < chunks.length; idx++) {
    await consoleState.waitIfPaused();

    let pending = chunks[idx];
    const batchKeys = pending.map((w) => w.key);
    const beforeByKey = Object.fromEntries(
      batchKeys.map((key) => [
        key,
        {
          display: dict[key]?.display,
          pos: dict[key]?.pos,
          def: dict[key]?.def,
        },
      ])
    );

    console.log(`  Processing batch [${idx + 1}/${chunks.length}] (${pending.length} words)...`);
    consoleState.patchStatus({
      counters: {
        ...(consoleState.readStatus().counters || {}),
        batchIndex: idx + 1,
        batchTotal: chunks.length,
        enriched: enrichedCount,
        skipped: skippedKeys.length,
        rateLimits: totalRateLimits,
      },
    });
    consoleState.event(
      'batch_start',
      `Enrich batch ${idx + 1}/${chunks.length} (${pending.length} words)`,
      { keys: batchKeys.slice(0, 12), batchIndex: idx + 1, batchTotal: chunks.length }
    );

    try {
      // First pass: full chunk. Accept partial matches; retry leftovers in smaller groups.
      let analysis = await callGeminiChunk(pending);
      applyMatches(analysis.matched);
      applyRejects(analysis.rejected || []);

      if (analysis.missing.length > 0) {
        console.warn(
          `    ⚠️ Partial batch: applied ${analysis.matched.length}, rejected ${analysis.rejected?.length || 0}, retrying ${analysis.missing.length} missing keys...`
        );
        pending = pending.filter((w) => analysis.missing.includes(w.key));

        // Second pass: groups of 5
        const retryChunks = [];
        for (let i = 0; i < pending.length; i += 5) {
          retryChunks.push(pending.slice(i, i + 5));
        }
        const stillMissing = [];
        for (const sub of retryChunks) {
          await consoleState.waitIfPaused();
          try {
            const subAnalysis = await callGeminiChunk(sub);
            applyMatches(subAnalysis.matched);
            applyRejects(subAnalysis.rejected || []);
            stillMissing.push(...subAnalysis.missing);
          } catch (err) {
            if (err?.code === 'RATE_LIMIT_EXHAUSTED') throw err;
            console.warn(`    ⚠️ Sub-batch failed (${sub.map((w) => w.key).join(', ')}): ${err.message}`);
            stillMissing.push(...sub.map((w) => w.key));
          }
          await sleep(250);
        }

        // Third pass: one-by-one for stubborn keys
        for (const key of stillMissing) {
          await consoleState.waitIfPaused();
          const solo = pending.find((w) => w.key === key);
          if (!solo) continue;
          try {
            const soloAnalysis = await callGeminiChunk([solo]);
            if (soloAnalysis.matched.length > 0) {
              applyMatches(soloAnalysis.matched);
            } else if ((soloAnalysis.rejected || []).length > 0) {
              applyRejects(soloAnalysis.rejected);
            } else {
              skippedKeys.push(key);
              console.warn(`    ⏭️ Skipping stubborn key after solo retry: ${key}`);
            }
          } catch (err) {
            if (err?.code === 'RATE_LIMIT_EXHAUSTED') throw err;
            skippedKeys.push(key);
            console.warn(`    ⏭️ Skipping stubborn key ${key}: ${err.message}`);
          }
          await sleep(200);
        }
      }
    } catch (err) {
      if (err?.code === 'RATE_LIMIT_EXHAUSTED') {
        console.warn(
          `    ⏸️  ${err.message}\n    Leaving ${pending.length} words for a later wave (not skip-marked).`
        );
        fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');
        consoleState.event('rate_limit_pause', err.message, {
          remaining: pending.length + chunks.slice(idx + 1).reduce((n, c) => n + c.length, 0),
        });
        return {
          enrichedCount,
          skippedKeys,
          pausedForRateLimit: true,
          remainingKeys: [
            ...pending.map((w) => w.key),
            ...chunks.slice(idx + 1).flatMap((c) => c.map((w) => w.key)),
          ],
        };
      }
      // Whole-chunk transport failure after retries — try one-by-one so the run can continue.
      console.warn(`    ⚠️ Batch transport failed, falling back to solo calls: ${err.message}`);
      for (const solo of pending) {
        await consoleState.waitIfPaused();
        try {
          const soloAnalysis = await callGeminiChunk([solo]);
          if (soloAnalysis.matched.length > 0) applyMatches(soloAnalysis.matched);
          else if ((soloAnalysis.rejected || []).length > 0) applyRejects(soloAnalysis.rejected);
          else {
            skippedKeys.push(solo.key);
            console.warn(`    ⏭️ Skipping ${solo.key} (empty/invalid response)`);
          }
        } catch (soloErr) {
          if (soloErr?.code === 'RATE_LIMIT_EXHAUSTED') {
            console.warn(
              `    ⏸️  Rate limit during solo fallback — pausing; ${pending.length - pending.indexOf(solo)} words left for later.`
            );
            fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');
            return {
              enrichedCount,
              skippedKeys,
              pausedForRateLimit: true,
              remainingKeys: [
                ...pending.slice(pending.indexOf(solo)).map((w) => w.key),
                ...chunks.slice(idx + 1).flatMap((c) => c.map((w) => w.key)),
              ],
            };
          }
          skippedKeys.push(solo.key);
          console.warn(`    ⏭️ Skipping ${solo.key}: ${soloErr.message}`);
        }
        await sleep(200);
      }
    }

    // Incremental write to prevent data loss
    fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');
    console.log(
      `    ✓ Batch ${idx + 1}/${chunks.length} done · enriched ${enrichedCount}/${candidates.length} · rejected ${invalidKeys.length} · skipped ${skippedKeys.length} · rate-limits ${totalRateLimits}`
    );

    const items = batchKeys.map((key) => ({
      key,
      before: beforeByKey[key],
      after: {
        display: dict[key]?.display,
        pos: dict[key]?.pos,
        def: dict[key]?.def,
        reviewed: dict[key]?.reviewed,
      },
      changed: (beforeByKey[key]?.def || '') !== (dict[key]?.def || ''),
    }));
    consoleState.writeLatestBatch({
      step: 'enrich',
      batchIndex: idx + 1,
      batchTotal: chunks.length,
      enriched: enrichedCount,
      skipped: skippedKeys.length,
      rateLimits: totalRateLimits,
      items,
    });
    consoleState.patchStatus({
      counters: {
        ...(consoleState.readStatus().counters || {}),
        batchIndex: idx + 1,
        batchTotal: chunks.length,
        enriched: enrichedCount,
        skipped: skippedKeys.length,
        rateLimits: totalRateLimits,
      },
    });

    await sleep(250);
  }

  if (skippedKeys.length > 0) {
    const skipPath = path.join(
      pipelinePaths.dataDir,
      '..',
      'evals',
      'artifacts',
      `enrich_skipped_${options.lang}.json`
    );
    fs.mkdirSync(path.dirname(skipPath), { recursive: true });
    fs.writeFileSync(
      skipPath,
      JSON.stringify({ lang: options.lang, skipped: [...new Set(skippedKeys)], count: skippedKeys.length }, null, 2) +
        '\n'
    );
    console.warn(
      `⚠️ Skipped ${new Set(skippedKeys).size} keys that Gemini would not enrich → ${skipPath}`
    );
  }

  if (invalidKeys.length > 0) {
    const uniqueInvalid = [];
    const seen = new Set();
    for (const row of invalidKeys) {
      if (seen.has(row.key)) continue;
      seen.add(row.key);
      uniqueInvalid.push(row);
    }
    const invalidPath = path.join(
      ROOT_DIR,
      'evals',
      'artifacts',
      `enrich_invalid_${options.lang}.json`
    );
    fs.mkdirSync(path.dirname(invalidPath), { recursive: true });
    fs.writeFileSync(
      invalidPath,
      JSON.stringify({ lang: options.lang, count: uniqueInvalid.length, invalid: uniqueInvalid }, null, 2) +
        '\n'
    );

    // Keep wordlist + review queue in sync with Gemini rejects.
    const wordsPath = pipelinePaths.wordsPath;
    if (fs.existsSync(wordsPath)) {
      const kept = fs
        .readFileSync(wordsPath, 'utf8')
        .split(/\r?\n/)
        .filter(Boolean)
        .filter((line) => {
          const token = line.trim().toLowerCase();
          const key = token.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return !seen.has(key) && !seen.has(token);
        });
      fs.writeFileSync(wordsPath, kept.join('\n') + (kept.length ? '\n' : ''));
    }
    if (fs.existsSync(queuePath)) {
      const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      q.queue = (q.queue || []).filter((item) => !seen.has(item.word));
      q.total = q.queue.length;
      fs.writeFileSync(queuePath, JSON.stringify(q, null, 2) + '\n');
    }

    console.warn(
      `✂️  Gemini rejected ${uniqueInvalid.length} non-${langName} tokens (removed from dict) → ${invalidPath}`
    );
  }

  // Final write after possible deletes
  fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');

  console.log(`✅ Successfully enriched ${enrichedCount} definitions!`);
  if (totalRateLimits > 0) {
    console.log(`   (Hit Gemini rate limit ${totalRateLimits} time(s) during this enrich run.)`);
  }
  return {
    enrichedCount,
    skippedKeys: [...new Set(skippedKeys)],
    invalidKeys: [...new Set(invalidKeys.map((r) => r.key))],
    rateLimits: totalRateLimits,
  };
}

/**
 * ----------------------------------------------------------------------------
 * Step 3: TypeSafe Jev System One Evaluation
 * ----------------------------------------------------------------------------
 */
async function stepEval(targetEntries = null, { mergeQueue = false } = {}) {
  console.log(`\n🧪 [Step 4/7] Evaluating ${langName} dictionary with TypeSafe Jev System One...`);

  const typesafeKey = process.env.TYPESAFE_API_KEY;
  if (!typesafeKey) {
    throw new Error('TYPESAFE_API_KEY is required for Jev evaluation.');
  }

  const { TypeSafeClient } = await import('@typesafe-ai/sdk');
  const { evaluateEntryWithJev } = await import('../evals/dictionary/scorers.ts');

  const client = new TypeSafeClient({ apiKey: typesafeKey });
  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

  const entriesToEval = targetEntries || Object.entries(dict).map(([word, e]) => ({
    word,
    lang: options.lang,
    display: e.display || word,
    pos: e.pos,
    d: e.d,
    def: e.def,
    reviewed: e.reviewed,
  }));

  console.log(`Running Jev evaluation over ${entriesToEval.length} entries...`);
  const reviewQueue = [];
  const failures = [];
  const concurrency = 25;
  let completed = 0;

  // Preserve rewrite-attempt counters across re-evals
  const priorAttempts = new Map();
  if (fs.existsSync(queuePath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      for (const item of prev.queue || []) {
        if (item?.word) {
          priorAttempts.set(item.word, item.geminiRewriteAttempts || 0);
        }
      }
    } catch {
      /* ignore corrupt prior queue */
    }
  }

  const queue = [...entriesToEval];
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) break;

      try {
        const result = await evaluateEntryWithJev(client, entry);

        const isDefInvalid =
          result.definitionVerdict !== 'accurate' && result.definitionVerdict !== 'inflected_form';
        const isFmtInvalid = result.formatVerdict !== 'clean_dictionary';
        const isDiffMismatch = !result.difficultyMatches;

        if (isDefInvalid || isFmtInvalid || isDiffMismatch) {
          const reasons = [];
          if (isDefInvalid) reasons.push(`Definition issue (${result.definitionVerdict})`);
          if (isFmtInvalid) reasons.push(`Format issue (${result.formatVerdict})`);
          if (isDiffMismatch) reasons.push(`Difficulty mismatch: current [${result.ourTier}] vs Jev [${result.jevTier}]`);

          reviewQueue.push({
            word: entry.word,
            lang: entry.lang,
            display: entry.display,
            pos: entry.pos,
            currentDef: entry.def,
            currentD: entry.d,
            ourTier: result.ourTier,
            jevTier: result.jevTier,
            difficultyMatches: result.difficultyMatches,
            definitionVerdict: result.definitionVerdict,
            formatVerdict: result.formatVerdict,
            reasons,
            geminiRewriteAttempts: priorAttempts.get(entry.word) || 0,
          });
        }
      } catch (err) {
        console.warn(`\n  ⚠️ Error evaluating ${entry.word}: ${err.message}`);
        const failure = {
          word: entry.word,
          lang: entry.lang,
          display: entry.display,
          pos: entry.pos,
          currentDef: entry.def,
          currentD: entry.d,
          evaluationFailed: true,
          error: err.message,
          reasons: [`Evaluation failed: ${err.message}`],
          geminiRewriteAttempts: priorAttempts.get(entry.word) || 0,
        };
        failures.push(failure);
        reviewQueue.push(failure);
      } finally {
        completed++;
        if (completed % 100 === 0 || completed === entriesToEval.length) {
          process.stdout.write(
            `  Progress: [${completed}/${entriesToEval.length}] (${((completed / entriesToEval.length) * 100).toFixed(1)}%)\r`
          );
        }
      }
    }
  });

  await Promise.all(workers);
  console.log(`\n✅ Evaluation complete.`);

  let finalQueue = reviewQueue;
  let priorKept = 0;
  if (mergeQueue && fs.existsSync(queuePath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      const byWord = new Map((prev.queue || []).map((item) => [item.word, item]));
      priorKept = byWord.size;
      const flaggedNow = new Set(reviewQueue.map((item) => item.word));
      for (const item of reviewQueue) {
        byWord.set(item.word, item);
      }
      // Wave members that passed drop out of the merged queue
      if (targetEntries) {
        for (const entry of targetEntries) {
          if (!flaggedNow.has(entry.word)) byWord.delete(entry.word);
        }
      }
      finalQueue = [...byWord.values()];
      console.log(
        `   Merged into review queue: prior ${priorKept} → ${finalQueue.length} (wave flagged ${reviewQueue.length})`
      );
    } catch {
      finalQueue = reviewQueue;
    }
  }

  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  fs.writeFileSync(
    queuePath,
    JSON.stringify(
      {
        total: mergeQueue ? finalQueue.length : entriesToEval.length,
        failures,
        queue: finalQueue,
        lastWave: targetEntries
          ? {
              size: entriesToEval.length,
              flagged: reviewQueue.length,
              clean: entriesToEval.length - reviewQueue.length,
            }
          : undefined,
      },
      null,
      2
    ) + '\n'
  );

  const cleanCount = entriesToEval.length - reviewQueue.length;
  const passRate =
    entriesToEval.length === 0 ? '100.00' : ((cleanCount / entriesToEval.length) * 100).toFixed(2);
  const flaggedCount = reviewQueue.length - failures.length;
  console.log(
    `📊 Scorecard: ${cleanCount} / ${entriesToEval.length} clean (${passRate}% pass rate; ${flaggedCount} flagged, ${failures.length} failed).`
  );
  console.log(
    `📄 Saved review queue to ${queuePath} (${finalQueue.length} entries requiring retry or remediation).`
  );

  consoleState.writeScorecard({
    step: 'eval',
    total: entriesToEval.length,
    clean: cleanCount,
    flagged: flaggedCount,
    failed: failures.length,
    passRate: Number(passRate),
    queueSize: finalQueue.length,
    waveFlagged: reviewQueue.length,
    summary: mergeQueue
      ? `Wave ${cleanCount}/${entriesToEval.length} clean · queue ${finalQueue.length}`
      : `${cleanCount}/${entriesToEval.length} clean (${passRate}%)`,
  });
  consoleState.patchStatus({
    counters: {
      ...(consoleState.readStatus().counters || {}),
      queueSize: finalQueue.length,
    },
  });

  if (failures.length > 0) {
    console.warn(
      `⚠️ ${failures.length} Jev evaluation(s) failed (kept in review queue for retry) — continuing.`
    );
  }

  return {
    queue: finalQueue,
    waveFlagged: reviewQueue.length,
    clean: cleanCount,
    total: entriesToEval.length,
    failures: failures.length,
  };
}

/**
 * Pick unenriched stubs in seed-frequency order (falls back to dict key order).
 */
function pickStubWave(dict, waveSize) {
  const isStub = (entry) =>
    !entry || !entry.reviewed || !entry.def || String(entry.def).trim().length < 15;

  const ordered = [];
  const seen = new Set();
  const wordsPath = pipelinePaths.wordsPath;
  if (fs.existsSync(wordsPath)) {
    for (const line of fs.readFileSync(wordsPath, 'utf8').split(/\r?\n/)) {
      const display = line.trim().toLowerCase();
      if (!display) continue;
      const key = normalizeKey(display);
      if (!/^[a-z]{5}$/.test(key) || seen.has(key)) continue;
      seen.add(key);
      ordered.push(key);
    }
  }
  for (const key of Object.keys(dict)) {
    if (seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }

  const stubs = [];
  for (const key of ordered) {
    if (!dict[key] || !isStub(dict[key])) continue;
    stubs.push(key);
    if (stubs.length >= waveSize) break;
  }
  return stubs;
}

function countStubs(dict) {
  let n = 0;
  for (const entry of Object.values(dict)) {
    if (!entry?.reviewed || !entry?.def || String(entry.def).trim().length < 15) n++;
  }
  return n;
}

/**
 * Vertical pipeline wave: enrich N stubs → eval those → remediate queue → stop.
 * Re-run the same command to process the next wave.
 */
async function stepWave() {
  const waveSize = options.waveSize;
  console.log(`\n🌊 [Wave] Vertical pipeline · size ${waveSize}`);
  console.log(`   enrich → eval (merge queue) → remediate wave failures only → stop`);

  const dictBefore = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  const stubsBefore = countStubs(dictBefore);
  const waveKeys = pickStubWave(dictBefore, waveSize);

  if (waveKeys.length === 0) {
    console.log('✅ No stubs left to enrich — dictionary is fully enriched.');
    consoleState.writeScorecard({
      step: 'wave',
      waveSize,
      enriched: 0,
      stubsBefore,
      stubsAfter: 0,
      summary: 'No stubs remaining',
    });
    return { enriched: 0, stubsBefore, stubsAfter: 0 };
  }

  console.log(
    `   Selected ${waveKeys.length} stubs (${stubsBefore} remaining before wave)`
  );
  console.log(
    `   Sample: ${waveKeys.slice(0, 12).join(', ')}${waveKeys.length > 12 ? ', …' : ''}`
  );

  consoleState.setStep('enrich', `Wave enrich ${waveKeys.length} stubs`);
  const enrichResult = await stepEnrich(true, waveKeys);

  // Re-read dict for successfully enriched wave members
  const dictAfterEnrich = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  const evalEntries = waveKeys
    .map((word) => {
      const e = dictAfterEnrich[word];
      if (!e?.def || String(e.def).trim().length < 15) return null;
      return {
        word,
        lang: options.lang,
        display: e.display || word,
        pos: e.pos,
        d: e.d,
        def: e.def,
        reviewed: e.reviewed,
      };
    })
    .filter(Boolean);

  consoleState.setStep('eval', `Wave eval ${evalEntries.length} enriched`);
  const evalResult = await stepEval(evalEntries, { mergeQueue: true });
  const waveFlagged = evalResult.waveFlagged;

  // One remediate pass — only failures from this wave's keys
  const prevPasses = options.maxRemediatePasses;
  options.maxRemediatePasses = 1;
  try {
    consoleState.setStep('remediate', 'Wave remediate (scoped)');
    await stepRemediate({ skipVerbFormMerge: true, onlyWords: waveKeys });
  } finally {
    options.maxRemediatePasses = prevPasses;
  }

  const dictAfter = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  const stubsAfter = countStubs(dictAfter);
  const queueAfter = fs.existsSync(queuePath)
    ? (JSON.parse(fs.readFileSync(queuePath, 'utf8')).queue || []).length
    : 0;

  const summary = {
    step: 'wave',
    waveSize,
    selected: waveKeys.length,
    enriched: enrichResult?.enrichedCount ?? 0,
    rejected: enrichResult?.invalidKeys?.length ?? 0,
    evaluated: evalEntries.length,
    waveFlagged,
    stubsBefore,
    stubsAfter,
    queueAfter,
    nextCommand: `npm run bootstrap:dict -- --lang=${options.lang} --name=${langName} --step=wave --wave-size=${waveSize}`,
    summary: `Wave +${enrichResult?.enrichedCount ?? 0} enriched · stubs ${stubsBefore} → ${stubsAfter} · queue ${queueAfter}`,
  };

  const progressPath = path.join(
    ROOT_DIR,
    'evals',
    'artifacts',
    `wave_progress_${options.lang}.json`
  );
  fs.mkdirSync(path.dirname(progressPath), { recursive: true });
  fs.writeFileSync(
    progressPath,
    JSON.stringify({ ...summary, updatedAt: new Date().toISOString(), sample: waveKeys.slice(0, 40) }, null, 2) +
      '\n'
  );

  consoleState.writeScorecard(summary);
  consoleState.patchStatus({
    counters: {
      ...(consoleState.readStatus().counters || {}),
      queueSize: queueAfter,
      stubsRemaining: stubsAfter,
      enriched: enrichResult?.enrichedCount ?? 0,
    },
  });

  console.log(`\n📋 Vertical wave summary`);
  console.log(`   Enriched: ${summary.enriched} (rejected ${summary.rejected})`);
  console.log(`   Evaluated: ${summary.evaluated}`);
  console.log(`   Stubs: ${stubsBefore} → ${stubsAfter}`);
  console.log(`   Review queue: ${queueAfter}`);
  console.log(`   Progress: ${progressPath}`);
  if (stubsAfter > 0) {
    console.log(`\n⏸️  Stopped after one wave. Next:`);
    console.log(`   ${summary.nextCommand}`);
  } else {
    console.log(`\n🎉 No stubs remaining.`);
  }

  return summary;
}

/**
 * ----------------------------------------------------------------------------
 * Step 4: Automated Calibration & Remediation Loop
 * ----------------------------------------------------------------------------
 *
 * Runs in waves so Gemini rate limits don't melt a full queue:
 *   1) calibrate difficulty for the whole queue (local, free)
 *   2) rewrite up to --rewrite-limit defs with Gemini (default 80)
 *   3) re-eval the queue with Jev and print a clear scorecard
 * Re-run the same command to process the next wave.
 */
function mergeVerbFormRewriteQueue(existingQueue) {
  const rewritePath = path.join(
    ROOT_DIR,
    'evals',
    'artifacts',
    `verb_form_rewrite_queue_${options.lang}.json`
  );
  if (!fs.existsSync(rewritePath)) {
    return { queue: existingQueue, merged: 0 };
  }
  let rewriteData;
  try {
    rewriteData = JSON.parse(fs.readFileSync(rewritePath, 'utf8'));
  } catch {
    return { queue: existingQueue, merged: 0 };
  }
  const incoming = Array.isArray(rewriteData?.queue) ? rewriteData.queue : [];
  if (!incoming.length) return { queue: existingQueue, merged: 0 };

  const byWord = new Map(existingQueue.map((item) => [item.word, item]));
  let merged = 0;
  for (const item of incoming) {
    if (!item?.word) continue;
    if (byWord.has(item.word)) {
      const prev = byWord.get(item.word);
      const reasons = new Set([...(prev.reasons || []), ...(item.reasons || [])]);
      byWord.set(item.word, {
        ...prev,
        ...item,
        reasons: [...reasons],
        definitionVerdict:
          prev.definitionVerdict === 'accurate' || prev.definitionVerdict === 'inflected_form'
            ? 'wrong_pos'
            : prev.definitionVerdict || item.definitionVerdict,
      });
    } else {
      byWord.set(item.word, item);
      merged++;
    }
  }
  return { queue: [...byWord.values()], merged };
}

async function stepRemediate({ skipVerbFormMerge = false, onlyWords = null } = {}) {
  console.log(`\n🔧 [Step 5/7] Running automated calibration & remediation loop for ${langName}...`);
  const rewriteLimit = options.rewriteLimit;
  const maxRewriteAttempts = options.maxRewriteAttempts;
  const onlySet = onlyWords ? new Set(onlyWords) : null;
  if (onlySet) {
    console.log(`   Scoped to ${onlySet.size} wave word(s) (backlog left untouched)`);
  }
  console.log(
    rewriteLimit > 0
      ? `   Wave mode: up to ${rewriteLimit} Gemini rewrites this run (pass --rewrite-limit=0 for unlimited).`
      : `   Wave mode: unlimited Gemini rewrites this run.`
  );
  console.log(
    `   Anti-thrash: after ${maxRewriteAttempts} failed Gemini→Jev rewrites, words go to manual review.`
  );

  const TIER_TARGET_D = {
    elementary: 0.35,
    intermediate: 0.65,
    advanced: 0.85,
    obscure: 0.95,
  };

  const progressPath = path.join(
    ROOT_DIR,
    'evals',
    'artifacts',
    `remediate_progress_${options.lang}.json`
  );

  const readManualQueue = () => {
    if (!fs.existsSync(manualQueuePath)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(manualQueuePath, 'utf8'));
      return Array.isArray(data?.queue) ? data.queue : [];
    } catch {
      return [];
    }
  };

  const writeManualQueue = (queue) => {
    fs.mkdirSync(path.dirname(manualQueuePath), { recursive: true });
    fs.writeFileSync(
      manualQueuePath,
      JSON.stringify(
        {
          lang: options.lang,
          total: queue.length,
          updatedAt: new Date().toISOString(),
          queue,
        },
        null,
        2
      ) + '\n'
    );
  };

  const promoteExhaustedBeforeRewrite = (items) => {
    const eligible = [];
    const exhausted = [];
    for (const item of items) {
      if (isExhaustedRewriteAttempts(item, maxRewriteAttempts)) {
        exhausted.push({
          ...item,
          manualReview: true,
          flaggedAt: new Date().toISOString(),
          promoteReason: `Already failed Gemini→Jev rewrite ${item.geminiRewriteAttempts || 0} time(s) (max ${maxRewriteAttempts})`,
        });
      } else {
        eligible.push(item);
      }
    }
    if (exhausted.length) {
      const mergedManual = mergeManualReviewQueue(readManualQueue(), exhausted);
      writeManualQueue(mergedManual);
      console.log(
        `   🛑 Promoted ${exhausted.length} exhausted word(s) → manual review (${mergedManual.length} total)`
      );
      console.log(`      ${manualQueuePath}`);
    }
    return { eligible, exhausted };
  };

  for (let pass = 1; pass <= options.maxRemediatePasses; pass++) {
    if (!fs.existsSync(queuePath)) {
      console.log('No review queue found. Running initial evaluation first...');
      await stepEval();
    }

    const qData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    if (!skipVerbFormMerge) {
      const mergedResult = mergeVerbFormRewriteQueue(qData.queue || []);
      if (mergedResult.merged > 0) {
        qData.queue = mergedResult.queue;
        qData.total = mergedResult.queue.length;
        fs.writeFileSync(queuePath, JSON.stringify(qData, null, 2) + '\n');
        console.log(
          `   ➕ Merged ${mergedResult.merged} verb-form POS-rewrite candidates into review queue`
        );
      }
    }
    let items = qData.queue || [];
    if (onlySet) {
      items = items.filter((item) => onlySet.has(item.word));
    }

    const { eligible: activeItems, exhausted: prePromoted } = promoteExhaustedBeforeRewrite(items);
    if (prePromoted.length) {
      // Drop promoted words from the persisted review queue
      const promotedWords = new Set(prePromoted.map((item) => item.word));
      const fullQueue = (qData.queue || []).filter((item) => !promotedWords.has(item.word));
      qData.queue = fullQueue;
      qData.total = fullQueue.length;
      fs.writeFileSync(queuePath, JSON.stringify(qData, null, 2) + '\n');
      items = activeItems;
    }

    const failureCount = items.filter((item) => item.evaluationFailed).length;
    const queueBefore = items.length;
    console.log(
      `\n--- Remediation Pass [${pass}/${options.maxRemediatePasses}] ---`
    );
    console.log(
      `   Queue: ${queueBefore} (${queueBefore - failureCount} flagged, ${failureCount} eval failures)`
    );

    if (items.length === 0) {
      if (onlySet) {
        console.log('🎉 No failures in the current wave set — skipping remediate.');
        return { queueBefore: 0, queueAfter: 0, scoped: true, promoted: prePromoted.length };
      }
      console.log('🎉 Review queue is completely clean (0 flagged items)!');
      return { queueBefore: 0, queueAfter: 0, promoted: prePromoted.length };
    }

    const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
    const wordsNeedingGemini = [];
    let calibrated = 0;

    for (const item of items) {
      if (item.evaluationFailed) continue;

      // 1. Auto-calibrate difficulty if Jev assessed a different tier
      if (!item.difficultyMatches && item.jevTier && TIER_TARGET_D[item.jevTier]) {
        if (dict[item.word] && dict[item.word].d !== TIER_TARGET_D[item.jevTier]) {
          dict[item.word].d = TIER_TARGET_D[item.jevTier];
          calibrated++;
        }
      }

      // 2. Identify entries needing definition or POS rewrite (skip exhausted — already promoted)
      if (needsGeminiRewrite(item)) {
        wordsNeedingGemini.push(item.word);
      }
    }

    fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');
    console.log(`   ✅ Calibrated difficulty on ${calibrated} entries (local, no API).`);
    console.log(`   ✍️  Definitions needing Gemini rewrite: ${wordsNeedingGemini.length}`);

    const waveWords =
      rewriteLimit > 0 ? wordsNeedingGemini.slice(0, rewriteLimit) : wordsNeedingGemini;
    const remainingAfterWave = Math.max(0, wordsNeedingGemini.length - waveWords.length);

    if (waveWords.length > 0) {
      console.log(
        `\n   🌊 Wave rewrite: ${waveWords.length} words` +
          (remainingAfterWave > 0 ? ` (${remainingAfterWave} left for later waves)` : '')
      );
      console.log(`   Sample: ${waveWords.slice(0, 12).join(', ')}${waveWords.length > 12 ? ', …' : ''}`);

      for (const w of waveWords) {
        if (dict[w]) dict[w].reviewed = false;
      }
      fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');
      const enrichResult = await stepEnrich(true, waveWords);
      if (enrichResult?.pausedForRateLimit) {
        console.warn(
          `\n⏸️  Gemini rate limit — stopping this wave after ${enrichResult.enrichedCount} rewrites.`
        );
        console.warn(
          `   Remaining in this wave: ${(enrichResult.remainingKeys || []).length}. Retry later with the same command.`
        );
        // Still re-eval so difficulty-only fixes and any successful rewrites are counted.
      }
    } else {
      console.log('   ℹ️ No definition rewrites needed this pass (difficulty-only / manual queue).');
    }

    // Re-evaluate previously flagged items against Jev
    console.log(`\n   🔁 Re-evaluating ${items.length} queue items with Jev...`);
    const recheckEntries = items.map((i) => {
      const e = JSON.parse(fs.readFileSync(dictPath, 'utf8'))[i.word];
      return {
        word: i.word,
        lang: options.lang,
        display: e?.display || i.word,
        pos: e?.pos,
        d: e?.d,
        def: e?.def,
        reviewed: e?.reviewed,
      };
    }).filter((e) => e.def);

    const remaining = await stepEval(recheckEntries, {
      // Keep backlog intact when remediating only the current vertical wave.
      mergeQueue: Boolean(onlySet),
    });
    void remaining;

    // Bump rewrite attempts + promote sticky words to manual review
    const qAfter = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    const scopedRemaining = onlySet
      ? (qAfter.queue || []).filter((item) => onlySet.has(item.word))
      : qAfter.queue || [];
    const backlog = onlySet
      ? (qAfter.queue || []).filter((item) => !onlySet.has(item.word))
      : [];

    const { kept, promoted } = applyRewriteAttemptOutcomes({
      priorItems: items,
      remainingItems: scopedRemaining,
      rewrittenWords: waveWords,
      maxAttempts: maxRewriteAttempts,
    });

    if (promoted.length) {
      const mergedManual = mergeManualReviewQueue(readManualQueue(), promoted);
      writeManualQueue(mergedManual);
      console.log(
        `   🛑 Promoted ${promoted.length} sticky word(s) → manual review (${mergedManual.length} total)`
      );
    }

    const finalQueue = onlySet ? [...backlog, ...kept] : kept;
    qAfter.queue = finalQueue;
    qAfter.total = finalQueue.length;
    qAfter.manualPromotedThisPass = promoted.length;
    fs.writeFileSync(queuePath, JSON.stringify(qAfter, null, 2) + '\n');

    const queueAfter = finalQueue.length;
    const progress = {
      lang: options.lang,
      updatedAt: new Date().toISOString(),
      pass,
      queueBefore,
      queueAfter,
      calibrated,
      rewriteNeeded: wordsNeedingGemini.length,
      rewriteThisWave: waveWords.length,
      rewriteStillPending: remainingAfterWave,
      rewriteLimit,
      maxRewriteAttempts,
      promotedToManual: promoted.length + prePromoted.length,
      manualQueueSize: readManualQueue().length,
      resolvedThisWave: Math.max(0, queueBefore - (kept.length + promoted.length)),
      nextCommand:
        queueAfter > 0
          ? `npm run bootstrap:dict -- --lang=${options.lang} --step=remediate --rewrite-limit=${rewriteLimit || 80}`
          : null,
    };
    fs.mkdirSync(path.dirname(progressPath), { recursive: true });
    fs.writeFileSync(progressPath, JSON.stringify(progress, null, 2) + '\n');

    console.log(`\n📋 Wave summary`);
    console.log(`   Queue: ${queueBefore} → ${queueAfter} (${progress.resolvedThisWave} resolved)`);
    console.log(`   Promoted to manual: ${progress.promotedToManual}`);
    console.log(`   Calibrated: ${calibrated}`);
    console.log(`   Rewrote this wave: ${waveWords.length}`);
    console.log(`   Still needing rewrite: ${remainingAfterWave}`);
    console.log(`   Progress file: ${progressPath}`);

    consoleState.writeScorecard({
      step: 'remediate',
      queueBefore,
      queueAfter,
      resolved: progress.resolvedThisWave,
      promotedToManual: progress.promotedToManual,
      calibrated,
      rewriteThisWave: waveWords.length,
      rewriteStillPending: remainingAfterWave,
      summary: `Queue ${queueBefore} → ${queueAfter} (${progress.resolvedThisWave} resolved, ${progress.promotedToManual} manual)`,
    });
    consoleState.patchStatus({
      counters: {
        ...(consoleState.readStatus().counters || {}),
        queueSize: queueAfter,
        manualQueueSize: progress.manualQueueSize,
        rewriteThisWave: waveWords.length,
        rewriteStillPending: remainingAfterWave,
      },
    });

    if (queueAfter === 0) {
      console.log(`\n🎉 All flagged words resolved or moved to manual review in pass ${pass}!`);
      return progress;
    }

    // Never Gemini-thrash inside one invocation: one rewrite wave then stop.
    // Sticky leftovers either wait for the next wave or are already manual.
    if (rewriteLimit > 0 && remainingAfterWave > 0) {
      console.log(`\n⏸️  Stopping after this wave so you can review.`);
      console.log(`   Next: ${progress.nextCommand}`);
      return progress;
    }

    if (waveWords.length > 0) {
      console.log(`\n⏸️  Stopping after one Gemini rewrite pass (anti-thrash).`);
      if (progress.nextCommand) console.log(`   Next: ${progress.nextCommand}`);
      return progress;
    }
  }
}

/**
 * ----------------------------------------------------------------------------
 * Step 5: Test & Validate
 * ----------------------------------------------------------------------------
 */
async function stepTest() {
  console.log(`\n🛡️ [Step 6/7] Running strict dictionary validation tests for ${langName}...`);

  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  const keys = Object.keys(dict);

  console.log(`Total dictionary entries: ${keys.length}`);
  if (keys.length < 1000) {
    throw new Error(`Dictionary size too small: expected >= 1000, got ${keys.length}`);
  }

  let errorCount = 0;
  for (const [key, entry] of Object.entries(dict)) {
    if (!/^[a-z]{5}$/.test(key)) {
      console.error(`❌ Invalid key format: "${key}"`);
      errorCount++;
    }
    if (!isValidDisplay(entry.display)) {
      console.error(`❌ Invalid display: "${key}" -> "${entry.display}"`);
      errorCount++;
    }
    if (typeof entry.d !== 'number' || entry.d < 0.05 || entry.d > 0.95) {
      console.error(`❌ Invalid difficulty: "${key}" -> d=${entry.d}`);
      errorCount++;
    }
    if (!isValidPos(entry.pos)) {
      console.error(`❌ Invalid POS: "${key}" -> "${entry.pos}"`);
      errorCount++;
    }
    if (!entry.def || entry.def.trim().split(/\s+/).length < 4) {
      console.error(`❌ Inadequate definition: "${key}" -> "${entry.def}"`);
      errorCount++;
    }
    if (!entry.reviewed) {
      console.error(`❌ Unreviewed entry: "${key}"`);
      errorCount++;
    }
  }

  if (errorCount > 0) {
    throw new Error(`Dictionary validation failed with ${errorCount} errors.`);
  }

  console.log(`✅ 100% of ${keys.length} entries passed strict dictionary validation!`);
}

/**
 * Main Controller
 */
async function main() {
  console.log(`=======================================================`);
  console.log(`🚀 Polyglot Wordle Dictionary Pipeline: ${langName} [${options.lang.toUpperCase()}]`);
  console.log(`Step: ${options.step.toUpperCase()}`);
  console.log(`=======================================================`);

  const startTime = Date.now();
  consoleState.beginRun({
    step: options.step,
    extra: {
      langName,
      rewriteLimit: options.rewriteLimit,
      batchSize: options.batchSize,
    },
  });

  try {
    // Seed first on full runs when the caller did not supply an explicit word list.
    const shouldSeed =
      options.step === 'seed' || (options.step === 'all' && !options.wordsFile);
    if (shouldSeed) {
      consoleState.setStep('seed');
      await stepSeed();
    }
    if (options.step === 'all' || options.step === 'ingest') {
      consoleState.setStep('ingest');
      await stepIngest();
    }
    if (options.step === 'all' || options.step === 'filter') {
      consoleState.setStep('filter');
      await stepFilter();
    }
    if (options.step === 'all' || options.step === 'enrich') {
      consoleState.setStep('enrich');
      await stepEnrich();
    }
    if (options.step === 'wave') {
      await stepWave();
    }
    if (options.step === 'all' || options.step === 'eval') {
      consoleState.setStep('eval');
      await stepEval();
    }
    if (options.step === 'all' || options.step === 'remediate') {
      consoleState.setStep('remediate');
      await stepRemediate();
    }
    if (options.step === 'all' || options.step === 'test') {
      consoleState.setStep('test');
      await stepTest();
    }

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✨ Pipeline complete for ${langName} in ${elapsedSec}s!`);
    consoleState.endRun({ ok: true });
  } catch (err) {
    console.error(`\n❌ Pipeline failed:`, err);
    consoleState.endRun({ ok: false, error: err?.message || String(err) });
    process.exit(1);
  }
}

if (isMain) {
  main();
}
