/**
 * Display config for every achievement. Names, icons, descriptions, and level labels can be
 * changed freely here. Ids and level targets are what the rest of the app keys on, so rename
 * an id only together with a migration.
 */
import {
  IconArrowBigUpLines,
  IconArrowsShuffle,
  IconBallAmericanFootball,
  IconBolt,
  IconBook,
  IconCalendarCheck,
  IconFeather,
  IconFlame,
  IconFlare,
  IconHeartBroken,
  IconLanguage,
  IconLetterCase,
  IconMoodEmpty,
  IconPlaneTilt,
  IconQuestionMark,
  IconShieldStar,
  IconSparkles,
  IconSwords,
  IconUsers,
  IconWorld,
  type Icon,
} from '@tabler/icons-react';
import type { Language } from '@/types/firestore';
import { flagFor, labelFor } from '@/utils/languages';

/** A Tabler icon, or a short string (e.g. a flag emoji) rendered as text. */
export type BadgeIcon = Icon | string;

export interface TrackLevel {
  label: string;
  target: number;
}

/** Distinct words guessed in a language, named after CEFR levels. */
export const CERTIFICATION_LEVELS: TrackLevel[] = [
  { label: 'A1', target: 25 },
  { label: 'A2', target: 75 },
  { label: 'B1', target: 150 },
  { label: 'B2', target: 300 },
  { label: 'C1', target: 600 },
  { label: 'C2', target: 1200 },
];

// ---------------------------------------------------------------------------
// Feats
// ---------------------------------------------------------------------------

export type FeatCategory = 'solving' | 'language' | 'local' | 'fun';

export const FEAT_CATEGORIES: Record<FeatCategory, { label: string; color: string }> = {
  solving: { label: 'Solving', color: 'teal' },
  language: { label: 'Multi-language', color: 'violet' },
  local: { label: 'Language-specific', color: 'orange' },
  fun: { label: 'Just for fun', color: 'pink' },
};

export type FeatId =
  | 'outOfNowhere'
  | 'hailMary'
  | 'holeInOne'
  | 'aLaPrimera'
  | 'duPremierCoup'
  | 'alPrimoColpo'
  | 'dePrimeira'
  | 'chapeau'
  | 'pinata'
  | 'jackpot'
  | 'minimalist'
  | 'speedrun'
  | 'underdog'
  | 'twoBirds'
  | 'lostInTranslation'
  | 'jeNeSaisQuoi'
  | 'dud'
  | 'scrambled'
  | 'soClose'
  | 'bravery';

/** One occurrence of a feat in a game. */
export interface EarnedFeat {
  id: FeatId;
  /** 1-based guess number the feat happened on (the last guess for whole-game feats). */
  guess: number;
  /** Board the feat is about, when it's about one board. */
  lang?: Language;
  /** Feat-specific number: letters known, tiles revealed, letters used, guesses taken, boards. */
  value?: number;
}

export interface FeatDef {
  name: string;
  /** Falls back to the player's custom flag for `lang`. */
  icon?: BadgeIcon;
  /** Set on language-specific feats. */
  lang?: Language;
  category: FeatCategory;
  /** How to earn it, shown on the profile. */
  description: string;
  /** What happened in a specific game, shown in notifications and the post-game summary. */
  detail: (feat: EarnedFeat) => string;
}

/** Thresholds used to earn feats. Changing one only affects how feats are detected from now on. */
export const FEAT_RULES = {
  /** Out of Nowhere: most letters of the board colored before the solving guess. */
  outOfNowhereMaxKnown: 1,
  jackpotMinTiles: 8,
  minimalistMaxLetters: 12,
  speedrunMaxGuesses: 5,
  /** Underdog: strongest language's minimum level (index into CERTIFICATION_LEVELS) ... */
  underdogStrongestMinLevel: 2,
  /** ... and how many levels above the weakest it must be. */
  underdogMinLevelGap: 2,
  soCloseGreens: 4,
  braveryLetters: 'qwxyz',
  braveryMinLetters: 3,
};

const board = (lang?: Language) => (lang ? `the ${labelFor(lang)} board` : 'a board');

/** Solving a board on the first guess, named in that board's language. */
export const FIRST_TRY_FEATS = {
  en: 'holeInOne',
  es: 'aLaPrimera',
  fr: 'duPremierCoup',
  it: 'alPrimoColpo',
  pt: 'dePrimeira',
} as const satisfies Record<Language, FeatId>;

const FIRST_TRY_NAMES: Record<Language, { name: string; meaning?: string }> = {
  en: { name: 'Hole in One' },
  es: { name: 'A la primera', meaning: 'First time' },
  fr: { name: 'Du premier coup', meaning: 'On the first try' },
  it: { name: 'Al primo colpo', meaning: 'At the first shot' },
  pt: { name: 'De primeira', meaning: 'First time' },
};

