import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import { getLanguageName } from './lexicalValidity';
import { Meaning } from './meanings';
import { realWordPrompt } from './realWordPrompt';
import { Language } from './types';

export const REVIEW_TASK = 'word_review_v8';

/**
 * Jev's `confidence` is the gap between its top two choices, not the chance its pick is right;
 * `probability` is Jev's probability for the picked choice.
 */
type Answer<T extends string> = {
  choice: T;
  confidence: number;
  probability: number;
  probabilities: Record<string, number>;
};

export type YesNo = 'yes' | 'no';
export type WordForm = 'base' | 'conjugated_verb' | 'plural_or_agreement' | 'other';
export type MainMeaning = 'first' | 'second' | 'third' | 'none';
export type Spelling = 'standard' | 'variant';
export type Accuracy = 'accurate' | 'inflected_form' | 'wrong_pos' | 'wrong_meaning' | 'fabricated';
export type Format = 'clean_dictionary' | 'vague_circular' | 'robotic_filler' | 'malformed_syntax';
export type Censor = 'fine' | 'crude' | 'block';
export type FormUse = 'everyday' | 'regional' | 'literary';
export type Rarity = 'regularly' | 'sometimes' | 'rarely';
export type Cefr = 'a1_a2' | 'b1_b2' | 'c1_c2' | 'beyond';
export type Difficulty = 'easy' | 'intermediate' | 'advanced';

/** Questions about the word as a whole. */
export interface WordAnswers {
  realWord: Answer<YesNo>;
  fused: Answer<YesNo>;
  form: Answer<WordForm>;
  /** Only asked when there is more than one meaning. */
  mainMeaning?: Answer<MainMeaning>;
  spelling: Answer<Spelling>;
}

/** Questions about one meaning of the word. */
export interface MeaningAnswers {
  accuracy: Answer<Accuracy>;
  format: Answer<Format>;
  censor: Answer<Censor>;
  formSense: Answer<YesNo>;
  formUse: Answer<FormUse>;
  rarity: Answer<Rarity>;
  cefr: Answer<Cefr>;
}

export interface ReviewedMeaning extends Meaning {
  jev: MeaningAnswers;
}

export interface ReviewResult {
  word: string;
  lang: Language;
  display: string;
  jev: WordAnswers;
  meanings: ReviewedMeaning[];
}

export interface ReviewInput {
  word: string;
  lang: Language;
  display: string;
  meanings: Meaning[];
}

const ALLOWED = {
  realWord: ['yes', 'no'],
  fused: ['no', 'yes'],
  form: ['base', 'conjugated_verb', 'plural_or_agreement', 'other'],
  mainMeaning: ['first', 'second', 'third', 'none'],
  spelling: ['standard', 'variant'],
  accuracy: ['accurate', 'inflected_form', 'wrong_pos', 'wrong_meaning', 'fabricated'],
  format: ['clean_dictionary', 'vague_circular', 'robotic_filler', 'malformed_syntax'],
  censor: ['fine', 'crude', 'block'],
  formSense: ['yes', 'no'],
  formUse: ['everyday', 'regional', 'literary'],
  rarity: ['regularly', 'sometimes', 'rarely'],
  cefr: ['a1_a2', 'b1_b2', 'c1_c2', 'beyond'],
} as const;

const ORDINALS = ['first', 'second', 'third'] as const;

/** "sabía: " when the meanings of a word are spelled differently, so each one shows its own accents. */
function spelledAs(meanings: Meaning[], m: Meaning) {
  return new Set(meanings.map((x) => x.spelling)).size > 1 && m.spelling ? `${m.spelling}: ` : '';
}

function listMeanings(meanings: Meaning[]) {
  return (
    meanings.map((m, i) => `${i + 1}. (${m.pos}) ${spelledAs(meanings, m)}${m.def}`).join('\n') ||
    '(none listed)'
  );
}

