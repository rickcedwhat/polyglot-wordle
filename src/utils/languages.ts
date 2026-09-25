import type { Difficulty, Language, LanguageCombo } from '@/types/firestore';

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
const V3_GAME_ID_MARKER = 'w';

/** v2 game IDs end with a nonhex marker and encode language codes at indices 28–30. */
export function isV2GameId(uuid: string): boolean {
  return (
    uuid.length === 32 &&
    /^[0-9a-f]{31}$/i.test(uuid.slice(0, 31)) &&
    uuid[31]?.toLowerCase() === V2_GAME_ID_MARKER
  );
}

/** v3 ids use eight entropy digits and one difficulty/language digit per board. */
export function isV3GameId(uuid: string): boolean {
  const count = (uuid.length - 2) / 10;
  if (
    !Number.isInteger(count) ||
    count < 4 ||
    count > ALL_LANGUAGES.length ||
    uuid.at(-1)?.toLowerCase() !== V3_GAME_ID_MARKER ||
    !/^[0-9a-f]+$/i.test(uuid.slice(0, -1))
  ) {
    return false;
  }
  const languages = [...uuid.slice(count * 9 + 1, -1)].map((code) => CODE_TO_LANG[code]);
  return (
    languages.length === count && languages.every(Boolean) && new Set(languages).size === count
  );
}

export function decodeLanguagesFromUuid(uuid: string): LanguageCombo {
  if (isV3GameId(uuid)) {
    const count = (uuid.length - 2) / 10;
    return [...uuid.slice(count * 9 + 1, -1)].map((code) => CODE_TO_LANG[code]) as LanguageCombo;
  }
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
 * v2 (three boards): 24 entropy digits, three difficulties, seed, three languages, `v`.
 * v3 (four or five): eight entropy digits per board, one difficulty per board,
 * seed, one language code per board, `w`.
 */
export function buildGameId(params: {
  entropyHex: string;
  languages: LanguageCombo;
  difficulties: Difficulty[];
  seedNibble: string;
}): string {
  const { entropyHex, languages, difficulties, seedNibble } = params;
  if (!isLanguageCombo(languages)) {
    throw new Error('languages must contain three or more unique supported codes');
  }
  if (!new RegExp(`^[0-9a-f]{${languages.length * 8}}$`, 'i').test(entropyHex)) {
    throw new Error('entropyHex must contain eight hex characters per language');
  }
  if (difficulties.length !== languages.length) {
    throw new Error('difficulties must match languages');
  }
  if (!/^[0-9a-f]$/i.test(seedNibble)) {
    throw new Error('seedNibble must be one hex character');
  }
  const diffPart = difficulties.map(difficultyToHex).join('');
  const langPart = languages.map((lang) => LANG_TO_CODE[lang]).join('');
  const marker = languages.length === 3 ? V2_GAME_ID_MARKER : V3_GAME_ID_MARKER;
  return `${entropyHex}${diffPart}${seedNibble}${langPart}${marker}`.toLowerCase();
}

export function sortLanguages(langs: Language[]): Language[] {
  const order = new Map(ALL_LANGUAGES.map((lang, i) => [lang, i]));
  return [...langs].sort((a, b) => (order.get(a) ?? 99) - (order.get(b) ?? 99));
}

export function isLanguageCombo(value: unknown): value is LanguageCombo {
  return (
    Array.isArray(value) &&
    value.length >= 3 &&
    value.length <= ALL_LANGUAGES.length &&
    value.every((lang) => ALL_LANGUAGES.includes(lang as Language)) &&
    new Set(value).size === value.length
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
}): LanguageCombo {
  if (isLanguageCombo(game.shuffledLanguages)) {
    return game.shuffledLanguages;
  }
  const fromWords = ALL_LANGUAGES.filter((lang) => Boolean(game.words?.[lang]));
  if (isLanguageCombo(fromWords)) {
    return fromWords;
  }
  return [...DEFAULT_LANGUAGES];
}

/** Path segment like `en-it-pt` (order preserved; at least three unique codes). */
export function formatLangCombo(languages: Language[]): string {
  return languages.join('-').toLowerCase();
}

export function parseLangCombo(segment: string | undefined): LanguageCombo | null {
  if (!segment) {
    return null;
  }
  const parts = segment.toLowerCase().split('-');
  if (!isLanguageCombo(parts)) {
    return null;
  }
  return parts;
}

export function isLangComboSegment(segment: string | undefined): boolean {
  return parseLangCombo(segment) !== null;
}

/** Legacy hex, v2, or v3 game id. */
export function isGameId(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return isV2GameId(value) || isV3GameId(value) || /^[0-9a-f]{32}$/i.test(value);
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
  const combo = isLanguageCombo(languages)
    ? formatLangCombo(languages)
    : isV2GameId(gameId) || isV3GameId(gameId)
      ? formatLangCombo(decodeLanguagesFromUuid(gameId))
      : null;

  const base = combo ? `/game/${combo}/${gameId}` : `/game/${gameId}`;
  if (search?.challenger) {
    return `${base}?challenger=${encodeURIComponent(search.challenger)}`;
  }
  return base;
}
