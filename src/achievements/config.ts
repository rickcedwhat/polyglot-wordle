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
  IconMoodConfuzed,
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
import i18n from '@/i18n';
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

const category = (id: FeatCategory, color: string) => ({
  get label() {
    return i18n.t(`feats.categories.${id}`);
  },
  color,
});

export const FEAT_CATEGORIES: Record<FeatCategory, { label: string; color: string }> = {
  solving: category('solving', 'teal'),
  language: category('language', 'violet'),
  local: category('local', 'orange'),
  fun: category('fun', 'pink'),
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
  | 'bravery'
  | 'noInstructions'
  | 'wtf';

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
  /** No Instructions For Me: guesses that go against what every open board already showed. */
  noInstructionsMinGuesses: 3,
  /** WTF Are You Doing: the same, but more of them. */
  wtfMinGuesses: 4,
};

const board = (lang?: Language) =>
  lang ? i18n.t('feats.board', { language: labelFor(lang) }) : i18n.t('feats.aBoard');

/** A kept foreign name's meaning, left off when the interface is already in that language. */
const glossed = (lang: Language, meaning: string, description: string) =>
  i18n.language === lang ? description : i18n.t('feats.gloss', { meaning, description });

const BRAVERY_LETTERS = [...FEAT_RULES.braveryLetters.toUpperCase()].join(', ');

/** Solving a board on the first guess, named in that board's language. */
export const FIRST_TRY_FEATS = {
  en: 'holeInOne',
  es: 'aLaPrimera',
  fr: 'duPremierCoup',
  it: 'alPrimoColpo',
  pt: 'dePrimeira',
} as const satisfies Record<Language, FeatId>;

const FIRST_TRY_NAMES: Record<Language, string> = {
  en: 'Hole in One',
  es: 'A la primera',
  fr: 'Du premier coup',
  it: 'Al primo colpo',
  pt: 'De primeira',
};

const firstTryFeats = () =>
  Object.fromEntries(
    (Object.keys(FIRST_TRY_FEATS) as Language[]).map((lang) => {
      const def: FeatDef = {
        name: FIRST_TRY_NAMES[lang],
        lang,
        category: 'local',
        get description() {
          const description = i18n.t('feats.firstTry.description', { language: labelFor(lang) });
          return lang === 'en'
            ? description
            : glossed(lang, i18n.t(`feats.firstTry.meanings.${lang}`), description);
        },
        detail: () => i18n.t('feats.firstTry.detail', { language: labelFor(lang) }),
      };
      return [FIRST_TRY_FEATS[lang], def];
    })
  ) as Record<(typeof FIRST_TRY_FEATS)[Language], FeatDef>;

