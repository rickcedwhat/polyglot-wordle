/**
 * Builds the word-trees page (evals/artifacts/word-trees.html) from the review, tie-breaker,
 * coverage and override artifacts. Served by server.mjs (npm run eval:dict:trees).
 */
import fs from 'fs';
import path from 'path';
import { Final, finalOutcome } from '../overrides';
import {
  asYesNo,
  buildMeaningQuestions,
  buildWordQuestions,
  mainMeaningIndex,
  MeaningAnswers,
  offensiveBucket,
  REMOVE_AT,
  ReviewInput,
  ReviewResult,
  SURE_BY_QUESTION,
  SURE_DEFAULT,
  sureAt,
} from '../wordReview';

const TEMPLATE = path.resolve('evals/dictionary/wordTrees/template.html');
const PAGE = path.resolve('evals/artifacts/word-trees.html');

type Leaf = { leaf: string; label: string; note?: string };
type Q = { key: string; q: string; note?: string; branches: Record<string, Q | Leaf> };
type Tree = {
  id: string;
  title: string;
  note: string;
  mainMeaning?: boolean;
  computed?: boolean;
  root: Q;
};
type Ans = {
  choice: string;
  probability: number;
  probabilities?: Record<string, number>;
  sure?: boolean;
};

const L = (leaf: string, label: string, note?: string): Leaf => ({ leaf, label, note });
const pct = (x: number) => `${Math.round(x * 100)}%`;
const MISSING_FLAG_AT = 0.8;

const TREES: Tree[] = [
  {
    id: 'verdict',
    computed: true,
    title: 'Fate',
    note: 'Where the word ends up: a manual override, else the Gemini tie-breaker for unsure words, else Jev.',
    root: {
      key: 'verdict',
      q: 'Fate',
      branches: {
        answer: L('answer', 'Answer'),
        guess_only: L('guess_only', 'Guess only'),
        removed: L('removed', 'Not guessable'),
        maybe: L('maybe', 'Still unsure'),
      },
    },
  },
  {
    id: 'validity',
    title: 'Validity',
    note: `Real word asked in the word's own language. Removed only when Jev is at least ${pct(REMOVE_AT)} sure it isn't a word; never sent to the tie-breaker.`,
    root: {
      key: 'realWord',
      q: 'Real word?',
      branches: {
        yes: {
          key: 'fused',
          q: 'Pronouns attached?',
          branches: {
            no: L('single', 'Single word'),
            yes: L(
              'fused',
              'Fused form',
              'A verb with pronouns attached, written as one word (darti, farlo).'
            ),
          },
        },
        no: L(
          'not_a_word',
          'Not a word',
          'A name, a foreign word, an abbreviation, a typo or not a word.'
        ),
      },
    },
  },
  {
    id: 'meanings',
    computed: true,
    title: 'Meanings',
    note: "Gemini's meanings, checked by Jev. No meanings means the word is removed.",
    root: {
      key: 'meaningCheck',
      q: 'Main meaning OK?',
      branches: {
        ok: L('ok', 'OK'),
        none: L('none', 'No meanings'),
        missing: L('missing', 'Main meaning missing'),
        wrong: L('wrong', 'Main meaning wrong'),
        made_up: L('made_up', 'Main meaning made up'),
      },
    },
  },
  {
    id: 'coverage',
    title: 'Missing meaning?',
    note: `Separate check: does the list include the meaning most speakers think of first? Flagged at ${pct(MISSING_FLAG_AT)}; only a flag, it doesn't change the fate.`,
    root: {
      key: 'coverage',
      q: 'Main meaning listed?',
      branches: { listed: L('listed', 'Listed'), missing: L('missing', 'Flag: may be missing') },
    },
  },
  {
    id: 'censor',
    title: 'Offensive',
    mainMeaning: true,
    note: 'Main meaning. Block → not guessable; potty mouth → guess only.',
    root: {
      key: 'censor',
      q: 'OK in a word game?',
      branches: {
        fine: L('fine', 'Fine'),
        crude: L('crude', 'Potty mouth'),
        block: L('block', 'Block it'),
      },
    },
  },
  {
    id: 'form',
    title: 'Form',
    note: `Grammatical form. A conjugated verb that makes no sense ("you rain") is removed, only when Jev is at least ${pct(REMOVE_AT)} sure and the word has no other part of speech.`,
    root: {
      key: 'form',
      q: 'Grammatical form?',
      branches: {
        base: L('base', 'Base form'),
        conjugated_verb: {
          key: 'formSense',
          q: 'Makes sense?',
          branches: { yes: L('sensible', 'Conjugated verb'), no: L('nonsense', 'Nonsense form') },
        },
        plural_or_agreement: L('plural', 'Plural or agreement'),
        other: L('other', 'Other'),
      },
    },
  },
  {
    id: 'formUse',
    title: 'Form use',
    mainMeaning: true,
    note: 'Main meaning. Regional and literary forms are guess only.',
    root: {
      key: 'formUse',
      q: 'How common is the form?',
      branches: {
        everyday: L('everyday', 'Everyday'),
        regional: L('regional', 'Regional'),
        literary: L('literary', 'Literary or rare'),
      },
    },
  },
  {
    id: 'spelling',
    title: 'Spelling',
    note: 'Standard spelling (regional ones like liter/litre count), or a dated, rare, informal or jokey spelling of another word (hallo, thru)? No rule uses this.',
    root: {
      key: 'spelling',
      q: 'Standard spelling?',
      branches: {
        standard: L('standard', 'Standard'),
        variant: L('variant', 'Variant of another word'),
      },
    },
  },
  {
    id: 'difficulty',
    title: 'Difficulty',
    mainMeaning: true,
    note: '"Rarely or never" is obscure, so guess only. Otherwise the CEFR level of the main meaning (C1–C2 and beyond are both advanced).',
    root: {
      key: 'obscure',
      q: 'Natives rarely come across it?',
      branches: {
        yes: L('obscure', 'Obscure', 'Many native speakers would not know what it means.'),
        no: {
          key: 'cefr',
          q: 'CEFR level?',
          branches: {
            a1_a2: L('easy', 'Easy', 'A1–A2.'),
            b1_b2: L('intermediate', 'Intermediate', 'B1–B2.'),
            c1_c2: L('advanced', 'Advanced', 'C1 and up.'),
          },
        },
      },
    },
  },
  {
    id: 'others',
    computed: true,
    title: 'Other meanings',
    mainMeaning: true,
    note: 'Is another meaning more offensive than the main one? The main meaning still decides.',
    root: {
      key: 'others',
      q: 'Other meanings?',
      branches: {
        single: L('single', 'Only one meaning'),
        same: L('same', 'None worse than main'),
        worse: L('worse', 'A more offensive other meaning'),
      },
    },
  },
];

