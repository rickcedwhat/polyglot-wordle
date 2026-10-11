import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import { getLanguageName } from './lexicalValidity';
import { Meaning } from './meanings';
import { realWordPrompt } from './realWordPrompt';
import { Language } from './types';

export const REVIEW_TASK = 'word_review_v3';

type Answer<T extends string> = { choice: T; confidence: number };

export type YesNo = 'yes' | 'no';
export type WordForm = 'base' | 'conjugated_verb' | 'plural_or_agreement' | 'other';
export type MainMeaning = 'first' | 'second' | 'third' | 'none';
export type WordLevel = 'easy' | 'medium' | 'hard';
export type Accuracy = 'accurate' | 'inflected_form' | 'wrong_pos' | 'wrong_meaning' | 'fabricated';
export type Format = 'clean_dictionary' | 'vague_circular' | 'robotic_filler' | 'malformed_syntax';

/** Questions about the word as a whole. */
export interface WordAnswers {
  realWord: Answer<YesNo>;
  fused: Answer<YesNo>;
  form: Answer<WordForm>;
  /** Only asked when there is more than one meaning. */
  mainMeaning?: Answer<MainMeaning>;
  known: Answer<YesNo>;
  specialist: Answer<YesNo>;
  level: Answer<WordLevel>;
}

/** Questions about one meaning of the word. Each bucket is its own yes/no question. */
export interface MeaningAnswers {
  accuracy: Answer<Accuracy>;
  format: Answer<Format>;
  rude: Answer<YesNo>;
  vulgar: Answer<YesNo>;
  slur: Answer<YesNo>;
  slang: Answer<YesNo>;
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
  known: ['yes', 'no'],
  specialist: ['no', 'yes'],
  level: ['easy', 'medium', 'hard'],
  accuracy: ['accurate', 'inflected_form', 'wrong_pos', 'wrong_meaning', 'fabricated'],
  format: ['clean_dictionary', 'vague_circular', 'robotic_filler', 'malformed_syntax'],
  rude: ['no', 'yes'],
  vulgar: ['no', 'yes'],
  slur: ['no', 'yes'],
  slang: ['no', 'yes'],
} as const;

const ORDINALS = ['first', 'second', 'third'] as const;

function listMeanings(meanings: Meaning[]) {
  return meanings.map((m, i) => `${i + 1}. (${m.pos}) ${m.def}`).join('\n') || '(none listed)';
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
    known: choice(
      `Would most native ${lang} speakers know what "${w}" means? Judge the meaning, not the grammatical form: a rare tense or form of a well-known word counts as known. Technical, scientific, legal, food or sports words most educated adults recognise (like "vaccine" or "referee") count as known. Archaic, rare, regional or expert jargon does not.`,
      { yes: 'Yes', no: 'No' }
    ),
    specialist: choice(
      `Is the ${lang} word "${w}" mainly a technical, scientific, legal, food or sports term, rather than everyday vocabulary?`,
      { no: 'No', yes: 'Yes' }
    ),
    level: choice(
      `How hard is the ${lang} word "${w}" for someone learning ${lang}? Judge its most common meaning.`,
      {
        easy: 'Everyday word that beginners learn early and every native speaker uses (e.g. house, water, happy)',
        medium:
          'Familiar conversational word an intermediate learner meets in normal conversation, news or TV',
        hard: 'Formal, literary, technical or less frequent word that an educated adult native speaker still knows',
      }
    ),
  };
  if (input.meanings.length > 1) {
    const options: Record<string, string> = {};
    input.meanings.forEach((m, i) => {
      options[ORDINALS[i]] = `Meaning ${i + 1}: ${m.def}`;
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
  const w = input.display;
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
    rude: choice(
      `Is the ${lang} word "${w}", used with this meaning, at all rude, crude or offensive? Even mild rudeness counts, such as childish bathroom words or mild insults (like "dork", "jerk" or "booger"). Words that describe people, groups or conditions neutrally do not. Meaning: "${meaning.def}"`,
      { no: 'No', yes: 'Yes' }
    ),
    vulgar: choice(
      `Is the ${lang} word "${w}", used with this meaning, vulgar: swearing, profanity, or explicit sexual language? Mild rudeness such as bathroom words or mild insults does not count. Meaning: "${meaning.def}"`,
      { no: 'No', yes: 'Yes' }
    ),
    slur: choice(
      `Is the ${lang} word "${w}", used with this meaning, a slur: used to demean a group of people for their race, ethnicity, nationality, religion, sexuality, gender or disability? Neutral words that describe people, groups or conditions are not slurs. Meaning: "${meaning.def}"`,
      { no: 'No', yes: 'Yes' }
    ),
    slang: choice(
      `Would a standard ${lang} dictionary label this meaning of "${w}" as slang, and not just informal or colloquial? Meaning: "${meaning.def}"`,
      { no: 'No', yes: 'Yes, it is labelled slang' }
    ),
  };
}

function readAnswer<K extends keyof typeof ALLOWED>(
  answers: Record<string, unknown> | undefined,
  key: K
): Answer<(typeof ALLOWED)[K][number]> {
  const answer = answers?.[key] as { choice?: unknown; confidence?: unknown } | undefined;
  const allowed = ALLOWED[key] as readonly string[];
  if (typeof answer?.choice !== 'string' || !allowed.includes(answer.choice)) {
    throw new Error(`Invalid Jev response: unknown ${key}.choice "${String(answer?.choice)}"`);
  }
  const { confidence } = answer;
  if (typeof confidence !== 'number' || !(confidence >= 0 && confidence <= 1)) {
    throw new Error(`Invalid Jev response: ${key}.confidence must be between 0 and 1`);
  }
  return { choice: answer.choice as (typeof ALLOWED)[K][number], confidence };
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
    known: readAnswer(answers, 'known'),
    specialist: readAnswer(answers, 'specialist'),
    level: readAnswer(answers, 'level'),
  };
}

