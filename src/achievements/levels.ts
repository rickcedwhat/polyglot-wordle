import type { Language } from '@/types/firestore';
import type { UserVocabularyMap } from '@/types/vocabulary';
import { ALL_LANGUAGES } from '@/utils/languages';
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

/** Certification levels reached by words first guessed between `start` and `end`. */
export const certificationLevelUps = (
  vocabulary: UserVocabularyMap,
  start: Date,
  end: Date
): LevelUp[] => {
  const before = certificationLevelsBefore(vocabulary, start);
  const after = certificationLevelsBefore(vocabulary, new Date(end.getTime() + 1));
  return ALL_LANGUAGES.filter((lang) => after[lang] > before[lang]).map((lang) => ({
    lang,
    level: after[lang],
  }));
};