const rank = (m: MeaningAnswers) =>
  ({ fine: 0, crude: 1, block: 2 })[offensiveBucket(m).replace('?', '') as 'fine'];

/** Jev's yes/no where only a confident "remove" answer counts; shown with Jev's real probability. */
function removeOnlyIfSure(a: Ans, remove: string, keep: string): Ans {
  const p = a.probabilities?.[remove] ?? 0;
  const choice = p >= REMOVE_AT ? remove : keep;
  return {
    choice,
    probability: a.probabilities?.[choice] ?? 0,
    probabilities: a.probabilities,
    sure: true,
  };
}

function answers(r: ReviewResult, coverage?: Ans): Record<string, Ans> {
  const out: Record<string, Ans> = {
    realWord: removeOnlyIfSure(r.jev.realWord, 'no', 'yes'),
    fused: r.jev.fused,
    form: r.jev.form,
    spelling: r.jev.spelling,
  };
  if (coverage) {
    out.coverage = removeOnlyIfSure(
      { ...coverage, probabilities: coverage.probabilities },
      'missing',
      'listed'
    );
    if (out.coverage.choice === 'missing') {
      out.coverage.probability = coverage.probabilities!.missing;
    }
  }
  const sure = { probability: 1, sure: true };
  if (!r.meanings.length) {
    out.meaningCheck = { choice: 'none', ...sure };
    return out;
  }
  const mi = mainMeaningIndex(r);
  const main = r.meanings[mi].jev;
  Object.assign(out, {
    censor: main.censor,
    formUse: main.formUse,
    formSense: r.meanings.every((m) => m.pos === 'verb')
      ? removeOnlyIfSure(main.formSense, 'no', 'yes')
      : { choice: 'yes', ...sure },
    obscure: asYesNo(main.rarity, ['rarely']),
    cefr: merge(main.cefr, { a1_a2: ['a1_a2'], b1_b2: ['b1_b2'], c1_c2: ['c1_c2', 'beyond'] }),
  });
  const pick = r.jev.mainMeaning;
  const acc = main.accuracy;
  out.meaningCheck = {
    ...sure,
    choice:
      pick?.choice === 'none' && pick.probability >= sureAt('mainMeaning')
        ? 'missing'
        : acc.choice === 'wrong_meaning' && acc.probability >= sureAt('accuracy')
          ? 'wrong'
          : acc.choice === 'fabricated' && acc.probability >= sureAt('accuracy')
            ? 'made_up'
            : 'ok',
  };
  const others = r.meanings.filter((_, i) => i !== mi);
  out.others = {
    ...sure,
    choice: !others.length
      ? 'single'
      : others.some((m) => rank(m.jev) > rank(main))
        ? 'worse'
        : 'same',
  };
  return out;
}

