/**
 * Wording lab: asks Jev each gate's question several different ways, on the pilot's
 * "maybe" words plus control words Jev was already sure about, to see which wording
 * settles the maybes without flipping the controls.
 *
 * Usage:
 *   npm run eval:dict:wording-lab
 *   npm run eval:dict:wording-lab -- --gate=real_word --controls=30
 *
 * Needs the pilot's evals/artifacts/review_{lang}.json files.
 * Writes evals/artifacts/wording_lab.json and wording_lab.summary.md.
 */
import fs from 'fs';
import path from 'path';
import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import { loadEnv, mapPool } from './cli';
import { getLanguageName } from './lexicalValidity';
import { Meaning } from './meanings';
import {
  buildMeaningQuestions,
  buildWordQuestions,
  decide,
  mainMeaningIndex,
  ReviewResult,
  SURE,
} from './wordReview';

loadEnv();

const ARTIFACTS_DIR = path.resolve(process.cwd(), 'evals', 'artifacts');
const LANGS = ['en', 'es', 'fr', 'it', 'pt'];

type Gate = 'real_word' | 'offensive' | 'slang' | 'obscure';
/** Which way a sure answer pushes the word, using the current policy. */
type Side = 'answer' | 'guess' | 'removed';

interface LabWord {
  lang: string;
  word: string;
  display: string;
  meanings: Meaning[];
  main: Meaning;
  /** maybe = the pilot was unsure at this gate; control = the pilot was sure. */
  role: 'maybe' | 'control';
  /** The pilot's side at this gate (controls only). */
  pilotSide?: Side;
}

interface Variant {
  id: string;
  gate: Gate;
  label: string;
  /** Example words quoted in the wording; must not be pilot words. */
  examples: string[];
  questions: (w: LabWord) => Record<string, ReturnType<typeof choice>>;
  /** Reads Jev's answers into a bucket name, its side, and a confidence. */
  read: (answers: Record<string, { choice: string; confidence: number }>) => {
    bucket: string;
    side: Side;
    confidence: number;
  };
}

const reviewInput = (w: LabWord) => ({
  word: w.word,
  lang: w.lang,
  display: w.display,
  meanings: w.meanings,
});

const one =
  (key: string, sides: Record<string, Side>) =>
  (a: Record<string, { choice: string; confidence: number }>) => ({
    bucket: a[key].choice,
    side: sides[a[key].choice],
    confidence: a[key].confidence,
  });

const REAL_SIDES: Record<string, Side> = {
  yes: 'answer',
  no: 'removed',
  name: 'removed',
  foreign: 'removed',
  abbreviation: 'removed',
  fused: 'removed',
  gibberish: 'removed',
};
const RATING_SIDES: Record<string, Side> = {
  clean: 'answer',
  mild: 'answer',
  vulgar: 'guess',
  slur: 'removed',
};
const SLANG_SIDES: Record<string, Side> = {
  no: 'answer',
  standard: 'answer',
  informal: 'answer',
  yes: 'guess',
  slang: 'guess',
};
const OBSCURE_SIDES: Record<string, Side> = {
  no: 'answer',
  known: 'answer',
  common: 'answer',
  specialist: 'answer',
  yes: 'guess',
  obscure: 'guess',
};

const lang = (w: LabWord) => getLanguageName(w.lang);

