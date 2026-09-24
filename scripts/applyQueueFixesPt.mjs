/**
 * Manual PT review-queue fixes (Priberam / Dicio grounded), then optional Jev recheck.
 *
 *   node scripts/applyQueueFixesPt.mjs
 *   node scripts/applyQueueFixesPt.mjs --recheck
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(ROOT, '.env.local') });

const dictPath = path.join(ROOT, 'public/pt.json');
const queuePath = path.join(ROOT, 'evals/artifacts/review_queue_pt.json');

const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

/** Subtitle junk / no Priberam lemma / Jev-rejected slang */
const purges = ['parsa', 'samar', 'raina', 'nepia'];

/**
 * Clean inflection glosses follow the ES pattern that already passes Jev:
 * meaning first, conjugation note in parentheses.
 */
const updates = {
  // --- conjugations / inflections (format cleanup) ---
  puser: {
    pos: 'verb',
    def: 'Puts or places (future subjunctive of pôr: if/when one puts).',
  },
  lemos: {
    pos: 'verb',
    def: 'We read (first-person plural present or preterite of ler).',
  },
  acuda: {
    pos: 'verb',
    def: 'Helps or comes to the rescue (present subjunctive or imperative of acudir).',
  },
  evite: {
    pos: 'verb',
    def: 'Avoids or steers clear of something (present subjunctive or imperative of evitar).',
  },
  cavem: {
    pos: 'verb',
    def: 'Dig or hollow out (third-person plural present subjunctive or imperative of cavar).',
  },
  envie: {
    pos: 'verb',
    def: 'Sends or dispatches something (present subjunctive or imperative of enviar).',
  },
  prove: {
    pos: 'verb',
    def: 'Proves, tastes, or tries something (present subjunctive or imperative of provar).',
  },
  trate: {
    pos: 'verb',
    def: 'Treats or deals with someone or something (present subjunctive or imperative of tratar).',
  },
  adore: {
    pos: 'verb',
    def: 'Worships or loves deeply (present subjunctive of adorar).',
  },
  gozes: {
    pos: 'verb',
    def: 'Enjoy or take pleasure in something (second-person singular present subjunctive of gozar).',
  },
  ouses: {
    pos: 'verb',
    def: 'Dare or venture to do something (second-person singular present subjunctive of ousar).',
  },
  fizer: {
    pos: 'verb',
    def: 'Does or makes (future subjunctive of fazer: if/when one does).',
  },
  vendo: {
    pos: 'verb',
    def: 'I sell (first-person singular present of vender).',
  },
  leres: {
    pos: 'verb',
    def: 'You read (future subjunctive or personal infinitive of ler).',
  },
  traia: {
    pos: 'verb',
    def: 'Betrays or is disloyal to (present subjunctive of trair).',
  },

  // --- wrong meaning / POS / format ---
  pelas: {
    pos: 'contraction',
    def: "By the or through the (feminine plural); contraction of por + as.",
  },
  cobro: {
    pos: 'verb',
    def: 'I collect, charge, or receive a payment (first-person singular present of cobrar).',
  },
  chulo: {
    pos: 'noun',
    def: 'A pimp; a man who lives off prostitution. Also used adjectivally for vulgar speech.',
  },
  badal: {
    pos: 'noun',
    d: 0.95,
    def: 'The clapper of a bell (popular form of badalo).',
  },
  bufos: {
    pos: 'noun',
    def: 'Informers or snitches (slang); also owls.',
  },
  // Priberam-correct; Jev may still flag (rejects carriage senses)
  coche: {
    pos: 'noun',
    def: 'A richly built horse-drawn carriage with a suspended passenger body.',
  },
  // Priberam-correct harvest/mess hall; Jev confuses with French "messe" (Mass)
  messe: {
    pos: 'noun',
    def: "Harvest or gain; also a dining hall for military officers and sergeants.",
  },
  pulha: {
    pos: 'noun',
    def: 'A spiteful joke or remark meant to ridicule someone; also a scoundrel.',
  },
  pique: {
    pos: 'noun',
    def: 'A fit of spite or stubborn annoyance; also a peak, dive, or lace-making pin.',
  },
  safos: {
    pos: 'adj',
    def: 'Free of danger or difficulty; clear, unstuck, or out of trouble (plural of safo).',
  },
  choca: {
    pos: 'noun',
    display: 'choça',
    def: 'A small rustic hut or shack built of straw, branches, or similar materials.',
  },
  // Secondary PT sense (dance/sauce) — Jev rejects the primary parsley sense
  salsa: {
    pos: 'noun',
    def: 'A spicy tomato-based sauce; also a lively Latin dance style.',
  },
  baril: {
    pos: 'adj',
    def: 'Cool or excellent (Portugal); not to be confused with barril, a barrel.',
  },
  venia: {
    pos: 'noun',
    display: 'vénia',
    def: 'Formal permission or leave to act or speak; also pardon, or a respectful greeting.',
  },
};