export function buildWordQuestions(input: ReviewInput) {
  const lang = getLanguageName(input.lang);
  const w = input.display;
  const real = realWordPrompt(input.lang, w);
  const questions: Record<string, ReturnType<typeof choice>> = {
    realWord: choice(real.prompt, real.choices),
    fused: choice(
      `Is the ${lang} word "${w}" a verb with one or more pronouns attached to it, written as one word?`,
      { no: 'No', yes: 'Yes' }
    ),
    form: choice(`In its most common meaning, what grammatical form is the ${lang} word "${w}"?`, {
      base: 'Base dictionary form: infinitive, singular noun, base adjective, adverb, pronoun, etc.',
      conjugated_verb: 'A conjugated verb: any tense or person other than the infinitive',
      plural_or_agreement: 'A plural, or a gender or number form of a noun or adjective',
      other: 'Something else (contraction, combined form, etc.)',
    }),
    spelling: choice(`Is "${w}" a standard ${lang} spelling?`, {
      standard: `Yes: a standard spelling, including normal regional spellings (like American "liter" and British "litre")`,
      variant: `No: a dated, rare, informal or jokey spelling of another word (like "hallo" for "hello" or "thru" for "through")`,
    }),
  };
  if (input.meanings.length > 1) {
    const options: Record<string, string> = {};
    input.meanings.forEach((m, i) => {
      options[ORDINALS[i]] = `Meaning ${i + 1}: ${spelledAs(input.meanings, m)}${m.def}`;
    });
    options.none = 'None of these is the meaning most people would think of';
    questions.mainMeaning = choice(
      `Which meaning of the ${lang} word "${w}" do most native speakers think of first?`,
      options
    );
  }
  return questions;
}

export function buildMeaningQuestions(input: ReviewInput, meaning: Meaning) {
  const lang = getLanguageName(input.lang);
  const w = meaning.spelling ?? input.display;
  return {
    accuracy: choice(
      `Is this a correct definition of the ${lang} word "${w}" as a ${meaning.pos}? Definition: "${meaning.def}"`,
      {
        accurate: 'Accurate: a correct meaning of the word, with the right part of speech',
        inflected_form:
          'Accurate inflection: a correct gloss of a conjugated, plural or inflected form',
        wrong_pos:
          'Wrong part of speech: the meaning is right but the part of speech is mislabeled',
        wrong_meaning: 'Wrong meaning: describes a different word, a false friend, or is incorrect',
        fabricated: 'Fabricated: the word does not have this meaning at all',
      }
    ),
    format: choice(`How well written is this definition? "${meaning.def}"`, {
      clean_dictionary: 'Clean: concise, natural, professional dictionary entry',
      vague_circular: 'Vague or circular: defines the word with its own root, or is too abstract',
      robotic_filler: 'Robotic filler: template boilerplate such as "The entity representing..."',
      malformed_syntax: 'Malformed: incomplete sentence, dangling fragment or broken punctuation',
    }),
    censor: choice(
      `How should a word game treat the ${lang} word "${w}", meaning: "${meaning.def}"? Think about how most ${lang} speakers would react to seeing it typed on screen.`,
      {
        fine: 'Fine: nothing crude about it, including serious or sensitive words used neutrally (like "murder", "racism" or "genocide") and dated but neutral names for groups of people',
        crude:
          'Potty mouth: swearing, sexual words, crude slang for body parts, bathroom words or insults, even very strong ones',
        block:
          'Block it: a slur that attacks people for their race, ethnicity, nationality, religion, sexuality, gender or disability, or hate speech',
      }
    ),
    formSense: choice(
      `Is "${w}" (${meaning.def}) a ${lang} word form that native speakers would actually use? Some verbs only have some forms in normal use: weather verbs like "to rain" have no "you rain" or "we rain", and some verbs have no imperative or no first person.`,
      {
        yes: 'Yes: a form native speakers use, or would use if the situation came up',
        no: 'No: a grammatically possible form that makes no sense for this word, so native speakers never use it',
      }
    ),
    formUse: choice(
      `How common is the grammatical form "${w}" (${meaning.def}) in everyday ${lang}? Judge the form (tense, mood, person), not how common the word is.`,
      {
        everyday:
          'Everyday: a form used all the time in normal speech and writing (any base form, plural or common tense counts)',
        regional:
          'Regional: a form used only in some regions (like a pronoun or tense used in one country but not others)',
        literary:
          'Literary or rare: a tense or form mostly found in formal writing or literature, rarely used in speech',
      }
    ),
    rarity: choice(
      `How often does a typical adult native ${lang} speaker come across the word "${w}", meaning: "${meaning.def}"? Judge the meaning, not the grammatical form: a conjugated or plural form of a familiar word is as familiar as that word.`,
      {
        regularly: 'Regularly: in everyday conversation, TV, news or books',
        sometimes:
          'Sometimes: they know what it means when they see it, even if they rarely use it themselves',
        rarely: 'Rarely or never: many native speakers would not know what it means',
      }
    ),
    cefr: choice(
      `At what CEFR level would a learner of ${lang} typically learn the word "${w}", in this meaning: "${meaning.def}"? Judge the meaning, not the grammatical form: a conjugated or plural form of a basic word is as easy as that word.`,
      {
        a1_a2:
          'A1–A2 (beginner): core everyday vocabulary taught in the first year (like house, water, eat, happy)',
        b1_b2:
          'B1–B2 (intermediate): every native speaker knows and uses it; a learner meets it in normal conversation, news or TV',
        c1_c2:
          'C1–C2 (advanced): most native speakers know it but rarely use it themselves; formal, literary, technical or less frequent',
        beyond: 'Beyond C2: even native speakers rarely come across it',
      }
    ),
  };
}