const VARIANTS: Variant[] = [
  {
    id: 'real_A',
    gate: 'real_word',
    label: 'Current: six choices with reasons',
    examples: [],
    questions: (w) => ({ realWord: buildWordQuestions(reviewInput(w)).realWord }),
    read: one('realWord', REAL_SIDES),
  },
  {
    id: 'real_B',
    gate: 'real_word',
    label: 'Plain yes / no',
    examples: [],
    questions: (w) => ({
      realWord: choice(`Is "${w.display}" a real ${lang(w)} word?`, { yes: 'Yes', no: 'No' }),
    }),
    read: one('realWord', REAL_SIDES),
  },
  {
    id: 'real_C',
    gate: 'real_word',
    label: 'Yes / no with explicit rules',
    examples: ['pizza', 'tofu'],
    questions: (w) => ({
      realWord: choice(`Is "${w.display}" a real ${lang(w)} word that native speakers use?`, {
        yes: `Yes. All of these count as yes: any standard form of a real word (conjugations, plurals, feminine forms); vulgar, slang, rare or old-fashioned words; loanwords ${lang(w)} speakers commonly use (like "pizza" or "tofu"); words spelled like an English word that also exist in ${lang(w)}; names that also have an ordinary meaning.`,
        no: `No: only a proper name, a foreign word ${lang(w)} speakers do not use, an abbreviation, a typo, or not a word at all.`,
      }),
    }),
    read: one('realWord', REAL_SIDES),
  },
  {
    id: 'real_D',
    gate: 'real_word',
    label: 'Dictionary or spellchecker framing',
    examples: [],
    questions: (w) => ({
      realWord: choice(
        `Would a good ${lang(w)} dictionary or spellchecker accept "${w.display}" as a ${lang(w)} word, counting conjugated, plural and feminine forms?`,
        { yes: 'Yes, it would accept it', no: 'No, it would flag it as not a word' }
      ),
    }),
    read: one('realWord', REAL_SIDES),
  },

  {
    id: 'real_E',
    gate: 'real_word',
    label: 'Yes / no anchored on the main meaning',
    examples: [],
    questions: (w) => ({
      realWord: choice(
        `Is "${w.display}" a real ${lang(w)} word (or a standard form of one) that ${lang(w)} speakers use with this meaning: "${w.main?.def ?? '(no meaning given)'}"?`,
        { yes: 'Yes', no: 'No' }
      ),
    }),
    read: one('realWord', REAL_SIDES),
  },
  {
    id: 'real_F',
    gate: 'real_word',
    label: 'Explicit rules + anchored on the main meaning',
    examples: ['pizza', 'tofu'],
    questions: (w) => ({
      realWord: choice(
        `Is "${w.display}" a real ${lang(w)} word that ${lang(w)} speakers use with this meaning: "${w.main?.def ?? '(no meaning given)'}"?`,
        {
          yes: `Yes. All of these count as yes: any standard form of a real word (conjugations, plurals, feminine forms, verbs with attached pronouns); vulgar, slang, rare or old-fashioned words; loanwords ${lang(w)} speakers commonly use (like "pizza" or "tofu"); words spelled like an English word that also exist in ${lang(w)}; names that also have an ordinary meaning.`,
          no: `No: only a proper name, a foreign word ${lang(w)} speakers do not use, an abbreviation, a typo, or not a word at all.`,
        }
      ),
    }),
    read: one('realWord', REAL_SIDES),
  },
  {
    id: 'fused',
    gate: 'real_word',
    label: 'Second question: verb with attached pronouns?',
    examples: [],
    questions: (w) => ({
      fused: choice(
        `Is the ${lang(w)} word "${w.display}" a verb with one or more pronouns attached to it, written as one word?`,
        { no: 'No', yes: 'Yes' }
      ),
    }),
    read: (a) => ({
      bucket: a.fused.choice === 'yes' ? 'fused' : 'single',
      side: a.fused.choice === 'yes' ? 'removed' : 'answer',
      confidence: a.fused.confidence,
    }),
  },

  {
    id: 'off_A',
    gate: 'offensive',
    label: 'Current: clean / vulgar / slur',
    examples: [],
    questions: (w) => ({ rating: buildMeaningQuestions(reviewInput(w), w.main).rating }),
    read: one('rating', RATING_SIDES),
  },
  {
    id: 'off_B',
    gate: 'offensive',
    label: 'Adds "mild"',
    examples: ['dork', 'jerk', 'booger'],
    questions: (w) => ({
      rating: choice(
        `How offensive is the ${lang(w)} word "${w.display}" when used with this meaning: "${w.main.def}"?`,
        {
          clean:
            'Clean: neutral or polite, fine anywhere including with children. Words that describe people, groups or conditions neutrally are clean.',
          mild: 'Mild: a bit rude or crude but not swearing, such as childish bathroom words or mild insults (like "dork", "jerk" or "booger")',
          vulgar: 'Vulgar: swearing, profanity, or explicit sexual language',
          slur: 'Slur: used to demean a group of people for their race, ethnicity, nationality, religion, sexuality, gender or disability',
        }
      ),
    }),
    read: one('rating', RATING_SIDES),
  },
  {
    id: 'off_C',
    gate: 'offensive',
    label: 'Two yes/no questions: avoid in class? slur?',
    examples: [],
    questions: (w) => ({
      avoid: choice(
        `Would a primary school teacher avoid saying the ${lang(w)} word "${w.display}" in class, when it means: "${w.main.def}"?`,
        { no: 'No, it is fine to say in class', yes: 'Yes, they would avoid it' }
      ),
      slur: choice(
        `Is the ${lang(w)} word "${w.display}", meaning "${w.main.def}", a slur used to demean a group of people for their race, ethnicity, nationality, religion, sexuality, gender or disability?`,
        { no: 'No', yes: 'Yes' }
      ),
    }),
    read: (a) => {
      if (a.slur.choice === 'yes') {
        return { bucket: 'slur', side: 'removed', confidence: a.slur.confidence };
      }
      return a.avoid.choice === 'yes'
        ? {
            bucket: 'avoid',
            side: 'guess',
            confidence: Math.min(a.avoid.confidence, a.slur.confidence),
          }
        : {
            bucket: 'clean',
            side: 'answer',
            confidence: Math.min(a.avoid.confidence, a.slur.confidence),
          };
    },
  },
  {
    id: 'off_D',
    gate: 'offensive',
    label: 'School dictionary label framing',
    examples: [],
    questions: (w) => ({
      rating: choice(
        `How would a careful school dictionary label the ${lang(w)} word "${w.display}" in this meaning: "${w.main.def}"?`,
        {
          clean: 'No label: neutral vocabulary',
          mild: 'Labelled "informal" or "rude" or "derogatory", but not offensive or vulgar',
          vulgar:
            'Labelled "vulgar" or "offensive": swearing, profanity or explicit sexual language',
          slur: 'Labelled "offensive slur": demeans a group of people',
        }
      ),
    }),
    read: one('rating', RATING_SIDES),
  },

  {
    id: 'slang_A',
    gate: 'slang',
    label: 'Current: yes / no',
    examples: [],
    questions: (w) => ({ slang: buildMeaningQuestions(reviewInput(w), w.main).slang }),
    read: one('slang', SLANG_SIDES),
  },
  {
    id: 'slang_B',
    gate: 'slang',
    label: 'Standard / informal / slang',
    examples: ['kid', 'okay', 'dope'],
    questions: (w) => ({
      slang: choice(
        `Which register is the ${lang(w)} word "${w.display}" in this meaning: "${w.main.def}"?`,
        {
          standard: 'Standard: normal vocabulary, fine in writing and formal speech',
          informal:
            'Informal: a casual everyday word that dictionaries mark "informal" or "colloquial" but everyone knows (like "kid" or "okay")',
          slang:
            'Slang: a dictionary would mark it "slang": street, group or trendy language that not everyone uses (like "dope" meaning excellent)',
        }
      ),
    }),
    read: one('slang', SLANG_SIDES),
  },
  {
    id: 'slang_C',
    gate: 'slang',
    label: 'Slang label, not just informal',
    examples: [],
    questions: (w) => ({
      slang: choice(
        `Would a standard ${lang(w)} dictionary label this meaning of "${w.display}" as slang, and not just informal or colloquial? Meaning: "${w.main.def}"`,
        { no: 'No', yes: 'Yes, it is labelled slang' }
      ),
    }),
    read: one('slang', SLANG_SIDES),
  },

  {
    id: 'obs_A',
    gate: 'obscure',
    label: 'Current: yes / no',
    examples: [],
    questions: (w) => ({ obscure: buildWordQuestions(reviewInput(w)).obscure }),
    read: one('obscure', OBSCURE_SIDES),
  },
  {
    id: 'obs_B',
    gate: 'obscure',
    label: 'Judge the meaning, not the form',
    examples: [],
    questions: (w) => ({
      obscure: choice(
        `Would most educated adult ${lang(w)} speakers know what "${w.display}" means? Judge the meaning, not the grammatical form: a rare tense or form of a well-known word still counts as known. Specialist words people meet at school, in the news or in daily life also count as known.`,
        { known: 'Yes, most would know it', obscure: 'No, most would not know it' }
      ),
    }),
    read: one('obscure', OBSCURE_SIDES),
  },
  {
    id: 'obs_C',
    gate: 'obscure',
    label: 'Would an average adult know it?',
    examples: [],
    questions: (w) => ({
      obscure: choice(
        `Would an average adult native ${lang(w)} speaker know what "${w.display}" means?`,
        {
          known: 'Yes',
          obscure: 'No',
        }
      ),
    }),
    read: one('obscure', OBSCURE_SIDES),
  },
  {
    id: 'obs_D',
    gate: 'obscure',
    label: 'Common / specialist but known / obscure',
    examples: ['vaccine', 'referee'],
    questions: (w) => ({
      obscure: choice(`How familiar is the ${lang(w)} word "${w.display}" to native speakers?`, {
        common: 'Common: an everyday word most people know',
        specialist:
          'Specialist but known: a technical, scientific, legal, food or sports word most educated adults still recognise (like "vaccine" or "referee")',
        obscure:
          'Obscure: archaic, rare, regional or expert jargon most native speakers would not recognise',
      }),
    }),
    read: one('obscure', OBSCURE_SIDES),
  },
  {
    id: 'obs_E',
    gate: 'obscure',
    label: 'Three-way, judging the meaning not the form',
    examples: ['vaccine', 'referee'],
    questions: (w) => ({
      obscure: choice(
        `How familiar is the meaning of the ${lang(w)} word "${w.display}" to native speakers? Judge the meaning, not the grammatical form: a rare tense or form of a well-known word counts as that word.`,
        {
          common: 'Common: an everyday word most people know',
          specialist:
            'Specialist but known: a technical, scientific, legal, food or sports word most educated adults still recognise (like "vaccine" or "referee")',
          obscure:
            'Obscure: archaic, rare, regional or expert jargon most native speakers would not recognise',
        }
      ),
    }),
    read: one('obscure', OBSCURE_SIDES),
  },
];

