import {
  certificationTrack,
  GLOBETROTTER_MIN_READS,
  TRACKS,
  type TrackDef,
  type TrackId,
  type TrackLevel,
} from '@/achievements/config';
import { levelIndexFor } from '@/achievements/levels';
import type { Language } from '@/types/firestore';
import { ALL_LANGUAGES } from '@/utils/languages';

export interface AchievementProgress {
  /** `certified-{lang}` or a TrackId. */
  id: string;
  track: TrackDef;
  current: number;
  /** Index into `track.levels` reached, or -1. */
  level: number;
  /** Highest level reached, or null if none yet. */
  tier: TrackLevel | null;
  /** Next level to reach, or null once maxed. */
  next: TrackLevel | null;
}

export interface AchievementInputs {
  /** Distinct words guessed per language. */
  wordCounts: Partial<Record<Language, number>>;
  /** Distinct definitions opened, across all languages. */
  definitionsRead: number;
  /** Tracks below are left out when their input is unknown (e.g. private to the player). */
  definitionsReadByLang?: Partial<Record<Language, number>>;
  maxStreak?: number;
  gamesPlayed?: number;
  friends?: number;
  challengeWins?: number;
}

const progress = (id: string, track: TrackDef, current: number): AchievementProgress => {
  const level = levelIndexFor(track.levels, current);
  return {
    id,
    track,
    current,
    level,
    tier: track.levels[level] ?? null,
    next: track.levels[level + 1] ?? null,
  };
};

export const getAchievements = (inputs: AchievementInputs): AchievementProgress[] => {
  const certifications = ALL_LANGUAGES.map((lang) =>
    progress(`certified-${lang}`, certificationTrack(lang), inputs.wordCounts[lang] ?? 0)
  );
  const certifiedLanguages = certifications.filter((c) => c.tier).length;

  const optional: [TrackId, number | undefined][] = [
    [
      'globetrotter',
      inputs.definitionsReadByLang &&
        ALL_LANGUAGES.filter(
          (lang) => (inputs.definitionsReadByLang?.[lang] ?? 0) >= GLOBETROTTER_MIN_READS
        ).length,
    ],
    ['streak', inputs.maxStreak],
    ['regular', inputs.gamesPlayed],
    ['duelist', inputs.challengeWins],
    ['squad', inputs.friends],
  ];

  return [
    ...certifications,
    progress('polyglot', TRACKS.polyglot, certifiedLanguages),
    progress('reader', TRACKS.reader, inputs.definitionsRead),
    ...optional
      .filter((entry): entry is [TrackId, number] => entry[1] !== undefined)
      .map(([id, current]) => progress(id, TRACKS[id], current)),
  ];
};

/** Achievements whose tier went up between two snapshots. */
export const newlyEarned = (
  before: AchievementProgress[],
  after: AchievementProgress[]
): AchievementProgress[] => {
  const previousLevels = new Map(before.map((a) => [a.id, a.level]));
  return after.filter((a) => previousLevels.has(a.id) && a.level > previousLevels.get(a.id)!);
};