const firstTryFeats = () =>
  Object.fromEntries(
    (Object.keys(FIRST_TRY_FEATS) as Language[]).map((lang) => {
      const { name, meaning } = FIRST_TRY_NAMES[lang];
      const def: FeatDef = {
        name,
        lang,
        category: 'local',
        description: `${meaning ? `"${meaning}." ` : ''}Solve the ${labelFor(lang)} board with your first guess.`,
        detail: () => `Solved the ${labelFor(lang)} board on your first guess.`,
      };
      return [FIRST_TRY_FEATS[lang], def];
    })
  ) as Record<(typeof FIRST_TRY_FEATS)[Language], FeatDef>;

export const FEATS: Record<FeatId, FeatDef> = {
  outOfNowhere: {
    name: 'Out of Nowhere',
    icon: IconSparkles,
    category: 'solving',
    description: `Solve a board when at most ${FEAT_RULES.outOfNowhereMaxKnown} of its letters had been colored.`,
    detail: ({ lang, value }) =>
      `Solved ${board(lang)} with only ${value} letter${value === 1 ? '' : 's'} known.`,
  },
  hailMary: {
    name: 'Hail Mary',
    icon: IconBallAmericanFootball,
    category: 'solving',
    description: 'Solve a board when none of its letters had been colored.',
    detail: ({ lang }) => `Solved ${board(lang)} with no letters known.`,
  },
  jackpot: {
    name: 'Jackpot',
    icon: IconFlare,
    category: 'solving',
    description: `Reveal ${FEAT_RULES.jackpotMinTiles} or more new colored tiles with one guess.`,
    detail: ({ value }) => `${value} new colored tiles in one guess.`,
  },
  minimalist: {
    name: 'Minimalist',
    icon: IconLetterCase,
    category: 'solving',
    description: `Win using ${FEAT_RULES.minimalistMaxLetters} or fewer different letters.`,
    detail: ({ value }) => `Won using only ${value} different letters.`,
  },
  speedrun: {
    name: 'Speedrun',
    icon: IconBolt,
    category: 'solving',
    description: `Solve every board within ${FEAT_RULES.speedrunMaxGuesses} guesses.`,
    detail: ({ guess }) => `Solved every board in ${guess} guesses.`,
  },
  underdog: {
    name: 'Underdog',
    icon: IconArrowBigUpLines,
    category: 'language',
    description: `Solve your weakest language first, when your strongest is ${
      CERTIFICATION_LEVELS[FEAT_RULES.underdogStrongestMinLevel].label
    } or higher and ${FEAT_RULES.underdogMinLevelGap}+ levels above it.`,
    detail: ({ lang }) =>
      `Solved ${lang ? labelFor(lang) : 'your weakest language'} before your stronger languages.`,
  },
  lostInTranslation: {
    name: 'Lost in Translation',
    icon: IconLanguage,
    category: 'language',
    description: 'Solve a board while its language is still unconfirmed, even after the solve.',
    detail: ({ lang }) => `Solved ${board(lang)} without ever confirming its language.`,
  },
  jeNeSaisQuoi: {
    name: 'Je ne sais quoi',
    icon: IconQuestionMark,
    category: 'language',
    description: '"I don\'t know what." Win with at least one board\'s language never confirmed.',
    detail: ({ value }) =>
      `Won with ${value} board${value === 1 ? '' : 's'} whose language was never confirmed.`,
  },
  twoBirds: {
    name: 'Two Birds',
    icon: IconFeather,
    category: 'language',
    description: 'Solve two boards with one guess.',
    detail: () => 'Solved two boards with one guess.',
  },
  dud: {
    name: 'Dolce far niente',
    icon: IconMoodEmpty,
    category: 'fun',
    description:
      '"The sweetness of doing nothing." Play a guess that reveals nothing new while every board is still open.',
    detail: () => 'That guess told you nothing new. Happens to the best of us.',
  },
  scrambled: {
    name: 'Scrambled',
    icon: IconArrowsShuffle,
    category: 'fun',
    description: 'Get 5 yellows on one board.',
    detail: ({ lang }) => `All five letters of ${board(lang)}, all in the wrong spots.`,
  },
  soClose: {
    name: 'So Close',
    icon: IconHeartBroken,
    category: 'fun',
    description: `Lose with ${FEAT_RULES.soCloseGreens} greens on an unsolved board.`,
    detail: ({ lang }) => `One letter away on ${board(lang)}.`,
  },
  bravery: {
    name: 'Bravery',
    icon: IconShieldStar,
    category: 'fun',
    description: `Play ${FEAT_RULES.braveryMinLetters} different letters from ${[
      ...FEAT_RULES.braveryLetters.toUpperCase(),
    ].join(', ')} in one game.`,
    detail: ({ value }) =>
      `Played ${value} of ${[...FEAT_RULES.braveryLetters.toUpperCase()].join(', ')} in one game.`,
  },
  ...firstTryFeats(),
  chapeau: {
    name: 'Chapeau !',
    icon: '🎩',
    lang: 'fr',
    category: 'local',
    description:
      '"Hats off," and the nickname for the circumflex. Solve a French board whose answer has a circumflex (â ê î ô û).',
    detail: () => 'Solved a French word with a circumflex.',
  },
  pinata: {
    name: 'Piñata',
    icon: '🪅',
    lang: 'es',
    category: 'local',
    description: 'Solve a Spanish board whose answer has an ñ.',
    detail: () => 'Cracked open a Spanish word with an ñ.',
  },
};