/** The pilot's sure side at a gate, or null when the pilot was unsure there. */
function pilotSide(r: ReviewResult, gate: Gate): Side | null {
  const main = r.meanings[mainMeaningIndex(r)];
  const a =
    gate === 'real_word'
      ? r.jev.realWord
      : gate === 'obscure'
        ? r.jev.obscure
        : gate === 'offensive'
          ? main?.jev.rating
          : main?.jev.slang;
  if (!a || a.confidence < SURE) {
    return null;
  }
  const sides = {
    real_word: REAL_SIDES,
    offensive: RATING_SIDES,
    slang: SLANG_SIDES,
    obscure: OBSCURE_SIDES,
  }[gate];
  return sides[a.choice];
}

function seededPick<T>(items: T[], count: number, seed: string): T[] {
  let h = 2166136261;
  for (const ch of seed) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  }
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

function buildTestSet(controlsPerSide: number) {
  const all = LANGS.flatMap((l) => {
    const file = path.join(ARTIFACTS_DIR, `review_${l}.json`);
    return Object.values(
      (JSON.parse(fs.readFileSync(file, 'utf8')) as { results: Record<string, ReviewResult> })
        .results
    );
  });
  const toLab = (r: ReviewResult, role: LabWord['role'], side?: Side): LabWord => ({
    lang: r.lang,
    word: r.word,
    display: r.display,
    meanings: r.meanings,
    main: r.meanings[mainMeaningIndex(r)],
    role,
    pilotSide: side,
  });

  const sets = {} as Record<Gate, LabWord[]>;
  for (const gate of ['real_word', 'offensive', 'slang', 'obscure'] as Gate[]) {
    const maybes = all.filter((r) => {
      const o = decide(r);
      return o.kind === 'maybe' && o.gate === gate;
    });
    const eligible = all.filter(
      (r) => (gate === 'real_word' || r.meanings.length > 0) && !maybes.includes(r)
    );
    const controls: LabWord[] = [];
    const sides = [
      ...new Set(eligible.map((r) => pilotSide(r, gate)).filter((s): s is Side => Boolean(s))),
    ];
    for (const side of sides) {
      const pool = eligible.filter((r) => pilotSide(r, gate) === side);
      controls.push(
        ...seededPick(pool, controlsPerSide, `${gate}-${side}`).map((r) =>
          toLab(r, 'control', side)
        )
      );
    }
    sets[gate] = [...maybes.map((r) => toLab(r, 'maybe')), ...controls];
  }
  return { sets, pilotWords: new Set(all.map((r) => r.word.toLowerCase())) };
}