function readAnswer<K extends keyof typeof ALLOWED>(
  answers: Record<string, unknown> | undefined,
  key: K
): Answer<(typeof ALLOWED)[K][number]> {
  const answer = answers?.[key] as
    | { choice?: unknown; confidence?: unknown; probabilities?: unknown }
    | undefined;
  const allowed = ALLOWED[key] as readonly string[];
  if (typeof answer?.choice !== 'string' || !allowed.includes(answer.choice)) {
    throw new Error(`Invalid Jev response: unknown ${key}.choice "${String(answer?.choice)}"`);
  }
  const { confidence } = answer;
  if (typeof confidence !== 'number' || !(confidence >= 0 && confidence <= 1)) {
    throw new Error(`Invalid Jev response: ${key}.confidence must be between 0 and 1`);
  }
  const probabilities = (answer.probabilities ?? {}) as Record<string, number>;
  const probability = probabilities[answer.choice];
  if (typeof probability !== 'number' || !(probability >= 0 && probability <= 1)) {
    throw new Error(`Invalid Jev response: ${key}.probabilities must include the picked choice`);
  }
  return {
    choice: answer.choice as (typeof ALLOWED)[K][number],
    confidence,
    probability,
    probabilities,
  };
}

export function parseWordAnswers(
  answers: Record<string, unknown> | undefined,
  meaningCount: number
): WordAnswers {
  return {
    realWord: readAnswer(answers, 'realWord'),
    fused: readAnswer(answers, 'fused'),
    form: readAnswer(answers, 'form'),
    mainMeaning: meaningCount > 1 ? readAnswer(answers, 'mainMeaning') : undefined,
    spelling: readAnswer(answers, 'spelling'),
  };
}

export function parseMeaningAnswers(answers: Record<string, unknown> | undefined): MeaningAnswers {
  return {
    accuracy: readAnswer(answers, 'accuracy'),
    format: readAnswer(answers, 'format'),
    censor: readAnswer(answers, 'censor'),
    formSense: readAnswer(answers, 'formSense'),
    formUse: readAnswer(answers, 'formUse'),
    rarity: readAnswer(answers, 'rarity'),
    cefr: readAnswer(answers, 'cefr'),
  };
}

export async function reviewWordWithJev(
  client: Pick<TypeSafeClient, 'systemOne'>,
  input: ReviewInput,
  model = 'jev-latest'
): Promise<ReviewResult> {
  const language = getLanguageName(input.lang);
  const wordCall = client.systemOne({
    model,
    state: {
      word: input.word,
      display: input.display,
      language,
      meanings: listMeanings(input.meanings),
      task: REVIEW_TASK,
    },
    questions: buildWordQuestions(input),
  });
  const meaningCalls = input.meanings.map((meaning, i) =>
    client.systemOne({
      model,
      state: {
        word: input.word,
        display: input.display,
        language,
        meaningNumber: i + 1,
        partOfSpeech: meaning.pos,
        definition: meaning.def,
        task: REVIEW_TASK,
      },
      questions: buildMeaningQuestions(input, meaning),
    })
  );
  const [word, ...meanings] = await Promise.all([wordCall, ...meaningCalls]);
  const result: ReviewResult = {
    word: input.word,
    lang: input.lang,
    display: input.display,
    jev: parseWordAnswers(word.answers as Record<string, unknown>, input.meanings.length),
    meanings: input.meanings.map((m, i) => ({
      ...m,
      jev: parseMeaningAnswers(meanings[i].answers as Record<string, unknown>),
    })),
  };
  if (result.meanings.length) {
    result.display = result.meanings[mainMeaningIndex(result)].spelling ?? input.display;
  }
  return result;
}

/**
 * Jev is "sure" when its probability for the picked choice reaches the question's threshold;
 * below it the word goes to a maybe bucket.
 */
