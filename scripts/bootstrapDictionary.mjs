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
 *   npm run bootstrap:dict -- --lang=pt --name=Portuguese --words=data/pt_5letters.txt
 *   npm run bootstrap:dict -- --lang=pt --step=enrich
 *   npm run bootstrap:dict -- --lang=pt --step=eval
 *   npm run bootstrap:dict -- --lang=pt --step=remediate
 *
 * Pipeline Steps:
 *   1. ingest:    Normalize raw words -> 5-letter ASCII keys + unicode displays
 *   2. enrich:    Gemini 2.5 Flash structured lexicography (POS + English defs)
 *   3. eval:      TypeSafe Jev System One evaluation (accuracy, format, difficulty)
 *   4. remediate: Auto-calibrate difficulty & repair flagged definitions in a loop
 *   5. test:      Validate dictionary schema, formatting hygiene, and consistency
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const SUPPORTED_STEPS = new Set(['all', 'ingest', 'enrich', 'eval', 'remediate', 'test']);
const VALID_POS = new Set(['noun', 'verb', 'adj', 'adv', 'pron', 'intj', 'num']);

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
    maxRemediatePasses: 3,
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

  return parsed;
}

export function resolvePipelinePaths(rootDir, lang) {
  const publicDir = path.resolve(rootDir, 'public');
  const artifactsDir = path.resolve(rootDir, 'evals', 'artifacts');
  const resolvedDictPath = path.resolve(publicDir, `${lang}.json`);
  const resolvedQueuePath = path.resolve(artifactsDir, `review_queue_${lang}.json`);

  if (!resolvedDictPath.startsWith(`${publicDir}${path.sep}`)) {
    throw new Error(`Dictionary path escapes the public directory: ${resolvedDictPath}`);
  }
  if (!resolvedQueuePath.startsWith(`${artifactsDir}${path.sep}`)) {
    throw new Error(`Review queue path escapes the artifacts directory: ${resolvedQueuePath}`);
  }

  return { dictPath: resolvedDictPath, queuePath: resolvedQueuePath };
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
const { dictPath, queuePath } = resolvePipelinePaths(ROOT_DIR, options.lang);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper: Normalize diacritics to 5-letter ASCII key
function normalizeKey(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

export function isValidDisplay(display) {
  return typeof display === 'string' && display.length === 5;
}

export function isValidPos(pos) {
  return VALID_POS.has(pos);
}

/**
 * ----------------------------------------------------------------------------
 * Step 1: Ingest Raw Word List
 * ----------------------------------------------------------------------------
 */
async function stepIngest() {
  console.log(`\n📥 [Step 1/5] Ingesting raw word list for ${langName} (${options.lang})...`);

  if (!options.wordsFile || !fs.existsSync(options.wordsFile)) {
    if (fs.existsSync(dictPath)) {
      console.log(`ℹ️ No --words file provided, but existing dictionary found at ${dictPath}. Proceeding with existing entries.`);
      return;
    }
    throw new Error(`Words file not found: ${options.wordsFile}`);
  }

  const rawLines = fs.readFileSync(options.wordsFile, 'utf8').split(/\r?\n/);
  const dict = fs.existsSync(dictPath) ? JSON.parse(fs.readFileSync(dictPath, 'utf8')) : {};

  let added = 0;
  for (const line of rawLines) {
    const rawWord = line.trim();
    if (!rawWord) continue;

    // Filter length: display must be 5 chars, normalized key must be 5 ASCII [a-z]
    if (rawWord.length !== 5) continue;
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
 * Step 2: Gemini 2.5 Flash Definition & POS Enrichment
 * ----------------------------------------------------------------------------
 */
async function stepEnrich(filterUnreviewedOnly = true) {
  console.log(`\n✨ [Step 2/5] Enriching definitions and POS with Gemini (${options.geminiModel})...`);

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

  console.log(`Found ${candidates.length} words to enrich in batches of ${options.batchSize}.`);
  if (candidates.length === 0) {
    console.log('✅ All entries are already enriched and reviewed.');
    return;
  }

  const chunks = [];
  for (let i = 0; i < candidates.length; i += options.batchSize) {
    chunks.push(candidates.slice(i, i + options.batchSize));
  }

  let enrichedCount = 0;
  for (let idx = 0; idx < chunks.length; idx++) {
    const chunk = chunks[idx];
    console.log(`  Processing batch [${idx + 1}/${chunks.length}] (${chunk.length} words)...`);

    const prompt = `You are an expert lexicographer for an educational multilingual Wordle puzzle game.
Your task is to provide accurate, concise, modern English definitions and grammatical part-of-speech (POS) tags for 5-letter ${langName} words.

Target Language: ${langName} (${options.lang.toUpperCase()})
Instructions:
1. All definitions MUST be written in English so English-speaking players can learn what the ${langName} word means.
2. Length: 10 to 25 words per definition. Concise, clear, educational, and natural.
3. Quality Rules:
   - NEVER use lazy or circular formulas like "A term denoting X", "Plural of X", "Pertaining to X", or "Only used in...".
   - If a word is an inflected form (conjugated verb or plural noun), explain what the word actually MEANS in English first, and cite the grammatical lemma in parentheses at the end.
     Format strictly as: "[Clear, concise English definition of what the word means] (inflection note, e.g. present tense of cantar)."
     Example for Spanish "frena": "Slows down, stops, or applies the brakes to a vehicle or motion (present tense of frenar)."
     Example for French "admet": "Accepts, acknowledges, or allows someone or something in (present tense of admettre)."
     Example for Portuguese "falou": "Spoke, talked, or communicated words to someone (third-person singular past preterite of falar)."
   - If the word is spelled identically to an English word (e.g. false friends like "moral", "about", "venue"), explicitly define its meaning in ${langName}!
   - Do NOT prepend "In ${langName}..." or "In English..." to definitions unnecessarily. Only include language context if it is genuinely part of the definition (e.g. culturally specific idioms or slang); otherwise define the concept directly in English.
   - For words with archaic or obsolete meanings, prioritize the primary modern everyday meaning.
4. POS: Must be strictly one of: "noun", "verb", "adj", "adv", "pron", "intj", "num".
5. display: Provide the standard diacritics/accents for the word if applicable, or lowercase unaccented if none.

Input Words:
${JSON.stringify(chunk.map((w) => ({ key: w.key, display: w.display, currentDef: w.def, currentPos: w.pos })), null, 2)}
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
              display: { type: 'string' },
              pos: { type: 'string', enum: ['noun', 'verb', 'adj', 'adv', 'pron', 'intj', 'num'] },
              def: { type: 'string' },
            },
            required: ['key', 'display', 'pos', 'def'],
          },
        },
      },
    };

    let attempts = 0;
    let success = false;
    while (attempts < 3 && !success) {
      attempts++;
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
            console.warn(`    ⚠️ Rate limit (429). Backing off ${attempts * 3}s...`);
            await sleep(attempts * 3000);
            continue;
          }
          throw new Error(`Gemini API error (${res.status}): ${errBody}`);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const results = JSON.parse(text);
        validateGeminiBatch(results, chunk);

        for (const item of results) {
          dict[item.key].display = item.display || dict[item.key].display;
          dict[item.key].pos = item.pos;
          dict[item.key].def = item.def;
          dict[item.key].reviewed = true;
          enrichedCount++;
        }
        success = true;
      } catch (err) {
        console.warn(`    ⚠️ Attempt ${attempts} failed: ${err.message}`);
        if (attempts >= 3) throw err;
        await sleep(2000);
      }
    }

    // Incremental write to prevent data loss
    fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');
    await sleep(250);
  }

  console.log(`✅ Successfully enriched ${enrichedCount} definitions!`);
}

/**
 * ----------------------------------------------------------------------------
 * Step 3: TypeSafe Jev System One Evaluation
 * ----------------------------------------------------------------------------
 */
async function stepEval(targetEntries = null) {
  console.log(`\n🧪 [Step 3/5] Evaluating ${langName} dictionary with TypeSafe Jev System One...`);

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

  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  fs.writeFileSync(
    queuePath,
    JSON.stringify({ total: entriesToEval.length, failures, queue: reviewQueue }, null, 2)
  );

  const cleanCount = entriesToEval.length - reviewQueue.length;
  const passRate =
    entriesToEval.length === 0 ? '100.00' : ((cleanCount / entriesToEval.length) * 100).toFixed(2);
  const flaggedCount = reviewQueue.length - failures.length;
  console.log(
    `📊 Scorecard: ${cleanCount} / ${entriesToEval.length} clean (${passRate}% pass rate; ${flaggedCount} flagged, ${failures.length} failed).`
  );
  console.log(
    `📄 Saved review queue to ${queuePath} (${reviewQueue.length} entries requiring retry or remediation).`
  );

  if (failures.length > 0) {
    throw new Error(`${failures.length} Jev evaluation(s) failed and remain in the review queue.`);
  }

  return reviewQueue;
}

/**
 * ----------------------------------------------------------------------------
 * Step 4: Automated Calibration & Remediation Loop
 * ----------------------------------------------------------------------------
 */
async function stepRemediate() {
  console.log(`\n🔧 [Step 4/5] Running automated calibration & remediation loop for ${langName}...`);

  const TIER_TARGET_D = {
    elementary: 0.35,
    intermediate: 0.65,
    advanced: 0.85,
    obscure: 0.95,
  };

  for (let pass = 1; pass <= options.maxRemediatePasses; pass++) {
    if (!fs.existsSync(queuePath)) {
      console.log('No review queue found. Running initial evaluation first...');
      await stepEval();
    }

    const qData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    const items = qData.queue || [];
    const failureCount = items.filter((item) => item.evaluationFailed).length;
    console.log(
      `\n--- Remediation Pass [${pass}/${options.maxRemediatePasses}]: ${items.length - failureCount} flagged items, ${failureCount} evaluation failures ---`
    );

    if (items.length === 0) {
      console.log('🎉 Review queue is completely clean (0 flagged items)!');
      return;
    }

    const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
    const wordsNeedingGemini = [];

    for (const item of items) {
      if (item.evaluationFailed) continue;

      // 1. Auto-calibrate difficulty if Jev assessed a different tier
      if (!item.difficultyMatches && item.jevTier && TIER_TARGET_D[item.jevTier]) {
        if (dict[item.word]) {
          dict[item.word].d = TIER_TARGET_D[item.jevTier];
        }
      }

      // 2. Identify entries needing definition or POS rewrite
      const isDefInvalid = item.definitionVerdict !== 'accurate' && item.definitionVerdict !== 'inflected_form';
      const isFmtInvalid = item.formatVerdict !== 'clean_dictionary';
      if (isDefInvalid || isFmtInvalid) {
        wordsNeedingGemini.push(item.word);
      }
    }

    fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');

    // If definition fixes needed, call Gemini on those specific words
    if (wordsNeedingGemini.length > 0) {
      console.log(`Re-enriching ${wordsNeedingGemini.length} words with Gemini...`);
      // Reset reviewed flag on these words so stepEnrich picks them up
      for (const w of wordsNeedingGemini) {
        if (dict[w]) dict[w].reviewed = false;
      }
      fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');
      await stepEnrich(true);
    }

    // Re-evaluate only the previously flagged items against Jev
    const recheckEntries = items.map((i) => {
      const e = JSON.parse(fs.readFileSync(dictPath, 'utf8'))[i.word];
      return {
        word: i.word,
        lang: options.lang,
        display: e.display || i.word,
        pos: e.pos,
        d: e.d,
        def: e.def,
        reviewed: e.reviewed,
      };
    });

    const remainingFlagged = await stepEval(recheckEntries);
    if (remainingFlagged.length === 0) {
      console.log(`\n🎉 All flagged words resolved in pass ${pass}!`);
      break;
    }
  }
}

/**
 * ----------------------------------------------------------------------------
 * Step 5: Test & Validate
 * ----------------------------------------------------------------------------
 */
async function stepTest() {
  console.log(`\n🛡️ [Step 5/5] Running strict dictionary validation tests for ${langName}...`);

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

  try {
    if (options.step === 'all' || options.step === 'ingest') await stepIngest();
    if (options.step === 'all' || options.step === 'enrich') await stepEnrich();
    if (options.step === 'all' || options.step === 'eval') await stepEval();
    if (options.step === 'all' || options.step === 'remediate') await stepRemediate();
    if (options.step === 'all' || options.step === 'test') await stepTest();

    const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✨ Pipeline complete for ${langName} in ${elapsedSec}s!`);
  } catch (err) {
    console.error(`\n❌ Pipeline failed:`, err);
    process.exit(1);
  }
}

if (isMain) {
  main();
}