export interface LabRow {
  variant: string;
  gate: Gate;
  lang: string;
  word: string;
  display: string;
  role: LabWord['role'];
  pilotSide?: Side;
  def: string;
  bucket: string;
  side: Side;
  confidence: number;
}

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v = ''] = a.replace(/^--/, '').split('=');
      return [k, v];
    })
  );
  const controlsPerSide = Number(args.controls || 20);
  const onlyGate = args.gate as Gate | undefined;
  const onlyVariants = args.variants ? new Set(args.variants.split(',')) : null;
  const picked = VARIANTS.filter(
    (v) => (!onlyGate || v.gate === onlyGate) && (!onlyVariants || onlyVariants.has(v.id))
  );
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing TYPESAFE_API_KEY in .env.local');
  }

  const { sets, pilotWords } = buildTestSet(controlsPerSide);
  for (const v of VARIANTS) {
    const leaked = v.examples.filter((e) => pilotWords.has(e.toLowerCase()));
    if (leaked.length) {
      throw new Error(`${v.id} quotes pilot words as examples: ${leaked.join(', ')}`);
    }
  }

  const jobs = picked.flatMap((v) => sets[v.gate].map((w) => ({ v, w })));
  console.log(`\n🧪 Wording lab: ${jobs.length} Jev calls`);
  for (const gate of Object.keys(sets) as Gate[]) {
    const maybes = sets[gate].filter((w) => w.role === 'maybe').length;
    console.log(`  ${gate}: ${maybes} maybe + ${sets[gate].length - maybes} control words`);
  }

  const client = new TypeSafeClient({ apiKey });
  const rows: LabRow[] = [];
  const failures: string[] = [];
  const start = Date.now();
  await mapPool(
    jobs,
    10,
    async ({ v, w }) => {
      try {
        const res = await client.systemOne({
          model: 'jev-latest',
          state: {
            word: w.word,
            display: w.display,
            language: getLanguageName(w.lang),
            meanings: w.meanings.map((m, i) => `${i + 1}. (${m.pos}) ${m.def}`).join('\n'),
            partOfSpeech: w.main?.pos,
            definition: w.main?.def,
            task: `wording_lab_${v.id}`,
          },
          questions: v.questions(w),
        });
        const read = v.read(res.answers as Record<string, { choice: string; confidence: number }>);
        rows.push({
          variant: v.id,
          gate: v.gate,
          lang: w.lang,
          word: w.word,
          display: w.display,
          role: w.role,
          pilotSide: w.pilotSide,
          def: w.main?.def ?? '',
          ...read,
        });
      } catch (err) {
        failures.push(`${v.id} ${w.lang}/${w.word}: ${err instanceof Error ? err.message : err}`);
      }
    },
    (done, total) => {
      if (done % 50 === 0 || done === total) {
        process.stdout.write(
          `\r  ${done}/${total} (${((Date.now() - start) / 1000).toFixed(0)}s)   `
        );
      }
    }
  );

  const out = path.join(ARTIFACTS_DIR, 'wording_lab.json');
  const ran = new Set(picked.map((v) => v.id));
  const previous: LabRow[] = fs.existsSync(out)
    ? (JSON.parse(fs.readFileSync(out, 'utf8')) as { rows: LabRow[] }).rows.filter(
        (r) => !ran.has(r.variant)
      )
    : [];
  const allRows = [...previous, ...rows];
  fs.writeFileSync(
    out,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), sure: SURE, variants: VARIANTS.map(({ id, gate, label }) => ({ id, gate, label })), rows: allRows }, null, 2)}\n`
  );

  let md = `# Jev wording lab\n\nSure = confidence ${SURE} or higher.\n\n| Variant | Maybes settled | Settled to answer / guess / removed | Controls flipped |\n| :--- | ---: | :--- | ---: |\n`;
  for (const v of VARIANTS.filter((x) => allRows.some((r) => r.variant === x.id))) {
    const mine = allRows.filter((r) => r.variant === v.id);
    const maybes = mine.filter((r) => r.role === 'maybe');
    const settled = maybes.filter((r) => r.confidence >= SURE);
    const by = (s: Side) => settled.filter((r) => r.side === s).length;
    const controls = mine.filter((r) => r.role === 'control');
    const flipped = controls.filter((r) => r.confidence >= SURE && r.side !== r.pilotSide);
    md += `| ${v.id}: ${v.label} | ${settled.length}/${maybes.length} | ${by('answer')} / ${by('guess')} / ${by('removed')} | ${flipped.length}/${controls.length}${flipped.length ? ` (${flipped.map((r) => r.display).join(', ')})` : ''} |\n`;
  }
  fs.writeFileSync(out.replace(/\.json$/, '.summary.md'), md);
  console.log(`\n\n${md}`);
  if (failures.length) {
    console.log(`⚠️  ${failures.length} failed:\n${failures.slice(0, 10).join('\n')}`);
  }
}

main().catch((err) => {
  console.error('\n❌ Wording lab failed:', err);
  process.exit(1);
});
