import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import { getLanguageName } from './lexicalValidity';
import { Meaning } from './meanings';
import { Language } from './types';

export const REVIEW_TASK = 'word_review_v1';

type Answer<T extends string> = { choice: T; confidence: number };

export type RealWord = 'yes' | 'name' | 'foreign' | 'abbreviation' | 'fused' | 'gibberish';
export type WordForm = 'base' | 'conjugated_verb' | 'plural_or_agreement' | 'other';
export type MainMeaning = 'first' | 'second' | 'third' | 'none';
export type WordLevel = 'easy' | 'medium' | 'hard';
export type YesNo = 'yes' | 'no';
export type Accuracy = 'accurate' | 'inflected_form' | 'wrong_pos' | 'wrong_meaning' | 'fabricated';
export type Format = 'clean_dictionary' | 'vague_circular' | 'robotic_filler' | 'malformed_syntax';
export type Rating = 'clean' | 'vulgar' | 'slur';

/** Questions about the word as a whole. */
export interface WordAnswers {
  realWord: Answer<RealWord>;
  form: Answer<WordForm>;
  /** Only asked when there is more than one meaning. */
  mainMeaning?: Answer<MainMeaning>;
  obscure: Answer<YesNo>;
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
  realWord: ['yes', 'name', 'foreign', 'abbreviation', 'fused', 'gibberish'],
  form: ['base', 'conjugated_verb', 'plural_or_agreement', 'other'],
  mainMeaning: ['first', 'second', 'third', 'none'],
  obscure: ['no', 'yes'],
  level: ['easy', 'medium', 'hard'],
  accuracy: ['accurate', 'inflected_form', 'wrong_pos', 'wrong_meaning', 'fabricated'],
  format: ['clean_dictionary', 'vague_circular', 'robotic_filler', 'malformed_syntax'],
  rating: ['clean', 'vulgar', 'slur'],
  slang: ['no', 'yes'],
} as const;

const ORDINALS = ['first', 'second', 'third'] as const;

function listMeanings(meanings: Meaning[]) {
  return meanings.map((m, i) => `${i + 1}. (${m.pos}) ${m.def}`).join('\n') || '(none listed)';
}

export function buildWordQuestions(input: ReviewInput) {
  const lang = getLanguageName(input.lang);
  const w = input.display;
  const questions: Record<string, ReturnType<typeof choice>> = {
    realWord: choice(
      `Is "${w}" a real ${lang} word that native speakers actually use? Vulgar, slang, rare and inflected words (conjugations, plurals) still count as real words.`,
      {
        yes: `Yes: a real ${lang} word, or a standard form of one`,
        name: 'No: only a name of a person, brand or place, with no ordinary meaning',
        foreign: `No: a foreign word (often English) that is not established ${lang} vocabulary`,
        abbreviation: 'No: an abbreviation, acronym or clipped form',
        fused: 'No: a fused multi-word form or a verb with attached pronouns (e.g. verlo, hazlo)',
        gibberish: 'No: a typo, fragment or not a word at all',
      }
    ),
    form: choice(`In its most common meaning, what grammatical form is the ${lang} word "${w}"?`, {
      base: 'Base dictionary form: infinitive, singular noun, base adjective, adverb, pronoun, etc.',
      conjugated_verb: 'A conjugated verb: any tense or person other than the infinitive',
      plural_or_agreement: 'A plural, or a gender or number form of a noun or adjective',
      other: 'Something else (contraction, combined form, etc.)',
    }),
    obscure: choice(
      `Is the ${lang} word "${w}" obscure: archaic, rare, regional, or specialist jargon that many educated native speakers would not recognize?`,
      {
        no: 'No: most educated adult native speakers know it',
        yes: 'Yes: archaic, rare, regional or specialist; many native speakers would not know it',
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
      `Is the ${lang} word "${w}" offensive when used with this meaning: "${meaning.def}"? Ordinary words that describe people, groups or conditions (old woman, crazy, slave, foreigner) are clean even when the topic is sensitive.`,
      {
        clean: 'Clean: fine for a general audience, including children',
        vulgar: 'Vulgar: profanity, swearing, or crude sexual or bodily language',
        slur: 'Slur: used to demean people for their race, ethnicity, nationality, religion, sexuality, gender or disability',
      }
    ),
    slang: choice(
      `Is the ${lang} word "${w}" slang when used with this meaning: "${meaning.def}"? Well-known slang still counts as slang. Ordinary casual words do not.`,
      {
        no: 'No: standard vocabulary; a dictionary would list this meaning without a "slang" or "vulgar" label',
        yes: 'Yes: a dictionary would label this meaning as slang or vulgar',
      }
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
    form: readAnswer(answers, 'form'),
    mainMeaning: meaningCount > 1 ? readAnswer(answers, 'mainMeaning') : undefined,
    obscure: readAnswer(answers, 'obscure'),
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

export type Outcome =
  | { kind: 'removed'; gate: 'real_word' | 'offensive'; reason: string }
  | {
      kind: 'maybe';
      gate: 'real_word' | 'meanings' | 'offensive' | 'slang' | 'obscure';
      reason: string;
    }
  | { kind: 'guess_only'; gate: 'offensive' | 'slang' | 'obscure'; reason: string }
  | { kind: 'answer'; level: WordLevel };

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

/** The decision order: real word, meanings, offensive, slang, obscure, level. */
export function decide(r: ReviewResult): Outcome {
  const real = r.jev.realWord;
  if (real.choice !== 'yes') {
    return real.confidence >= SURE
      ? { kind: 'removed', gate: 'real_word', reason: real.choice }
      : { kind: 'maybe', gate: 'real_word', reason: `maybe ${real.choice}` };
  }
  if (real.confidence < SURE) {
    return { kind: 'maybe', gate: 'real_word', reason: 'maybe not a word' };
  }

  if (r.meanings.length === 0) {
    return { kind: 'maybe', gate: 'meanings', reason: 'no meanings' };
  }
  const pick = r.jev.mainMeaning;
  if (pick?.choice === 'none' && pick.confidence >= SURE) {
    return { kind: 'maybe', gate: 'meanings', reason: 'main meaning missing' };
  }
  const main = r.meanings[mainMeaningIndex(r)];
  if (BAD_ACCURACY.includes(main.jev.accuracy.choice) && main.jev.accuracy.confidence >= SURE) {
    return { kind: 'maybe', gate: 'meanings', reason: `main meaning ${main.jev.accuracy.choice}` };
  }

  const rating = main.jev.rating;
  if (rating.confidence < SURE) {
    return {
      kind: 'maybe',
      gate: 'offensive',
      reason: rating.choice === 'clean' ? 'maybe offensive' : `maybe ${rating.choice}`,
    };
  }
  if (rating.choice === 'slur') {
    return { kind: 'removed', gate: 'offensive', reason: 'slur' };
  }
  if (rating.choice === 'vulgar') {
    return { kind: 'guess_only', gate: 'offensive', reason: 'vulgar' };
  }

  const slang = main.jev.slang;
  if (slang.confidence < SURE) {
    return { kind: 'maybe', gate: 'slang', reason: 'maybe slang' };
  }
  if (slang.choice === 'yes') {
    return { kind: 'guess_only', gate: 'slang', reason: 'slang' };
  }

  const obscure = r.jev.obscure;
  if (obscure.confidence < SURE) {
    return { kind: 'maybe', gate: 'obscure', reason: 'maybe obscure' };
  }
  if (obscure.choice === 'yes') {
    return { kind: 'guess_only', gate: 'obscure', reason: 'obscure' };
  }

  return { kind: 'answer', level: r.jev.level.choice };
}