export const FEATS: Record<FeatId, FeatDef> = {
  outOfNowhere: {
    get name() {
      return i18n.t('feats.outOfNowhere.name');
    },
    icon: IconSparkles,
    category: 'solving',
    get description() {
      return i18n.t('feats.outOfNowhere.description', { max: FEAT_RULES.outOfNowhereMaxKnown });
    },
    detail: ({ lang, value }) =>
      i18n.t('feats.outOfNowhere.detail', { board: board(lang), count: value ?? 0 }),
  },
  hailMary: {
    get name() {
      return i18n.t('feats.hailMary.name');
    },
    icon: IconBallAmericanFootball,
    category: 'solving',
    get description() {
      return i18n.t('feats.hailMary.description');
    },
    detail: ({ lang }) => i18n.t('feats.hailMary.detail', { board: board(lang) }),
  },
  jackpot: {
    get name() {
      return i18n.t('feats.jackpot.name');
    },
    icon: IconFlare,
    category: 'solving',
    get description() {
      return i18n.t('feats.jackpot.description', { min: FEAT_RULES.jackpotMinTiles });
    },
    detail: ({ value }) => i18n.t('feats.jackpot.detail', { count: value ?? 0 }),
  },
  minimalist: {
    get name() {
      return i18n.t('feats.minimalist.name');
    },
    icon: IconLetterCase,
    category: 'solving',
    get description() {
      return i18n.t('feats.minimalist.description', { max: FEAT_RULES.minimalistMaxLetters });
    },
    detail: ({ value }) => i18n.t('feats.minimalist.detail', { count: value ?? 0 }),
  },
  speedrun: {
    get name() {
      return i18n.t('feats.speedrun.name');
    },
    icon: IconBolt,
    category: 'solving',
    get description() {
      return i18n.t('feats.speedrun.description', { max: FEAT_RULES.speedrunMaxGuesses });
    },
    detail: ({ guess }) => i18n.t('feats.speedrun.detail', { count: guess }),
  },
  underdog: {
    get name() {
      return i18n.t('feats.underdog.name');
    },
    icon: IconArrowBigUpLines,
    category: 'language',
    get description() {
      return i18n.t('feats.underdog.description', {
        level: CERTIFICATION_LEVELS[FEAT_RULES.underdogStrongestMinLevel].label,
        gap: FEAT_RULES.underdogMinLevelGap,
      });
    },
    detail: ({ lang }) =>
      lang
        ? i18n.t('feats.underdog.detail', { language: labelFor(lang) })
        : i18n.t('feats.underdog.detailUnknown'),
  },
  lostInTranslation: {
    name: 'Lost in Translation',
    icon: IconLanguage,
    category: 'language',
    get description() {
      return glossed(
        'en',
        i18n.t('feats.lostInTranslation.gloss'),
        i18n.t('feats.lostInTranslation.description')
      );
    },
    detail: ({ lang }) => i18n.t('feats.lostInTranslation.detail', { board: board(lang) }),
  },
  jeNeSaisQuoi: {
    name: 'Je ne sais quoi',
    icon: IconQuestionMark,
    category: 'language',
    get description() {
      return glossed(
        'fr',
        i18n.t('feats.jeNeSaisQuoi.gloss'),
        i18n.t('feats.jeNeSaisQuoi.description')
      );
    },
    detail: ({ value }) => i18n.t('feats.jeNeSaisQuoi.detail', { count: value ?? 0 }),
  },
  twoBirds: {
    get name() {
      return i18n.t('feats.twoBirds.name');
    },
    icon: IconFeather,
    category: 'language',
    get description() {
      return i18n.t('feats.twoBirds.description');
    },
    detail: () => i18n.t('feats.twoBirds.detail'),
  },
  dud: {
    name: 'Dolce far niente',
    icon: IconMoodEmpty,
    category: 'fun',
    get description() {
      return glossed('it', i18n.t('feats.dud.gloss'), i18n.t('feats.dud.description'));
    },
    detail: () => i18n.t('feats.dud.detail'),
  },
  scrambled: {
    get name() {
      return i18n.t('feats.scrambled.name');
    },
    icon: IconArrowsShuffle,
    category: 'fun',
    get description() {
      return i18n.t('feats.scrambled.description');
    },
    detail: ({ lang }) => i18n.t('feats.scrambled.detail', { board: board(lang) }),
  },
  soClose: {
    get name() {
      return i18n.t('feats.soClose.name');
    },
    icon: IconHeartBroken,
    category: 'fun',
    get description() {
      return i18n.t('feats.soClose.description', { greens: FEAT_RULES.soCloseGreens });
    },
    detail: ({ lang }) => i18n.t('feats.soClose.detail', { board: board(lang) }),
  },
  bravery: {
    get name() {
      return i18n.t('feats.bravery.name');
    },
    icon: IconShieldStar,
    category: 'fun',
    get description() {
      return i18n.t('feats.bravery.description', {
        min: FEAT_RULES.braveryMinLetters,
        letters: BRAVERY_LETTERS,
      });
    },
    detail: ({ value }) =>
      i18n.t('feats.bravery.detail', { count: value ?? 0, letters: BRAVERY_LETTERS }),
  },
  noInstructions: {
    get name() {
      return i18n.t('feats.noInstructions.name');
    },
    icon: IconMoodConfuzed,
    category: 'fun',
    get description() {
      return i18n.t('feats.noInstructions.description', {
        min: FEAT_RULES.noInstructionsMinGuesses,
      });
    },
    detail: () => i18n.t('feats.noInstructions.detail'),
  },
  wtf: {
    name: 'WTF Are You Doing',
    icon: IconQuestionMark,
    category: 'fun',
    get description() {
      return glossed(
        'en',
        i18n.t('feats.wtf.gloss'),
        i18n.t('feats.wtf.description', { min: FEAT_RULES.wtfMinGuesses })
      );
    },
    detail: ({ value }) => i18n.t('feats.wtf.detail', { count: value ?? 0 }),
  },
  ...firstTryFeats(),
  chapeau: {
    name: 'Chapeau !',
    icon: '🎩',
    lang: 'fr',
    category: 'local',
    get description() {
      return glossed('fr', i18n.t('feats.chapeau.gloss'), i18n.t('feats.chapeau.description'));
    },
    detail: () => i18n.t('feats.chapeau.detail'),
  },
  pinata: {
    name: 'Piñata',
    icon: '🪅',
    lang: 'es',
    category: 'local',
    get description() {
      return i18n.t('feats.pinata.description');
    },
    detail: () => i18n.t('feats.pinata.detail'),
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
  'noInstructions',
  'wtf',
];

// ---------------------------------------------------------------------------
// Tracks
// ---------------------------------------------------------------------------

export interface TrackDef {
  name: string;
  icon: BadgeIcon;
  /** Language tracks render the player's custom flag instead of `icon`. */
  lang?: Language;
  /** A count with its unit, e.g. "12 words". */
  amount: (count: number) => string;
  description: string;
  levels: TrackLevel[];
}

type TrackUnit =
  | 'words'
  | 'languages'
  | 'definitions'
  | 'wins'
  | 'games'
  | 'challengeWins'
  | 'friends';

const amountIn = (unit: TrackUnit) => (count: number) => i18n.t(`tracks.units.${unit}`, { count });

/** A level whose label is looked up in the current interface language. */
const namedLevel = (label: () => string, target: number): TrackLevel => ({
  get label() {
    return label();
  },
  target,
});

const numberLevels = (...targets: number[]): TrackLevel[] =>
  targets.map((target) => ({ label: String(target), target }));

export const certificationTrack = (lang: Language): TrackDef => ({
  get name() {
    return i18n.t('tracks.certification.name', { language: labelFor(lang) });
  },
  icon: flagFor(lang),
  lang,
  amount: amountIn('words'),
  get description() {
    return i18n.t('tracks.certification.description', { language: labelFor(lang) });
  },
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

/** Minimum definitions per language for Globetrotter. */
export const GLOBETROTTER_MIN_READS = 5;

export const TRACKS: Record<TrackId, TrackDef> = {
  polyglot: {
    get name() {
      return i18n.t('tracks.polyglot.name');
    },
    icon: IconWorld,
    amount: amountIn('languages'),
    get description() {
      return i18n.t('tracks.polyglot.description', { level: CERTIFICATION_LEVELS[0].label });
    },
    levels: [
      namedLevel(() => i18n.t('tracks.polyglot.levels.bilingual'), 2),
      namedLevel(() => i18n.t('tracks.polyglot.levels.trilingual'), 3),
      namedLevel(() => i18n.t('tracks.polyglot.levels.polyglot'), 5),
    ],
  },
  reader: {
    get name() {
      return i18n.t('tracks.reader.name');
    },
    icon: IconBook,
    amount: amountIn('definitions'),
    get description() {
      return i18n.t('tracks.reader.description');
    },
    levels: [
      namedLevel(() => i18n.t('tracks.reader.levels.curious'), 10),
      namedLevel(() => i18n.t('tracks.reader.levels.bookworm'), 50),
      namedLevel(() => i18n.t('tracks.reader.levels.scholar'), 200),
      namedLevel(() => i18n.t('tracks.reader.levels.lexicographer'), 500),
    ],
  },
  globetrotter: {
    get name() {
      return i18n.t('tracks.globetrotter.name');
    },
    icon: IconPlaneTilt,
    amount: amountIn('languages'),
    get description() {
      return i18n.t('tracks.globetrotter.description', { min: GLOBETROTTER_MIN_READS });
    },
    levels: [namedLevel(() => i18n.t('tracks.globetrotter.name'), 5)],
  },
  streak: {
    get name() {
      return i18n.t('tracks.streak.name');
    },
    icon: IconFlame,
    amount: amountIn('wins'),
    get description() {
      return i18n.t('tracks.streak.description');
    },
    levels: numberLevels(3, 7, 14, 30),
  },
  regular: {
    get name() {
      return i18n.t('tracks.regular.name');
    },
    icon: IconCalendarCheck,
    amount: amountIn('games'),
    get description() {
      return i18n.t('tracks.regular.description');
    },
    levels: numberLevels(10, 50, 100, 250, 500),
  },
  duelist: {
    get name() {
      return i18n.t('tracks.duelist.name');
    },
    icon: IconSwords,
    amount: amountIn('challengeWins'),
    get description() {
      return i18n.t('tracks.duelist.description');
    },
    levels: numberLevels(1, 10, 25, 50),
  },
  squad: {
    get name() {
      return i18n.t('tracks.squad.name');
    },
    icon: IconUsers,
    amount: amountIn('friends'),
    get description() {
      return i18n.t('tracks.squad.description');
    },
    levels: numberLevels(1, 5, 10),
  },
};
