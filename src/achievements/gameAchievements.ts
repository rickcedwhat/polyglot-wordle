import type { Language } from '@/types/firestore';
import type { UserVocabularyMap } from '@/types/vocabulary';
import type { EarnedFeat } from './config';
import { detectFeats } from './detectFeats';
import { certificationLevelsBefore, certificationLevelUps, type LevelUp } from './levels';

/** Firestore Timestamp (or anything with toDate) to a Date; null while unset or pending. */
export const timestampToDate = (value: unknown): Date | null => {
  const toDate = (value as { toDate?: () => Date } | null)?.toDate;
  return typeof toDate === 'function' ? toDate.call(value) : null;
};

export interface AchievementGame {
  words: Partial<Record<Language, string>>;
  guessHistory: string[];
  startedAt?: unknown;
  completedAt?: unknown;
}

export interface GameAchievements {
  feats: EarnedFeat[];
  levelUps: LevelUp[];
}

/**
 * Feats and certification level-ups for one game. Levels come from when each vocabulary word was
 * first guessed, so this works for past games too. Without vocabulary, Underdog and level-ups are
 * skipped.
 */
export const getGameAchievements = (
  game: AchievementGame,
  vocabulary?: UserVocabularyMap,
  /** Used while a just-created or just-finished game's server timestamps haven't come back yet. */
  fallbacks: { startedAt?: Date; completedAt?: Date } = {}
): GameAchievements => {
  const startedAt = timestampToDate(game.startedAt) ?? fallbacks.startedAt ?? null;
  const completedAt = timestampToDate(game.completedAt) ?? fallbacks.completedAt ?? null;
  const startLevels =
    vocabulary && startedAt ? certificationLevelsBefore(vocabulary, startedAt) : undefined;
  return {
    feats: detectFeats(game, { startLevels }),
    levelUps:
      vocabulary && startedAt && completedAt
        ? certificationLevelUps(vocabulary, startedAt, completedAt)
        : [],
  };
};