/** Walks one tree along Jev's picks: the visited node ids, the leaf, and whether any pick on the way was unsure. */
function walk(t: Tree, a: Record<string, Ans>) {
  const visited: string[] = [];
  const conf: [string, string, number, number][] = [];
  if (t.mainMeaning && !a.censor) {
    return { path: [], leaf: `${t.id}/na`, conf, unsure: false };
  }
  let node: Q | Leaf = t.root;
  let unsure = false;
  while ('key' in node) {
    const ans: Ans | undefined = a[node.key];
    if (!ans) {
      return { path: visited, leaf: `${t.id}/na`, conf, unsure };
    }
    visited.push(`${t.id}/q:${node.key}`);
    const at = ans.sure ? 0 : sureAt(node.key);
    conf.push([node.q, ans.choice, Math.round(ans.probability * 100), Math.round(at * 100)]);
    if (ans.probability < at) {
      unsure = true;
    }
    node = node.branches[ans.choice];
  }
  return { path: visited, leaf: `${t.id}/${node.leaf}`, conf, unsure };
}

const WHY: Record<string, string> = {
  not_a_word: `Jev is at least ${pct(REMOVE_AT)} sure it isn't a real word`,
  fused: "it's a verb with pronouns attached",
  no_meanings: 'Gemini found no meanings for it in this language',
  block: 'its main meaning is a slur or hate speech',
  crude: 'its main meaning is potty mouth',
  nonsense: 'it\'s a verb form that makes no sense ("you rain")',
  literary: "it's a literary or rare grammatical form",
  regional: "it's a regional grammatical form",
  obscure: "many native speakers wouldn't know what it means",
};
const FATE_TEXT: Record<string, string> = {
  answer: 'an answer',
  guess_only: 'guess only',
  removed: 'not guessable',
  maybe: 'still unsure',
};

function verdict(f: Final) {
  const o = f.outcome;
  const fate = o.kind;
  const doubts: string[] = [];
  let why: string;
  if ('manual' in o) {
    why = `Manual override (${o.manual.date}): ${o.manual.reason}`;
    const auto =
      f.auto.kind === 'answer' ? `an answer (${f.auto.difficulty})` : FATE_TEXT[f.auto.kind];
    doubts.push(`Without the override it would be ${auto}.`);
  } else if (o.kind === 'answer') {
    why = 'It passes every rule.';
  } else if (o.kind === 'maybe') {
    why = `Jev is unsure at the ${o.gate} check (${o.bucket}) and no tie-breaker applies.`;
  } else {
    why = `It's ${FATE_TEXT[fate]} because ${WHY[o.bucket] ?? `${o.gate}: ${o.bucket}`}.`;
  }
  for (const x of f.ruling?.rulings ?? []) {
    doubts.push(
      `Tie-breaker: Jev said ${x.question} "${x.jev}" at ${Math.round(x.jevProbability * 100)}%; Gemini said "${x.gemini}". ${x.reason}`
    );
  }
  const difficulty = o.kind === 'answer' ? o.difficulty : null;
  return {
    path: ['verdict/q:verdict'],
    leaf: `verdict/${fate}`,
    conf: [] as [string, string, number, number][],
    unsure: false,
    why,
    doubts,
    difficulty,
    source: f.source,
  };
}

const LANGS = ['en', 'es', 'fr', 'it', 'pt'];

