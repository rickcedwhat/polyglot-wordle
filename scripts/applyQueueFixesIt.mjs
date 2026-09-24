/**
 * Manual fixes for Italian manual_review_it.json stickies, then Jev recheck.
 *
 *   npx vite-node --script scripts/applyQueueFixesIt.mjs
 *   npx vite-node --script scripts/applyQueueFixesIt.mjs -- --recheck
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });

const dictPath = path.join(ROOT, 'public/it.json');
const manualPath = path.join(ROOT, 'evals/artifacts/manual_review_it.json');
const queuePath = path.join(ROOT, 'evals/artifacts/review_queue_it.json');

const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

/**
 * Function words: keep guessable. d is calibrated to Jev (they're everyday),
 * so they CAN appear as easy answers unless we later add answerEligible=false.
 */
const FUNCTION_WORD_D = 0.35;

/** Not real / clipped / junk lemmas */
const purges = ['eddai', 'venir', 'morir', 'fotta', 'zooma'];

const updates = {
  // --- preposizione articolate / prep (POS fix) ---
  delle: {
    pos: 'contraction',
    d: FUNCTION_WORD_D,
    def: "Of the / some (feminine plural); contraction of di + le.",
  },
  della: {
    pos: 'contraction',
    d: FUNCTION_WORD_D,
    def: "Of the / from the (feminine singular); contraction of di + la.",
  },
  dello: {
    pos: 'contraction',
    d: FUNCTION_WORD_D,
    def: "Of the / some (masculine singular before z, s+consonant, etc.); contraction of di + lo.",
  },
  degli: {
    pos: 'contraction',
    d: FUNCTION_WORD_D,
    def: "Of the / some (masculine plural before vowel or z/s+consonant); contraction of di + gli.",
  },
  negli: {
    pos: 'contraction',
    d: FUNCTION_WORD_D,
    def: "In the / into the (masculine plural before vowel or z/s+consonant); contraction of in + gli.",
  },
  nello: {
    pos: 'contraction',
    d: FUNCTION_WORD_D,
    def: "In the / into the (masculine singular before z, s+consonant, etc.); contraction of in + lo.",
  },
  nelle: {
    pos: 'contraction',
    d: FUNCTION_WORD_D,
    def: "In the / into the (feminine plural); contraction of in + le.",
  },
  sulle: {
    pos: 'contraction',
    d: FUNCTION_WORD_D,
    def: "On the / upon the (feminine plural); contraction of su + le.",
  },
  sullo: {
    pos: 'contraction',
    d: FUNCTION_WORD_D,
    def: "On the / upon the (masculine singular before z, s+consonant, etc.); contraction of su + lo.",
  },
  dalle: {
    pos: 'contraction',
    d: FUNCTION_WORD_D,
    def: "From the / by the (feminine plural); contraction of da + le.",
  },
  dalla: {
    pos: 'contraction',
    d: FUNCTION_WORD_D,
    def: "From the / by the (feminine singular); contraction of da + la.",
  },
  senza: {
    pos: 'prep',
    d: FUNCTION_WORD_D,
    def: 'Without; lacking or in the absence of something or someone.',
  },
  salve: {
    pos: 'intj',
    d: 0.65,
    def: 'Hello; a greeting or well-wishing salutation (slightly more formal than ciao).',
  },

  // --- dictionary-grounded content words ---
  scale: {
    pos: 'noun',
    d: 0.35,
    def: 'Stairs or a staircase; the steps connecting floors of a building (plural of scala).',
  },
  crepe: {
    pos: 'noun',
    d: 0.65,
    def: 'Thin pancakes (crêpes); also cracks or fissures (plural of crepa).',
  },
  china: {
    pos: 'noun',
    d: 0.65,
    def: 'India ink used for drawing and calligraphy.',
  },
  spine: {
    pos: 'noun',
    d: 0.65,
    def: 'Thorns, spines, or fishbones; also electrical plugs (plural of spina).',
  },
  letta: {
    pos: 'verb',
    d: 0.65,
    def: 'Read (feminine singular past participle of leggere).',
  },
  torce: {
    pos: 'noun',
    d: 0.65,
    def: 'Torches or flares; thick processional candles (plural of torcia).',
  },
  sanne: {
    pos: 'noun',
    d: 0.85,
    def: 'Tusks or fangs (literary plural of sanna, a variant of zanna).',
  },
  sdrai: {
    pos: 'noun',
    d: 0.65,
    def: 'Deck chairs or recliners; chairs for lying back (plural of sdraio).',
  },
  bamba: {
    pos: 'noun',
    d: 0.95,
    def: 'An archaic word for a doll (bambola).',
  },
  bonzo: {
    pos: 'noun',
    d: 0.85,
    def: 'A Buddhist monk; also, colloquially, a self-important bigwig.',
  },
  bulla: {
    pos: 'noun',
    d: 0.95,
    def: 'In ancient Rome, a small amulet case worn by noble children; also a papal bull.',
  },
  linda: {
    pos: 'adj',
    d: 0.65,
    def: 'Clean, neat, tidy, or pretty in appearance.',
  },
  matte: {
    pos: 'adj',
    d: 0.65,
    def: 'Crazy or mad (feminine plural of matto); also dull, non-glossy (matte finish).',
  },
  umane: {
    pos: 'adj',
    d: 0.65,
    def: 'Human; relating to people (feminine plural of umano).',
  },
  farne: {
    pos: 'verb',
    d: 0.65,
    def: 'To do or make some of it; infinitive fare plus the partitive clitic ne.',
  },
  verna: {
    pos: 'noun',
    d: 0.95,
    def: 'An alder tree (Alnus); a deciduous tree of damp ground.',
  },
  valso: {
    pos: 'verb',
    d: 0.85,
    def: 'Been worth or availed (past participle of valere: is/was worth).',
  },

  // --- clean conjugation glosses ---
  agite: {
    pos: 'verb',
    d: 0.65,
    def: 'Shake or stir (second-person plural imperative of agitare).',
  },
  erode: {
    pos: 'verb',
    d: 0.65,
    def: 'Wears away rock or soil gradually (third-person singular of erodere).',
  },
  operi: {
    pos: 'verb',
    d: 0.65,
    def: 'Operate or work (present subjunctive of operare).',
  },
  morda: {
    pos: 'verb',
    d: 0.65,
    def: 'Bite or may bite (present subjunctive or imperative of mordere).',
  },
};