/** Display order on the profile. */
export const FEAT_ORDER: FeatId[] = [
  'outOfNowhere',
  'hailMary',
  'jackpot',
  'minimalist',
  'speedrun',
  'underdog',
  'twoBirds',
  'lostInTranslation',
  'jeNeSaisQuoi',
  'holeInOne',
  'aLaPrimera',
  'duPremierCoup',
  'alPrimoColpo',
  'dePrimeira',
  'chapeau',
  'pinata',
  'dud',
  'scrambled',
  'soClose',
  'bravery',
];

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

export interface TrackDef {
  name: string;
  icon: BadgeIcon;
  /** Language tracks render the player's custom flag instead of `icon`. */
  lang?: Language;
  /** What the count measures, e.g. "words". */
  unit: string;
  description: string;
  levels: TrackLevel[];
}

export const certificationTrack = (lang: Language): TrackDef => ({
  name: `${labelFor(lang)} certification`,
  icon: flagFor(lang),
  lang,
  unit: 'words',
  description: `Distinct ${labelFor(lang)} words you've guessed.`,
  levels: CERTIFICATION_LEVELS,
});

export type TrackId =
  | 'polyglot'
  | 'reader'
  | 'globetrotter'
  | 'streak'
  | 'regular'
  | 'duelist'
  | 'squad';

export const TRACKS: Record<TrackId, TrackDef> = {
  polyglot: {
    name: 'Polyglot',
    icon: IconWorld,
    unit: 'languages',
    description: `Languages certified at ${CERTIFICATION_LEVELS[0].label} or above.`,
    levels: [
      { label: 'Bilingual', target: 2 },
      { label: 'Trilingual', target: 3 },
      { label: 'Polyglot', target: 5 },
    ],
  },
  reader: {
    name: 'Reader',
    icon: IconBook,
    unit: 'definitions',
    description: 'Distinct word definitions you’ve opened.',
    levels: [
      { label: 'Curious', target: 10 },
      { label: 'Bookworm', target: 50 },
      { label: 'Scholar', target: 200 },
      { label: 'Lexicographer', target: 500 },
    ],
  },
  globetrotter: {
    name: 'Globetrotter',
    icon: IconPlaneTilt,
    unit: 'languages',
    description: 'Languages where you’ve opened at least 5 definitions.',
    levels: [{ label: 'Globetrotter', target: 5 }],
  },
  streak: {
    name: 'On Fire',
    icon: IconFlame,
    unit: 'wins in a row',
    description: 'Your best winning streak.',
    levels: [
      { label: '3', target: 3 },
      { label: '7', target: 7 },
      { label: '14', target: 14 },
      { label: '30', target: 30 },
    ],
  },
  regular: {
    name: 'Regular',
    icon: IconCalendarCheck,
    unit: 'games',
    description: 'Games finished.',
    levels: [
      { label: '10', target: 10 },
      { label: '50', target: 50 },
      { label: '100', target: 100 },
      { label: '250', target: 250 },
      { label: '500', target: 500 },
    ],
  },
  duelist: {
    name: 'Duelist',
    icon: IconSwords,
    unit: 'challenge wins',
    description: 'Head-to-head challenges won.',
    levels: [
      { label: '1', target: 1 },
      { label: '10', target: 10 },
      { label: '25', target: 25 },
      { label: '50', target: 50 },
    ],
  },
  squad: {
    name: 'Squad',
    icon: IconUsers,
    unit: 'friends',
    description: 'Friends added.',
    levels: [
      { label: '1', target: 1 },
      { label: '5', target: 5 },
      { label: '10', target: 10 },
    ],
  },
};

/** Minimum definitions per language for Globetrotter. */
export const GLOBETROTTER_MIN_READS = 5;