export const SURE_DEFAULT = 0.6;
export const SURE_BY_QUESTION: Record<string, number> = { obscure: 0.65 };
export const sureAt = (question: string) => SURE_BY_QUESTION[question] ?? SURE_DEFAULT;

/** Collapses a multi-choice answer into yes/no: "yes" is the summed probability of the `yes` choices. */
export function asYesNo(a: Answer<string>, yes: readonly string[]): Answer<YesNo> {
  const p = yes.reduce((sum, c) => sum + (a.probabilities[c] ?? 0), 0);
  const choice: YesNo = p >= 0.5 ? 'yes' : 'no';
  return {
    choice,
    confidence: Math.abs(2 * p - 1),
    probability: choice === 'yes' ? p : 1 - p,
    probabilities: { yes: p, no: 1 - p },
  };
}

const DIFFICULTY: Record<Difficulty, Cefr[]> = {
  easy: ['a1_a2'],
  intermediate: ['b1_b2'],
  advanced: ['c1_c2', 'beyond'],
};

/** A meaning's difficulty: Jev's most likely CEFR band, with C1–C2 and beyond C2 both advanced. */
export function difficultyOf(m: MeaningAnswers): Difficulty {
  const p = (d: Difficulty) => DIFFICULTY[d].reduce((sum, c) => sum + (m.cefr.probabilities[c] ?? 0), 0);
  return (Object.keys(DIFFICULTY) as Difficulty[]).reduce((best, d) => (p(d) > p(best) ? d : best));
}

export type Gate =
  | 'real_word'
  | 'single_word'
  | 'meanings'
  | 'offensive'
  | 'form'
  | 'spelling'
  | 'familiarity';
export type Fate = 'removed' | 'guess_only';

/** One gate's verdict: Jev's bucket, and whether any unsure answer could change the word's fate. */
export interface Step {
  gate: Gate;
  bucket: string;
  sure: boolean;
  /** The yes/no answers behind the bucket. */
  answers: Record<string, Answer<string>>;
  /** Unsure answers that could not change the fate (the bucket label is a guess). */
  unsure: string[];
}

/**
 * What happens to words in each bucket. Buckets not listed pass on to the next gate.
 * This is policy, separate from Jev's buckets, and can change without re-asking Jev.
 */
export const POLICY: Record<Gate, Record<string, Fate>> = {
  real_word: { not_a_word: 'removed' },
  single_word: { fused: 'removed' },
  meanings: {},
  offensive: { block: 'removed', crude: 'guess_only' },
  form: { nonsense: 'removed', literary: 'guess_only', regional: 'guess_only' },
  spelling: {},
  familiarity: { obscure: 'guess_only' },
};

export type Outcome =
  | { kind: 'maybe'; gate: Gate; bucket: string; steps: Step[] }
  | { kind: Fate; gate: Gate; bucket: string; steps: Step[] }
  | { kind: 'answer'; difficulty: Difficulty; steps: Step[] };

/** Index of the main meaning: Jev's pick when it is sure, otherwise Gemini's order. */
export function mainMeaningIndex(r: ReviewResult): number {
  const pick = r.jev.mainMeaning;
  if (pick && pick.probability >= sureAt('mainMeaning') && pick.choice !== 'none') {
    const i = ORDINALS.indexOf(pick.choice);
    if (i < r.meanings.length) {
      return i;
    }
  }
  return 0;
}

const BAD_ACCURACY: Accuracy[] = ['wrong_meaning', 'fabricated'];

interface GateDef {
  gate: Gate;
  answers: (r: ReviewResult) => Record<string, Answer<YesNo>>;
  bucket: (yes: Record<string, boolean>) => string;
}

const mainJev = (r: ReviewResult) => r.meanings[mainMeaningIndex(r)].jev;

const offensiveAnswers = (m: MeaningAnswers) => ({
  block: asYesNo(m.censor, ['block']),
  crude: asYesNo(m.censor, ['crude', 'block']),
});
const offensiveLabel = (y: Record<string, boolean>) =>
  y.block ? 'block' : y.crude ? 'crude' : 'fine';

/** A meaning's offensive bucket, with "?" when any of its answers is unsure. */
export function offensiveBucket(m: MeaningAnswers): string {
  const answers = offensiveAnswers(m);
  const label = offensiveLabel(
    Object.fromEntries(Object.entries(answers).map(([k, a]) => [k, a.choice === 'yes']))
  );
  const unsure = Object.entries(answers).some(([k, a]) => a.probability < sureAt(k));
  return unsure ? `${label}?` : label;
}

