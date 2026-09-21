import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import {
  DefinitionVerdict,
  DictionaryEntry,
  DifficultyTier,
  FormatVerdict,
  JevEvaluationResult,
  mapScoreToTier,
} from './types';

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
};

/**
 * Builds the 3 multiple-choice questions for Jev System One:
 * 1. Good definition for the word (Definition Accuracy / POS)
 * 2. Definition format (Editorial style & formatting hygiene)
 * 3. Word difficulty tier (Elementary, Intermediate, Advanced, Obscure)
 */
export const buildJevQuestions = (entry: DictionaryEntry) => {
  const langName = LANGUAGE_NAMES[entry.lang];

  return {
    definition: choice(
      `How would you evaluate the definition for the 5-letter ${langName} word "${entry.display}" as a ${entry.pos}?`,
      {
        accurate:
          'Accurate Base Form: Factually correct definition matching the word and part of speech (base lemma / headword)',
        inflected_form:
          'Accurate Inflection: Valid conjugated verb, tense, plural, or inflected form with an accurate explanatory gloss',
        wrong_pos:
          'Wrong POS: Meaning is valid but part of speech is mislabeled (e.g. noun labeled as verb)',
        wrong_meaning:
          'Wrong Meaning: Incorrect meaning, defines a different word, or is a false friend',
        fabricated: 'Fabricated: Hallucinated, fictitious, non-existent word, or invented meaning',
      }
    ),

    format: choice(
      `Evaluate the formatting, conciseness, and editorial style of this ${langName} definition:`,
      {
        clean_dictionary: 'Clean: Concise, natural, professional dictionary entry',
        vague_circular:
          'Vague/Circular: Defines word with its own root, or is overly abstract/repetitive',
        robotic_filler:
          'Robotic Filler: Template boilerplate (e.g. "The entity representing...", "to perform this action")',
        malformed_syntax:
          'Malformed Syntax: Incomplete sentence, dangling fragments, or broken punctuation',
      }
    ),

    difficulty: choice(
      `What difficulty tier best describes the 5-letter ${langName} word "${entry.display}"?`,
      {
        elementary:
          'Elementary / Everyday: Basic daily word known by all speakers (e.g. apple, water, casa, eau)',
        intermediate:
          'Intermediate / Common: Familiar conversational word (e.g. blend, crisp, playa, monde)',
        advanced:
          'Advanced / Sophisticated: Formal, literary, specialized/domain, or nuanced word recognizable to an educated adult (e.g. aorta, valve, usury, puree, horda, abate, sutil)',
        obscure:
          'Obscure / Rare: Truly archaic, dead, esoteric jargon, or rare specialist terms unfamiliar to most educated adults (e.g. aback, xylem, fovea, skink, chyme)',
      }
    ),
  };
};

/**
 * Evaluates a single dictionary entry using Jev System One multiple-choice questions.
 */
export async function evaluateEntryWithJev(
  client: TypeSafeClient,
  entry: DictionaryEntry,
  model = 'jev-latest'
): Promise<JevEvaluationResult> {
  const startTime = Date.now();
  const ourTier = mapScoreToTier(entry.d);

  const state = {
    word: entry.word,
    display: entry.display,
    languageCode: entry.lang,
    language: LANGUAGE_NAMES[entry.lang],
    partOfSpeech: entry.pos,
    definition: entry.def,
    currentDifficultyTier: ourTier,
    isCalibration: entry.isCalibration === true,
  };

  const questions = buildJevQuestions(entry);

  const response = await client.systemOne({
    model,
    state,
    questions,
  });

  const latencyMs = Date.now() - startTime;
  const { answers } = response;

  if (!answers || typeof answers !== 'object') {
    throw new Error('Invalid evaluation response: answers must be an object');
  }

  const validateAnswer = <T extends string>(
    name: string,
    answer: unknown,
    allowedChoices: readonly T[]
  ): { choice: T; confidence: number } => {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
      throw new Error(`Invalid evaluation response: ${name} answer must be an object`);
    }

    const { choice: answerChoice, confidence } = answer as {
      choice?: unknown;
      confidence?: unknown;
    };
    if (typeof answerChoice !== 'string' || answerChoice.trim() === '') {
      throw new Error(`Invalid evaluation response: ${name}.choice is required`);
    }
    if (!allowedChoices.includes(answerChoice as T)) {
      throw new Error(`Invalid evaluation response: unknown ${name}.choice "${answerChoice}"`);
    }
    if (confidence === null || confidence === undefined) {
      throw new Error(`Invalid evaluation response: ${name}.confidence is required`);
    }
    if (
      typeof confidence !== 'number' ||
      !Number.isFinite(confidence) ||
      confidence < 0 ||
      confidence > 1
    ) {
      throw new Error(`Invalid evaluation response: ${name}.confidence must be between 0 and 1`);
    }

    return { choice: answerChoice as T, confidence };
  };

  // 1. Definition Verdict
  const definition = validateAnswer('definition', answers.definition, [
    'accurate',
    'inflected_form',
    'wrong_pos',
    'wrong_meaning',
    'fabricated',
  ] as const);
  const definitionVerdict: DefinitionVerdict = definition.choice;
  const definitionConfidence = definition.confidence;

  // 2. Format Verdict
  const format = validateAnswer('format', answers.format, [
    'clean_dictionary',
    'vague_circular',
    'robotic_filler',
    'malformed_syntax',
  ] as const);
  const formatVerdict: FormatVerdict = format.choice;
  const formatConfidence = format.confidence;

  // 3. Difficulty Tier
  const difficulty = validateAnswer('difficulty', answers.difficulty, [
    'elementary',
    'intermediate',
    'advanced',
    'obscure',
  ] as const);
  const jevTier: DifficultyTier = difficulty.choice;
  const difficultyConfidence = difficulty.confidence;

  const difficultyMatches = jevTier === ourTier;

  // Derive reasons and severity
  const reasons: string[] = [];
  let severity: 'high' | 'medium' | 'low' | 'none' = 'none';

  if (definitionVerdict === 'wrong_meaning' || definitionVerdict === 'fabricated') {
    reasons.push(`Inaccurate definition (${definitionVerdict})`);
    severity = 'high';
  } else if (definitionVerdict === 'wrong_pos') {
    reasons.push(`Part-of-speech mismatch (${entry.pos} flagged)`);
    severity = 'medium';
  }

  if (formatVerdict === 'robotic_filler') {
    reasons.push('Mechanical/robotic template filler detected');
    severity = severity === 'high' ? 'high' : 'medium';
  } else if (formatVerdict === 'malformed_syntax') {
    reasons.push('Malformed syntax or broken punctuation');
    severity = severity === 'high' ? 'high' : 'medium';
  } else if (formatVerdict === 'vague_circular') {
    reasons.push('Vague or circular definition');
    if (severity === 'none') {
      severity = 'low';
    }
  }

  if (!difficultyMatches) {
    reasons.push(`Difficulty mismatch: dictionary has [${ourTier}], Jev assessed [${jevTier}]`);
    if (severity === 'none') {
      severity = 'low';
    }
  }

  return {
    word: entry.word,
    lang: entry.lang,
    display: entry.display,
    currentPos: entry.pos,
    currentDef: entry.def,
    currentD: entry.d,
    ourTier,
    definitionVerdict,
    definitionConfidence,
    formatVerdict,
    formatConfidence,
    jevTier,
    difficultyConfidence,
    difficultyMatches,
    reasons,
    severity,
    latencyMs,
  };
}