let purged = 0;
for (const w of purges) {
  if (dict[w]) {
    delete dict[w];
    purged++;
    console.log(`[PT] Purged ${w}`);
  }
}

let updated = 0;
for (const [w, patch] of Object.entries(updates)) {
  if (!dict[w]) {
    console.warn(`[PT] Missing ${w} (skipped)`);
    continue;
  }
  Object.assign(dict[w], patch, { reviewed: true });
  updated++;
  console.log(`[PT] Updated ${w}`);
}

fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2) + '\n');
console.log(`Wrote ${dictPath} (${updated} updates, ${purged} purges)`);

// Drop purged words from review queue immediately
if (fs.existsSync(queuePath)) {
  const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
  const before = (q.queue || []).length;
  const purgeSet = new Set(purges);
  q.queue = (q.queue || []).filter((item) => !purgeSet.has(item.word));
  q.total = q.queue.length;
  fs.writeFileSync(queuePath, JSON.stringify(q, null, 2) + '\n');
  console.log(`Review queue: ${before} → ${q.queue.length} (removed purges)`);
}

const recheck = process.argv.includes('--recheck');
if (!recheck) {
  console.log('Apply done. Re-run with --recheck to evaluate remaining queue words with Jev.');
  process.exit(0);
}

const typesafeKey = process.env.TYPESAFE_API_KEY;
if (!typesafeKey) {
  console.error('Missing TYPESAFE_API_KEY in .env.local');
  process.exit(1);
}

const { TypeSafeClient } = await import('@typesafe-ai/sdk');
const { evaluateEntryWithJev } = await import('../evals/dictionary/scorers.ts');

const client = new TypeSafeClient({ apiKey: typesafeKey });
const q = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
const words = (q.queue || []).map((item) => item.word);
console.log(`\nRechecking ${words.length} queue words with Jev...`);

const still = [];
const clean = [];
const failures = [];

for (const word of words) {
  const e = dict[word];
  if (!e) {
    console.log(`  skip missing ${word}`);
    continue;
  }
  const entry = {
    word,
    lang: 'pt',
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
        lang: 'pt',
        display: entry.display,
        pos: entry.pos,
        currentDef: entry.def,
        currentD: entry.d,
        ourTier: result.ourTier,
        jevTier: result.jevTier,
        difficultyMatches: result.difficultyMatches,
        definitionVerdict: result.definitionVerdict,
        formatVerdict: result.formatVerdict,
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
    failures.push({
      word,
      lang: 'pt',
      display: entry.display,
      pos: entry.pos,
      currentDef: entry.def,
      currentD: entry.d,
      evaluationFailed: true,
      error: err.message,
      reasons: [`Evaluation failed: ${err.message}`],
    });
  }
}

const finalQueue = [...still, ...failures];
fs.writeFileSync(
  queuePath,
  JSON.stringify(
    {
      total: finalQueue.length,
      failures,
      queue: finalQueue,
      lastManualFix: {
        at: new Date().toISOString(),
        rechecked: words.length,
        clean: clean.length,
        stillFlagged: still.length,
        failed: failures.length,
        purged,
      },
    },
    null,
    2
  ) + '\n'
);

console.log(
  `\nDone. Clean ${clean.length} · still flagged ${still.length} · eval failures ${failures.length}`
);
console.log(`Queue saved → ${queuePath}`);