let purged = 0;
for (const w of purges) {
  if (dict[w]) {
    delete dict[w];
    purged++;
    console.log(`[IT] Purged ${w}`);
  }
}

let updated = 0;
for (const [w, patch] of Object.entries(updates)) {
  if (!dict[w]) {
    console.warn(`[IT] Missing ${w}`);
    continue;
  }
  Object.assign(dict[w], patch, { reviewed: true });
  updated++;
  console.log(`[IT] Updated ${w}`);
}

fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');
console.log(`Wrote ${dictPath} (${updated} updates, ${purged} purges)`);

// Drop purges from manual queue; keep others until recheck
if (fs.existsSync(manualPath)) {
  const m = JSON.parse(fs.readFileSync(manualPath, 'utf8'));
  const purgeSet = new Set(purges);
  const before = (m.queue || []).length;
  m.queue = (m.queue || []).filter((item) => !purgeSet.has(item.word));
  m.total = m.queue.length;
  fs.writeFileSync(manualPath, JSON.stringify(m, null, 2) + '\n');
  console.log(`Manual queue: ${before} → ${m.queue.length}`);
}

if (!process.argv.includes('--recheck')) {
  console.log('Apply done. Re-run with --recheck to evaluate fixed words with Jev.');
  process.exit(0);
}

const typesafeKey = process.env.TYPESAFE_API_KEY;
if (!typesafeKey) {
  console.error('Missing TYPESAFE_API_KEY');
  process.exit(1);
}

const { TypeSafeClient } = await import('@typesafe-ai/sdk');
const { evaluateEntryWithJev } = await import('../evals/dictionary/scorers.ts');
const client = new TypeSafeClient({ apiKey: typesafeKey });

const manual = fs.existsSync(manualPath)
  ? JSON.parse(fs.readFileSync(manualPath, 'utf8'))
  : { queue: [] };
const words = (manual.queue || []).map((item) => item.word);
console.log(`\nRechecking ${words.length} manual words with Jev...`);

const still = [];
const clean = [];

for (const word of words) {
  const e = dict[word];
  if (!e) continue;
  const entry = {
    word,
    lang: 'it',
    display: e.display || word,
    pos: e.pos,
    d: e.d,
    def: e.def,
    reviewed: e.reviewed,
  };
  try {
    const result = await evaluateEntryWithJev(client, entry);
    const isDefInvalid =
      result.definitionVerdict !== 'accurate' && result.definitionVerdict !== 'inflected_form';
    const isFmtInvalid = result.formatVerdict !== 'clean_dictionary';
    const isDiffMismatch = !result.difficultyMatches;
    const line = `${word.padEnd(10)} def=${result.definitionVerdict.padEnd(16)} fmt=${result.formatVerdict.padEnd(18)} tier=${result.ourTier}→${result.jevTier}`;
    if (isDefInvalid || isFmtInvalid || isDiffMismatch) {
      console.log(`  ✗ ${line}`);
      still.push({
        word,
        lang: 'it',
        display: entry.display,
        pos: entry.pos,
        currentDef: entry.def,
        currentD: entry.d,
        ourTier: result.ourTier,
        jevTier: result.jevTier,
        difficultyMatches: result.difficultyMatches,
        definitionVerdict: result.definitionVerdict,
        formatVerdict: result.formatVerdict,
        geminiRewriteAttempts: 2,
        manualReview: true,
        reasons: [
          ...(isDefInvalid ? [`Definition issue (${result.definitionVerdict})`] : []),
          ...(isFmtInvalid ? [`Format issue (${result.formatVerdict})`] : []),
          ...(isDiffMismatch
            ? [`Difficulty mismatch: current [${result.ourTier}] vs Jev [${result.jevTier}]`]
            : []),
        ],
      });
    } else {
      console.log(`  ✓ ${line}`);
      clean.push(word);
    }
  } catch (err) {
    console.warn(`  ⚠ ${word}: ${err.message}`);
    still.push({
      word,
      evaluationFailed: true,
      error: err.message,
      geminiRewriteAttempts: 2,
      manualReview: true,
    });
  }
}

fs.writeFileSync(
  manualPath,
  JSON.stringify(
    {
      lang: 'it',
      total: still.length,
      updatedAt: new Date().toISOString(),
      lastFixPass: {
        clean: clean.length,
        still: still.length,
        purged,
      },
      queue: still,
    },
    null,
    2
  ) + '\n'
);

// Keep active review queue empty / untouched
if (fs.existsSync(queuePath)) {
  const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  q.queue = (q.queue || []).filter((item) => !clean.includes(item.word) && !purges.includes(item.word));
  q.total = q.queue.length;
  fs.writeFileSync(queuePath, JSON.stringify(q, null, 2) + '\n');
}

console.log(`\nCleared ${clean.length} · still manual ${still.length} · purged ${purged}`);
console.log(`Still: ${still.map((i) => i.word).join(', ') || '(none)'}`);
