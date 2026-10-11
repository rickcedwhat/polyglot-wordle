import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import { getLanguageName } from './lexicalValidity';
import { Meaning } from './meanings';
import { realWordPrompt } from './realWordPrompt';
import { Language } from './types';

export const REVIEW_TASK = 'word_review_v2';

type Answer<T extends string> = { choice: T; confidence: number };

export type YesNo = 'yes' | 'no';
export type WordForm = 'base' | 'conjugated_verb' | 'plural_or_agreement' | 'other';
export type MainMeaning = 'first' | 'second' | 'third' | 'none';
export type Familiarity = 'common' | 'specialist' | 'obscure';
export type WordLevel = 'easy' | 'medium' | 'hard';
export type Accuracy = 'accurate' | 'inflected_form' | 'wrong_pos' | 'wrong_meaning' | 'fabricated';
export type Format = 'clean_dictionary' | 'vague_circular' | 'robotic_filler' | 'malformed_syntax';
export type Rating = 'clean' | 'mild' | 'vulgar' | 'slur';

/** Questions about the word as a whole. */
export interface WordAnswers {
  realWord: Answer<YesNo>;
  fused: Answer<YesNo>;
  form: Answer<WordForm>;
  /** Only asked when there is more than one meaning. */
  mainMeaning?: Answer<MainMeaning>;
  familiarity: Answer<Familiarity>;
  level: Answer<WordLevel>;
}

/** Questions about one meaning of the word. */
export interface MeaningAnswers {
  accuracy: Answer<Accuracy>;
  format: Answer<Format>;
  rating: Answer<Rating>;
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
  familiarity: ['common', 'specialist', 'obscure'],
  level: ['easy', 'medium', 'hard'],
  accuracy: ['accurate', 'inflected_form', 'wrong_pos', 'wrong_meaning', 'fabricated'],
  format: ['clean_dictionary', 'vague_circular', 'robotic_filler', 'malformed_syntax'],
  rating: ['clean', 'mild', 'vulgar', 'slur'],
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
    familiarity: choice(
      `How familiar is the meaning of the ${lang} word "${w}" to native speakers? Judge the meaning, not the grammatical form: a rare tense or form of a well-known word counts as that word.`,
      {
        common: 'Common: an everyday word most people know',
        specialist:
          'Specialist but known: a technical, scientific, legal, food or sports word most educated adults still recognise (like "vaccine" or "referee")',
        obscure:
          'Obscure: archaic, rare, regional or expert jargon most native speakers would not recognise',
      }
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
    rating: choice(
      `How offensive is the ${lang} word "${w}" when used with this meaning: "${meaning.def}"?`,
      {
        clean:
          'Clean: neutral or polite, fine anywhere including with children. Words that describe people, groups or conditions neutrally are clean.',
        mild: 'Mild: a bit rude or crude but not swearing, such as childish bathroom words or mild insults (like "dork", "jerk" or "booger")',
        vulgar: 'Vulgar: swearing, profanity, or explicit sexual language',
        slur: 'Slur: used to demean a group of people for their race, ethnicity, nationality, religion, sexuality, gender or disability',
      }
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
    familiarity: readAnswer(answers, 'familiarity'),
    level: readAnswer(answers, 'level'),
  };
}

export function parseMeaningAnswers(answers: Record<string, unknown> | undefined): MeaningAnswers {
  return {
    accuracy: readAnswer(answers, 'accuracy'),
    format: readAnswer(answers, 'format'),
    rating: readAnswer(answers, 'rating'),
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

/** One gate's verdict: the bucket Jev put the word in, and whether Jev was sure. */
export interface Step {
  gate: Gate;
  bucket: string;
  sure: boolean;
  confidence: number;
}

/**
 * What happens to words in each sure bucket. Buckets not listed pass on to the next
 * gate. This is policy, separate from Jev's buckets, and can change without re-asking Jev.
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

const step = (gate: Gate, bucket: string, a: { confidence: number }): Step => ({
  gate,
  bucket,
  sure: a.confidence >= SURE,
  confidence: a.confidence,
});

function meaningsStep(r: ReviewResult): Step {
  if (r.meanings.length === 0) {
    return { gate: 'meanings', bucket: 'no_meanings', sure: false, confidence: 0 };
  }
  const pick = r.jev.mainMeaning;
  if (pick?.choice === 'none' && pick.confidence >= SURE) {
    return { gate: 'meanings', bucket: 'main_missing', sure: false, confidence: pick.confidence };
  }
  const acc = r.meanings[mainMeaningIndex(r)].jev.accuracy;
  if (BAD_ACCURACY.includes(acc.choice) && acc.confidence >= SURE) {
    return {
      gate: 'meanings',
      bucket: `main_${acc.choice}`,
      sure: false,
      confidence: acc.confidence,
    };
  }
  return { gate: 'meanings', bucket: 'ok', sure: true, confidence: 1 };
}

/** The decision order: real word, single word, meanings, offensive, slang, familiarity, level. */
export function decide(r: ReviewResult): Outcome {
  const main = () => r.meanings[mainMeaningIndex(r)].jev;
  const gates: (() => Step)[] = [
    () =>
      step(
        'real_word',
        r.jev.realWord.choice === 'yes' ? 'real_word' : 'not_a_word',
        r.jev.realWord
      ),
    () => step('single_word', r.jev.fused.choice === 'yes' ? 'fused' : 'single', r.jev.fused),
    () => meaningsStep(r),
    () => step('offensive', main().rating.choice, main().rating),
    () => step('slang', main().slang.choice === 'yes' ? 'slang' : 'standard', main().slang),
    () => step('familiarity', r.jev.familiarity.choice, r.jev.familiarity),
  ];
  const steps: Step[] = [];
  for (const next of gates) {
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
