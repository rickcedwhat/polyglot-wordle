import type { Language } from '@/types/firestore';
import { ALL_LANGUAGES, flagFor, labelFor } from '@/utils/languages';

export interface AchievementTier {
  label: string;
  target: number;
}

export interface AchievementProgress {
  id: string;
  title: string;
  icon: string;
  /** What `current` counts, e.g. "words". */
  unit: string;
  description: string;
  current: number;
  /** Highest tier reached, or null if none yet. */
  tier: AchievementTier | null;
  /** Next tier to reach, or null once maxed. */
  next: AchievementTier | null;
}

/** Distinct valid words guessed in a language, named after CEFR levels. */
export const CERTIFICATION_TIERS: AchievementTier[] = [
  { label: 'A1', target: 25 },
  { label: 'A2', target: 75 },
  { label: 'B1', target: 150 },
  { label: 'B2', target: 300 },
  { label: 'C1', target: 600 },
  { label: 'C2', target: 1200 },
];

/** Distinct definitions opened, across all languages. */
export const READER_TIERS: AchievementTier[] = [
  { label: 'Curious', target: 10 },
  { label: 'Bookworm', target: 50 },
  { label: 'Scholar', target: 200 },
  { label: 'Lexicographer', target: 500 },
];

/** Number of languages certified at A1 or above. */
export const POLYGLOT_TIERS: AchievementTier[] = [
  { label: 'Bilingual', target: 2 },
  { label: 'Trilingual', target: 3 },
  { label: 'Polyglot', target: 5 },
];

const progressFor = (tiers: AchievementTier[], current: number) => {
  const reached = tiers.filter((t) => current >= t.target);
  return {
    tier: reached.at(-1) ?? null,
    next: tiers[reached.length] ?? null,
  };
};

export interface AchievementInputs {
  /** Distinct words guessed per language. */
  wordCounts: Partial<Record<Language, number>>;
  /** Distinct definitions opened, across all languages. */
  definitionsRead: number;
}

export const getAchievements = ({
  wordCounts,
  definitionsRead,
}: AchievementInputs): AchievementProgress[] => {
  const certifications = ALL_LANGUAGES.map((lang): AchievementProgress => {
    const current = wordCounts[lang] ?? 0;
    return {
      id: `certified-${lang}`,
      title: `${labelFor(lang)} certification`,
      icon: flagFor(lang),
      unit: 'words',
      description: `Distinct ${labelFor(lang)} words you've guessed.`,
      current,
      ...progressFor(CERTIFICATION_TIERS, current),
    };
  });

  const certifiedLanguages = certifications.filter((c) => c.tier).length;

  return [
    ...certifications,
    {
      id: 'polyglot',
      title: 'Polyglot',
      icon: '🌍',
      unit: 'languages',
      description: `Languages certified at ${CERTIFICATION_TIERS[0].label} or above.`,
      current: certifiedLanguages,
      ...progressFor(POLYGLOT_TIERS, certifiedLanguages),
    },
    {
      id: 'reader',
      title: 'Reader',
      icon: '📖',
      unit: 'definitions',
      description: 'Distinct word definitions you’ve opened.',
      current: definitionsRead,
      ...progressFor(READER_TIERS, definitionsRead),
    },
  ];
};

/** Achievements whose tier went up between two snapshots. */
export const newlyEarned = (
  before: AchievementProgress[],
  after: AchievementProgress[]
): AchievementProgress[] => {
  const previousTargets = new Map(before.map((a) => [a.id, a.tier?.target ?? 0]));
  return after.filter((a) => (a.tier?.target ?? 0) > (previousTargets.get(a.id) ?? 0));
};
