import type { Language } from '@/types/firestore';
import type { UserVocabularyMap } from '@/types/vocabulary';
import { ALL_LANGUAGES } from '@/utils/languages';
import { normalizeWord } from '@/utils/wordUtils';
import { CERTIFICATION_LEVELS, type TrackLevel } from './config';

/** Index of the highest level reached (-1 if none). */
export const levelIndexFor = (levels: TrackLevel[], count: number): number =>
  levels.filter((level) => count >= level.target).length - 1;

const countWordsSeen = (
  vocabulary: UserVocabularyMap,
  lang: Language,
  isIncluded: (firstSeen: number) => boolean
) =>
  Object.values(vocabulary[lang] ?? {}).filter((record) =>
    isIncluded(new Date(record.firstSeen).getTime())
  ).length;

/** Certification level per language counting only words first guessed before `time`. */
export const certificationLevelsBefore = (
  vocabulary: UserVocabularyMap,
  time: Date
): Record<Language, number> =>
  Object.fromEntries(
    ALL_LANGUAGES.map((lang) => [
      lang,
      levelIndexFor(
        CERTIFICATION_LEVELS,
        countWordsSeen(vocabulary, lang, (seen) => seen < time.getTime())
      ),
    ])
  ) as Record<Language, number>;

export interface LevelUp {
  lang: Language;
  /** Index into CERTIFICATION_LEVELS reached during the game. */
  level: number;
}

/**
 * Certification levels this game's own guesses reached, in the game's languages. Only its words
 * first seen between `start` and `end` count, so other games played while it was open (a game can
 * stay unfinished for days) don't show up as level-ups here.
 */
export const certificationLevelUps = (
  vocabulary: UserVocabularyMap,
  start: Date,
  end: Date,
  game: { languages: Language[]; guesses: string[] }
): LevelUp[] => {
  const guessed = new Set(game.guesses.map(normalizeWord));
  const seenAt = (firstSeen: string) => new Date(firstSeen).getTime();
  return game.languages.flatMap((lang) => {
    const known = Object.entries(vocabulary[lang] ?? {}).filter(
      ([, record]) => seenAt(record.firstSeen) <= end.getTime()
    );
    const fromThisGame = known.filter(
      ([word, record]) => guessed.has(word) && seenAt(record.firstSeen) >= start.getTime()
    ).length;
    const after = levelIndexFor(CERTIFICATION_LEVELS, known.length);
    return after > levelIndexFor(CERTIFICATION_LEVELS, known.length - fromThisGame)
      ? [{ lang, level: after }]
      : [];
  });
};
