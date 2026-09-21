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
      `Is the definition factually accurate for "${entry.display}" as a ${langName} ${entry.pos}?`,
      {
        accurate: 'Accurate: Factually correct definition matching the word and part of speech',
        wrong_pos:
          'Wrong POS: Meaning is valid but part of speech is mislabeled (e.g. noun labeled as verb)',
        wrong_meaning:
          'Wrong Meaning: Incorrect meaning, defines a different word, or is a false friend',
        fabricated: 'Fabricated: Hallucinated, fictitious, or invented word/meaning',
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
    language: LANGUAGE_NAMES[entry.lang],
    partOfSpeech: entry.pos,
    definition: entry.def,
    currentDifficultyTier: ourTier,
  };

  const questions = buildJevQuestions(entry);

  const response = await client.systemOne({
    model,
    state,
    questions,
  });

  const latencyMs = Date.now() - startTime;
  const { answers } = response;

  // 1. Definition Verdict
  const rawDef = String((answers.definition as any)?.choice || 'accurate') as DefinitionVerdict;
  const definitionVerdict: DefinitionVerdict = [
    'accurate',
    'wrong_pos',
    'wrong_meaning',
    'fabricated',
  ].includes(rawDef)
    ? rawDef
    : 'accurate';
  const definitionConfidence = (answers.definition as any)?.confidence ?? 1.0;

  // 2. Format Verdict
  const rawFmt = String((answers.format as any)?.choice || 'clean_dictionary') as FormatVerdict;
  const formatVerdict: FormatVerdict = [
    'clean_dictionary',
    'vague_circular',
    'robotic_filler',
    'malformed_syntax',
  ].includes(rawFmt)
    ? rawFmt
    : 'clean_dictionary';
  const formatConfidence = (answers.format as any)?.confidence ?? 1.0;

  // 3. Difficulty Tier
  const rawDiff = String((answers.difficulty as any)?.choice || 'intermediate') as DifficultyTier;
  const jevTier: DifficultyTier = ['elementary', 'intermediate', 'advanced', 'obscure'].includes(
    rawDiff
  )
    ? rawDiff
    : 'intermediate';
  const difficultyConfidence = (answers.difficulty as any)?.confidence ?? 1.0;

  const difficultyMatches = jevTier === ourTier;

  // Derive reasons and severity
  const reasons: string[] = [];
  let severity: 'high' | 'medium' | 'low' | 'none' = 'none';

  if (definitionVerdict === 'wrong_meaning' || definitionVerdict === 'fabricated') {
    reasons.push(`Inaccurate definition (${definitionVerdict})`);
    severity = 'high';
  } else if (definitionVerdict === 'wrong_pos') {
    reasons.push(`Part-of-speech mismatch (${entry.pos} flagged)`);
    severity = severity === 'high' ? 'high' : 'medium';
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
