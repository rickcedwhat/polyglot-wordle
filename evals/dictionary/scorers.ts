import { choice, noul, score, TypeSafeClient } from '@typesafe-ai/sdk';
import {
  AccuracyClassification,
  DictionaryEntry,
  DifficultyTier,
  JevEvaluationResult,
  QualityClassification,
} from './types';

export const DIFFICULTY_TIERS: DifficultyTier[] = [
  'Elementary / Everyday',
  'Intermediate / Common',
  'Advanced / Sophisticated',
  'Obscure / Archaic / Specialist',
];

const DIFFICULTY_MAP: Record<DifficultyTier, number> = {
  'Elementary / Everyday': 0.2,
  'Intermediate / Common': 0.5,
  'Advanced / Sophisticated': 0.75,
  'Obscure / Archaic / Specialist': 0.95,
};

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
};

/**
 * Builds the structured questions for Jev System One to assess a dictionary entry.
 */
export const buildJevQuestions = (entry: DictionaryEntry) => {
  const langName = LANGUAGE_NAMES[entry.lang];

  return {
    difficulty: score(
      `How difficult or obscure is this 5-letter ${langName} word for a literate speaker or language learner?`,
      [
        'Elementary / Everyday (basic foundational vocabulary: apple, water, casa, eau)',
        'Intermediate / Common (familiar conversational words: blend, crisp, playa, monde)',
        'Advanced / Sophisticated (formal, literary, nuanced vocabulary: abate, forge, sutil)',
        'Obscure / Archaic / Specialist (archaic, rare, technical, jargon: aback, fovea, xylem)',
      ]
    ),

    accuracy: choice(
      `Is the definition factually accurate for "${entry.display}" as a ${langName} ${entry.pos}?`,
      {
        accurate: 'Definition accurately describes the word and matches its part of speech',
        wrong_pos:
          'Meaning is real but labeled with the wrong part of speech (e.g. noun labeled as verb)',
        wrong_meaning:
          'Definition gives an incorrect meaning, false friend, or wrong word entirely',
        fabricated: 'Hallucinated, fictitious, or gibberish definition',
      }
    ),

    quality: choice(
      `Evaluate the clarity, editorial quality, and style of this ${langName} definition:`,
      {
        high_quality: 'Clear, concise, natural definition fitting for a word puzzle game',
        vague_or_circular:
          'Vague, overly abstract, or circular (defines the word using its own root)',
        robotic_filler:
          'Mechanical template filler (e.g. "The entity, object, or concept representing...", "to perform this action")',
        grammatical_glitch:
          'Incomplete sentence, dangling clause, broken punctuation, or malformed syntax',
      }
    ),

    needsReexamine: noul(
      `Should this dictionary entry be queued for human reexamination due to an error, wrong POS, robotic phrasing, or large difficulty mismatch?`
    ),
  };
};

/**
 * Evaluates a single dictionary entry using Jev System One.
 */
export async function evaluateEntryWithJev(
  client: TypeSafeClient,
  entry: DictionaryEntry,
  model = 'jev-latest'
): Promise<JevEvaluationResult> {
  const startTime = Date.now();

  const state = {
    word: entry.word,
    display: entry.display,
    language: LANGUAGE_NAMES[entry.lang],
    partOfSpeech: entry.pos,
    definition: entry.def,
    currentDifficultyScore: entry.d,
  };

  const questions = buildJevQuestions(entry);

  const response = await client.systemOne({
    model,
    state,
    questions,
  });

  const latencyMs = Date.now() - startTime;
  const { answers } = response;

  // 1. Difficulty
  const rawDifficultyAnswer = String(
    (answers.difficulty as any)?.choice || (answers.difficulty as any)?.score || ''
  );
  let difficultyTier: DifficultyTier = 'Intermediate / Common';
  for (const tier of DIFFICULTY_TIERS) {
    if (rawDifficultyAnswer.includes(tier.split('/')[0].trim())) {
      difficultyTier = tier;
      break;
    }
  }
  const assessedD = DIFFICULTY_MAP[difficultyTier];
  const difficultyConfidence = (answers.difficulty as any)?.confidence ?? 1.0;

  // 2. Accuracy
  const rawAccuracy = String(
    (answers.accuracy as any)?.choice || 'accurate'
  ) as AccuracyClassification;
  const accuracy: AccuracyClassification = [
    'accurate',
    'wrong_pos',
    'wrong_meaning',
    'fabricated',
  ].includes(rawAccuracy)
    ? rawAccuracy
    : 'accurate';
  const accuracyConfidence = (answers.accuracy as any)?.confidence ?? 1.0;

  // 3. Quality
  const rawQuality = String(
    (answers.quality as any)?.choice || 'high_quality'
  ) as QualityClassification;
  const quality: QualityClassification = [
    'high_quality',
    'vague_or_circular',
    'robotic_filler',
    'grammatical_glitch',
  ].includes(rawQuality)
    ? rawQuality
    : 'high_quality';
  const qualityConfidence = (answers.quality as any)?.confidence ?? 1.0;

  // 4. Needs Reexamine
  const needsReexamineAnswer = answers.needsReexamine as any;
  const needsReexamineProb =
    typeof needsReexamineAnswer?.probability === 'number'
      ? needsReexamineAnswer.probability
      : needsReexamineAnswer?.answer
        ? 1.0
        : 0.0;
  const needsReexamine = needsReexamineProb >= 0.5 || Boolean(needsReexamineAnswer?.answer);

  // Derive reasons and severity
  const reasons: string[] = [];
  let severity: 'high' | 'medium' | 'low' | 'none' = 'none';

  if (accuracy === 'wrong_meaning' || accuracy === 'fabricated') {
    reasons.push(`Inaccurate definition (${accuracy})`);
    severity = 'high';
  } else if (accuracy === 'wrong_pos') {
    reasons.push(`Part-of-speech mismatch (${entry.pos} flagged)`);
    severity = severity === 'high' ? 'high' : 'medium';
  }

  if (quality === 'robotic_filler') {
    reasons.push('Mechanical/robotic template filler detected');
    severity = severity === 'high' ? 'high' : 'medium';
  } else if (quality === 'grammatical_glitch') {
    reasons.push('Malformed syntax or broken punctuation');
    severity = severity === 'high' ? 'high' : 'medium';
  } else if (quality === 'vague_or_circular') {
    reasons.push('Vague or circular definition');
    if (severity === 'none') {
      severity = 'low';
    }
  }

  const diffDelta = Math.abs(assessedD - entry.d);
  if (diffDelta >= 0.35 && difficultyConfidence >= 0.8) {
    reasons.push(
      `Difficulty mismatch (current d=${entry.d.toFixed(2)}, Jev assessed ${difficultyTier} d=${assessedD.toFixed(2)})`
    );
    if (severity === 'none') {
      severity = 'low';
    }
  }

  if (needsReexamineProb >= 0.75 && reasons.length === 0) {
    reasons.push(
      `Jev flagged for reexamination (${(needsReexamineProb * 100).toFixed(0)}% confidence)`
    );
    if (severity === 'none') {
      severity = 'medium';
    }
  }

  return {
    word: entry.word,
    lang: entry.lang,
    display: entry.display,
    currentPos: entry.pos,
    currentDef: entry.def,
    currentD: entry.d,
    difficultyTier,
    assessedD,
    difficultyConfidence,
    accuracy,
    accuracyConfidence,
    quality,
    qualityConfidence,
    needsReexamine: reasons.length > 0 || needsReexamine,
    needsReexamineProb,
    reasons,
    severity,
    latencyMs,
  };
}