/** Collapses Jev's probabilities onto fewer choices and picks the most likely one. */
function merge(
  x: { probabilities: Record<string, number> },
  groups: Record<string, string[]>
): Ans {
  const probabilities = Object.fromEntries(
    Object.entries(groups).map(([k, cs]) => [
      k,
      cs.reduce((s, c) => s + (x.probabilities[c] ?? 0), 0),
    ])
  );
  const choice = Object.entries(probabilities).sort((p, q) => q[1] - p[1])[0][0];
  return { choice, probability: probabilities[choice], probabilities };
}

/** Question templates per language, with {{word}}, {{pos}} and {{def}} placeholders filled in the browser. */
type Tpl = { instructions: string; criteria: Record<string, string> };
const questions: Record<string, Record<string, Tpl>> = {};
for (const lang of LANGS) {
  const input = {
    word: '{{word}}',
    display: '{{word}}',
    lang,
    meanings: [
      { pos: '{{pos}}', def: '{{def1}}' },
      { pos: '{{pos}}', def: '{{def2}}' },
    ],
  } as unknown as ReviewInput;
  const meaningQs = buildMeaningQuestions(input, {
    pos: '{{pos}}',
    def: '{{def}}',
  } as never) as unknown as Record<string, Tpl>;
  questions[lang] = {
    ...(buildWordQuestions(input) as unknown as Record<string, Tpl>),
    ...meaningQs,
    obscure: meaningQs.rarity,
    coverage: {
      instructions:
        'A word game lists these meanings for the word "{{word}}": (its meanings). Is the meaning most native speakers would think of first in this list?',
      criteria: {
        listed:
          'Yes: the meaning most people think of first is listed (rarer meanings may be missing)',
        missing: 'No: the meaning most people think of first is missing from the list',
      },
    },
  };
}

const read = (f: string) =>
  fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')).results : {};
const words: Record<string, unknown[]> = {};
for (const lang of LANGS) {
  const results: Record<string, ReviewResult> = read(`evals/artifacts/review_${lang}.json`);
  const settled = read(`evals/artifacts/settle_${lang}.json`);
  const coverage = read(`evals/artifacts/coverage_${lang}.json`);
  const pilot = new Set(Object.keys(read(`evals/artifacts/labels_${lang}.json`)));
  words[lang] = Object.values(results)
    .sort((a, b) => a.display.localeCompare(b.display))
    .map((r) => {
      const a = answers(r, coverage[r.word]);
      const f = finalOutcome(r, settled);
      const trees = Object.fromEntries(
        TREES.map((t) => [t.id, t.id === 'verdict' ? verdict(f) : walk(t, a)])
      );
      const pipeline = verdict({ ...f, outcome: f.auto, source: f.ruling ? 'gemini' : 'jev' });
      const mi = r.meanings.length ? mainMeaningIndex(r) : 0;
      const raw: Record<string, [string, number]> = {};
      for (const [k, v] of Object.entries(r.jev)) {
        if (v) {
          raw[k] = [v.choice, Math.round(v.probability * 100)];
        }
      }
      if (r.meanings.length) {
        for (const [k, v] of Object.entries(r.meanings[mi].jev)) {
          raw[k] = [v.choice, Math.round(v.probability * 100)];
        }
      }
      if (raw.rarity) {
        raw.obscure = raw.rarity;
      }
      if (coverage[r.word]) {
        raw.coverage = [coverage[r.word].choice, Math.round(coverage[r.word].probability * 100)];
      }
      return {
        w: r.display,
        key: r.word,
        pipeline: {
          fate: f.auto.kind,
          difficulty: pipeline.difficulty,
          why: pipeline.why,
          doubts: pipeline.doubts,
          source: pipeline.source,
        },
        batch: pilot.has(r.word) ? 'pilot' : 'extended',
        trees,
        main: mi,
        meanings: r.meanings.map((m) => ({ pos: m.pos, def: m.def, spelling: m.spelling })),
        raw,
      };
    });
}

const html = fs
  .readFileSync(TEMPLATE, 'utf8')
  .replace('__DATA__', () =>
    JSON.stringify({
      trees: TREES,
      words,
      sure: { default: SURE_DEFAULT, ...SURE_BY_QUESTION },
      questions,
    })
  );
fs.mkdirSync(path.dirname(PAGE), { recursive: true });
fs.writeFileSync(PAGE, html);
console.log(`wrote ${PAGE}`);