export function parseMeaningAnswers(answers: Record<string, unknown> | undefined): MeaningAnswers {
  return {
    accuracy: readAnswer(answers, 'accuracy'),
    format: readAnswer(answers, 'format'),
    rude: readAnswer(answers, 'rude'),
    vulgar: readAnswer(answers, 'vulgar'),
    slur: readAnswer(answers, 'slur'),
    slang: readAnswer(answers, 'slang'),
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
  return {
    word: input.word,
    lang: input.lang,
    display: input.display,
    jev: parseWordAnswers(word.answers as Record<string, unknown>, input.meanings.length),
    meanings: input.meanings.map((m, i) => ({
      ...m,
      jev: parseMeaningAnswers(meanings[i].answers as Record<string, unknown>),
    })),
  };
}

/** Jev at or above this confidence is "sure"; below it the word goes to a maybe bucket. */
export const SURE = 0.7;

export type Gate = 'real_word' | 'single_word' | 'meanings' | 'offensive' | 'slang' | 'familiarity';
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
  offensive: { vulgar: 'guess_only', slur: 'removed' },
  slang: { slang: 'guess_only' },
  familiarity: { obscure: 'guess_only' },
};

export type Outcome =
  | { kind: 'maybe'; gate: Gate; bucket: string; steps: Step[] }
  | { kind: Fate; gate: Gate; bucket: string; steps: Step[] }
  | { kind: 'answer'; level: WordLevel; steps: Step[] };

/** Index of the main meaning: Jev's pick when it is sure, otherwise Gemini's order. */
export function mainMeaningIndex(r: ReviewResult): number {
  const pick = r.jev.mainMeaning;
  if (pick && pick.confidence >= SURE && pick.choice !== 'none') {
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

/** A meaning's offensive bucket, with "?" when any of its answers is unsure. */
export function offensiveBucket(m: MeaningAnswers): string {
  const { rude, vulgar, slur } = m;
  const label =
    slur.choice === 'yes'
      ? 'slur'
      : vulgar.choice === 'yes'
        ? 'vulgar'
        : rude.choice === 'yes'
          ? 'mild'
          : 'clean';
  return [rude, vulgar, slur].some((a) => a.confidence < SURE) ? `${label}?` : label;
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
    answers: (r) => {
      const { rude, vulgar, slur } = mainJev(r);
      return { rude, vulgar, slur };
    },
    bucket: (y) => (y.slur ? 'slur' : y.vulgar ? 'vulgar' : y.rude ? 'mild' : 'clean'),
  },
  {
    gate: 'slang',
    answers: (r) => ({ slang: mainJev(r).slang }),
    bucket: (y) => (y.slang ? 'slang' : 'standard'),
  },
  {
    gate: 'familiarity',
    answers: (r) => ({ known: r.jev.known, specialist: r.jev.specialist }),
    bucket: (y) => (!y.known ? 'obscure' : y.specialist ? 'specialist' : 'common'),
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
  const unsure = keys.filter((k) => answers[k].confidence < SURE);
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
  if (pick?.choice === 'none' && pick.confidence >= SURE) {
    return { ...base, bucket: 'main_missing', sure: false, answers: { mainMeaning: pick } };
  }
  const acc = r.meanings[mainMeaningIndex(r)].jev.accuracy;
  if (BAD_ACCURACY.includes(acc.choice) && acc.confidence >= SURE) {
    return { ...base, bucket: `main_${acc.choice}`, sure: false, answers: { accuracy: acc } };
  }
  return { ...base, bucket: 'ok', sure: true, answers: { accuracy: acc } };
}

/** The decision order: real word, single word, meanings, offensive, slang, familiarity, level. */
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
  return { kind: 'answer', level: r.jev.level.choice, steps };
}