/**
 * A form that makes no sense (like "you rain") only counts for conjugated verbs with no other
 * part of speech: the same spelling as a noun or adjective is still a real word, and Jev's
 * answer is unreliable for base forms.
 */
function formAnswers(r: ReviewResult) {
  const main = mainJev(r);
  return {
    ...(r.jev.form.choice === 'conjugated_verb' && r.meanings.every((m) => m.pos === 'verb')
      ? { nonsense: asYesNo(main.formSense, ['no']) }
      : {}),
    literary: asYesNo(main.formUse, ['literary']),
    regional: asYesNo(main.formUse, ['regional']),
  };
}

/** The decision order, after the meanings check. */
const GATES: GateDef[] = [
  {
    gate: 'real_word',
    answers: (r) => ({ realWord: r.jev.realWord }),
    bucket: (y) => (y.realWord ? 'real_word' : 'not_a_word'),
  },
  {
    gate: 'single_word',
    answers: (r) => ({ fused: r.jev.fused }),
    bucket: (y) => (y.fused ? 'fused' : 'single'),
  },
  {
    gate: 'offensive',
    answers: (r) => offensiveAnswers(mainJev(r)),
    bucket: offensiveLabel,
  },
  {
    gate: 'form',
    answers: formAnswers,
    bucket: (y) =>
      y.nonsense ? 'nonsense' : y.literary ? 'literary' : y.regional ? 'regional' : 'everyday',
  },
  {
    gate: 'spelling',
    answers: (r) => ({ variant: asYesNo(r.jev.spelling, ['variant']) }),
    bucket: (y) => (y.variant ? 'variant' : 'standard'),
  },
  {
    gate: 'familiarity',
    answers: (r) => ({ obscure: asYesNo(mainJev(r).rarity, ['rarely']) }),
    bucket: (y) => (y.obscure ? 'obscure' : 'known'),
  },
];

/**
 * Jev answers every question in parallel; an unsure answer only makes the word a maybe
 * when flipping it could change the word's fate under the current policy.
 */
function evaluate(def: GateDef, r: ReviewResult): Step {
  const answers = def.answers(r);
  const keys = Object.keys(answers);
  const yes = Object.fromEntries(keys.map((k) => [k, answers[k].choice === 'yes']));
  const unsure = keys.filter((k) => answers[k].probability < sureAt(k));
  const fates = new Set<string>();
  for (let mask = 0; mask < 2 ** unsure.length; mask++) {
    const flipped = { ...yes };
    unsure.forEach((k, i) => {
      if (mask & (2 ** i)) {
        flipped[k] = !flipped[k];
      }
    });
    fates.add(POLICY[def.gate][def.bucket(flipped)] ?? 'pass');
  }
  return { gate: def.gate, bucket: def.bucket(yes), sure: fates.size === 1, answers, unsure };
}

function meaningsStep(r: ReviewResult): Step {
  const base = { gate: 'meanings' as const, answers: {}, unsure: [] };
  if (r.meanings.length === 0) {
    return { ...base, bucket: 'no_meanings', sure: false };
  }
  const pick = r.jev.mainMeaning;
  if (pick?.choice === 'none' && pick.probability >= sureAt('mainMeaning')) {
    return { ...base, bucket: 'main_missing', sure: false, answers: { mainMeaning: pick } };
  }
  const acc = r.meanings[mainMeaningIndex(r)].jev.accuracy;
  if (BAD_ACCURACY.includes(acc.choice) && acc.probability >= sureAt('accuracy')) {
    return { ...base, bucket: `main_${acc.choice}`, sure: false, answers: { accuracy: acc } };
  }
  return { ...base, bucket: 'ok', sure: true, answers: { accuracy: acc } };
}

/** The decision order: real word, single word, meanings, offensive, form, spelling, familiarity, then difficulty. */
export function decide(r: ReviewResult): Outcome {
  const order: (() => Step)[] = [
    () => evaluate(GATES[0], r),
    () => evaluate(GATES[1], r),
    () => meaningsStep(r),
    ...GATES.slice(2).map((g) => () => evaluate(g, r)),
  ];
  const steps: Step[] = [];
  for (const next of order) {
    const s = next();
    steps.push(s);
    if (!s.sure) {
      return { kind: 'maybe', gate: s.gate, bucket: s.bucket, steps };
    }
    const fate = POLICY[s.gate][s.bucket];
    if (fate) {
      return { kind: fate, gate: s.gate, bucket: s.bucket, steps };
    }
  }
  return { kind: 'answer', difficulty: difficultyOf(mainJev(r)), steps };
}
