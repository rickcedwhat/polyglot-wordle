import type { Difficulty, Language } from '@/types/firestore';

/** All dictionaries available to the game. */
export const ALL_LANGUAGES = ['en', 'es', 'fr', 'it', 'pt'] as const satisfies readonly Language[];

/** Default New Game triple (legacy / first-run). */
export const DEFAULT_LANGUAGES: [Language, Language, Language] = ['en', 'es', 'fr'];

export const LANGUAGE_META: Record<Language, { name: string; flag: string }> = {
  en: { name: 'English', flag: '🇬🇧' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  fr: { name: 'French', flag: '🇫🇷' },
  it: { name: 'Italian', flag: '🇮🇹' },
  pt: { name: 'Portuguese', flag: '🇵🇹' },
};

const LANG_TO_CODE: Record<Language, string> = {
  en: '0',
  es: '1',
  fr: '2',
  it: '3',
  pt: '4',
};

const CODE_TO_LANG: Record<string, Language> = {
  '0': 'en',
  '1': 'es',
  '2': 'fr',
  '3': 'it',
  '4': 'pt',
};

/** UUID nibble → difficulty (same bands as legacy). */
export function difficultyFromHex(hexChar: string): Difficulty {
  const value = Number.parseInt(hexChar, 16);
  if (value <= 4) {
    return 'basic';
  }
  if (value <= 9) {
    return 'intermediate';
  }
  return 'advanced';
}

export function difficultyToHex(difficulty: Difficulty): string {
  if (difficulty === 'basic') {
    return '0';
  }
  if (difficulty === 'intermediate') {
    return '5';
  }
  return 'a';
}

const V2_GAME_ID_MARKER = 'v';

/** v2 game IDs end with a nonhex marker and encode language codes at indices 28–30. */
export function isV2GameId(uuid: string): boolean {
  return (
    uuid.length === 32 &&
    /^[0-9a-f]{31}$/i.test(uuid.slice(0, 31)) &&
    uuid[31]?.toLowerCase() === V2_GAME_ID_MARKER
  );
}

export function decodeLanguagesFromUuid(uuid: string): [Language, Language, Language] {
  if (!isV2GameId(uuid)) {
    return [...DEFAULT_LANGUAGES];
  }
  const a = CODE_TO_LANG[uuid[28]?.toLowerCase()];
  const b = CODE_TO_LANG[uuid[29]?.toLowerCase()];
  const c = CODE_TO_LANG[uuid[30]?.toLowerCase()];
  if (!a || !b || !c || new Set([a, b, c]).size !== 3) {
    return [...DEFAULT_LANGUAGES];
  }
  return [a, b, c];
}

/**
 * Build a 32-char game id:
 * [0–23] word-index entropy · [24–26] difficulties · [27] shuffle seed ·
 * [28–30] language codes · [31] version marker `v`
 */
export function buildGameId(params: {
  entropy24: string;
  languages: [Language, Language, Language];
  difficulties: [Difficulty, Difficulty, Difficulty];
  seedNibble: string;
}): string {
  const { entropy24, languages, difficulties, seedNibble } = params;
  if (!/^[0-9a-f]{24}$/i.test(entropy24)) {
    throw new Error('entropy24 must be 24 hex characters');
  }
  if (new Set(languages).size !== 3) {
    throw new Error('languages must be three unique codes');
  }
  const diffPart = difficulties.map(difficultyToHex).join('');
  const langPart = languages.map((lang) => LANG_TO_CODE[lang]).join('');
  const seed = seedNibble[0] || '0';
  return `${entropy24}${diffPart}${seed}${langPart}${V2_GAME_ID_MARKER}`.toLowerCase();
}

export function sortLanguages(langs: Language[]): Language[] {
  const order = new Map(ALL_LANGUAGES.map((lang, i) => [lang, i]));
  return [...langs].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
}

export function isLanguageTriple(value: unknown): value is [Language, Language, Language] {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((lang) => ALL_LANGUAGES.includes(lang as Language)) &&
    new Set(value).size === 3
  );
}

export function labelFor(lang: Language): string {
  return LANGUAGE_META[lang]?.name ?? lang.toUpperCase();
}

export function flagFor(lang: Language): string {
  return LANGUAGE_META[lang]?.flag ?? '';
}

/** Prefer shuffledLanguages from the game doc; fall back to keys of words / default. */
export function languagesFromGame(game: {
  shuffledLanguages?: Language[];
  words?: Partial<Record<Language, string>>;
}): Language[] {
  if (game.shuffledLanguages?.length === 3) {
    return game.shuffledLanguages;
  }
  const fromWords = ALL_LANGUAGES.filter((lang) => Boolean(game.words?.[lang]));
  if (fromWords.length === 3) {
    return fromWords;
  }
  return [...DEFAULT_LANGUAGES];
}

/** Path segment like `en-it-pt` (order preserved; must be 3 unique supported codes). */
export function formatLangCombo(languages: Language[]): string {
  return languages.join('-').toLowerCase();
}

export function parseLangCombo(segment: string | undefined): [Language, Language, Language] | null {
  if (!segment) {
    return null;
  }
  const parts = segment.toLowerCase().split('-');
  if (!isLanguageTriple(parts)) {
    return null;
  }
  return parts;
}

export function isLangComboSegment(segment: string | undefined): boolean {
  return parseLangCombo(segment) !== null;
}

/** 32-char legacy hex id, or v2 id ending in the version marker. */
export function isGameId(value: string | undefined): boolean {
  if (!value || value.length !== 32) {
    return false;
  }
  return isV2GameId(value) || /^[0-9a-f]{32}$/i.test(value);
}

/**
 * Canonical in-app / share path for a game.
 * Prefers `/game/en-it-pt/:gameId`; falls back to legacy `/game/:gameId`.
 */
export function gamePath(
  gameId: string,
  languages?: Language[] | null,
  search?: { challenger?: string | null }
): string {
  const combo =
    languages && languages.length === 3 && isLanguageTriple(languages)
      ? formatLangCombo(languages)
      : isV2GameId(gameId)
        ? formatLangCombo(decodeLanguagesFromUuid(gameId))
        : null;

  const base = combo ? `/game/${combo}/${gameId}` : `/game/${gameId}`;
  if (search?.challenger) {
    return `${base}?challenger=${encodeURIComponent(search.challenger)}`;
  }
  return base;
}
