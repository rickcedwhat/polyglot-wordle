import {
  LEGACY_SCORING_VERSION,
  MAX_GUESSES,
  SCORING_RULES,
  SCORING_VERSION,
  type ScoringRules,
} from '@/config';
import { Difficulty, Language } from '@/types/firestore';
import { decodeLanguagesFromUuid, difficultyFromHex, isV3GameId } from '@/utils/languages';

export type LetterStatus = 'unknown' | 'correct' | 'present' | 'absent';

export interface WordEntry {
  display: string;
  d: number;
  pos: string;
  def: string;
  reviewed?: boolean;
}

export type Dictionary = Record<string, WordEntry>;

// New function to remove accents and special characters
export const normalizeWord = (word: string): string => {
  return word
    .normalize('NFD') // Decomposes combined characters (e.g., 'é' -> 'e' + '´')
    .replace(/[\u0300-\u036f]/g, '') // Removes all the accent marks
    .replace('ñ', 'n') // Specifically handle the 'ñ'
    .replace('ç', 'c');
};

export const getGuessStatuses = (guess: string, solution: string): LetterStatus[] => {
  if (!solution) {
    console.error("Error: 'solution' word is undefined in getGuessStatuses.");
    return Array(guess.length).fill('empty');
  }

  const solutionLetters = normalizeWord(solution).split('');
  const guessLetters = normalizeWord(guess).split('');
  const statuses: LetterStatus[] = Array(solution.length).fill('absent');
  const letterCounts: { [key: string]: number } = {};

  for (const letter of solutionLetters) {
    letterCounts[letter] = (letterCounts[letter] || 0) + 1;
  }

  // First pass for 'correct' letters
  for (let i = 0; i < guessLetters.length; i++) {
    if (guessLetters[i] === solutionLetters[i]) {
      statuses[i] = 'correct';
      letterCounts[guessLetters[i]]--;
    }
  }

  // Second pass for 'present' letters
  for (let i = 0; i < guessLetters.length; i++) {
    if (statuses[i] !== 'correct' && letterCounts[guessLetters[i]] > 0) {
      statuses[i] = 'present';
      letterCounts[guessLetters[i]]--;
    }
  }

  return statuses;
};

const fetchDictionary = async (lang: Language): Promise<Dictionary> => {
  const response = await fetch(`/${lang}.json`);

  if (!response.ok) {
    throw new Error(`Failed to fetch dictionary for ${lang}`);
  }

  return response.json();
};

const getIndexFromHex = (hex: string, max: number): number => {
  const decimal = parseInt(hex, 16);
  return decimal % max;
};

/**
 * Decodes a game id to get a word and difficulty for every active language.
 * Legacy and v2 ids use 24 entropy digits; v3 uses eight per language.
 */
export const getWordsFromUuid = async (uuid: string) => {
  const languages = decodeLanguagesFromUuid(uuid);
  const variableLength = isV3GameId(uuid);
  const entropyLength = variableLength ? languages.length * 8 : 24;
  const difficulties: Partial<Record<Language, Difficulty>> = {};
  languages.forEach((lang, i) => {
    difficulties[lang] = difficultyFromHex(uuid[entropyLength + i] ?? '0');
  });

  const thresholds: Record<Difficulty, number> = {
    basic: 0.5,
    intermediate: 0.75,
    advanced: 1.0,
  };

  const dictEntries = await Promise.all(
    languages.map(async (lang) => [lang, await fetchDictionary(lang)] as const)
  );
  const dictionaries = Object.fromEntries(dictEntries) as Record<Language, Dictionary>;
  const solutionWords: Partial<Record<Language, string>> = {};

  languages.forEach((lang, i) => {
    const difficulty = difficulties[lang]!;
    const threshold = thresholds[difficulty];
    const dictionary = dictionaries[lang];
    const wordList = Object.keys(dictionary).filter((word) => dictionary[word].d <= threshold);

    if (wordList.length === 0) {
      throw new Error(`No words found for language ${lang} at difficulty ${difficulty}`);
    }

    const hexPart = uuid.substring(i * 8, (i + 1) * 8);
    const index = getIndexFromHex(hexPart, wordList.length);
    solutionWords[lang] = wordList[index];
  });

  const seed = parseInt(uuid[entropyLength + languages.length], 16) || 0;
  const shuffledLanguages = [...languages].sort((a, b) => {
    const valA = (a.charCodeAt(0) + seed) % languages.length;
    const valB = (b.charCodeAt(0) + seed) % languages.length;
    return valA - valB;
  });

  return {
    words: solutionWords,
    difficulties,
    shuffledLanguages,
  };
};

type SolutionWords = Partial<Record<Language, string>>;

const activeLanguages = (solution: SolutionWords): Language[] =>
  (Object.keys(solution) as Language[]).filter((lang) => Boolean(solution[lang]));

export type ScoreEventKind =
  | 'green'
  | 'yellow'
  | 'wordSolved'
  | 'gameSolved'
  | 'penalty'
  | 'crack'
  | 'hatTrick';

export interface ScoreEvent {
  kind: ScoreEventKind;
  points: number;
  lang?: Language;
  /** Letter position (0–4) for green/yellow events. */
  index?: number;
}

export const scoringVersionOf = (game: { scoringVersion?: number }): number =>
  game.scoringVersion ?? LEGACY_SCORING_VERSION;

/** 10 on guess 1 down to 3 on guess 8. */
const turnMultiplier = (guessNumber: number) => MAX_GUESSES + 3 - guessNumber;

const rulesFor = (version: number): ScoringRules =>
  SCORING_RULES[version] ?? SCORING_RULES[SCORING_VERSION];

interface ScoringState {
  greens: Partial<Record<Language, boolean[]>>;
  /** Per board, how many copies of each letter have been revealed so far. */
  knownCopies: Partial<Record<Language, Record<string, number>>>;
  cracked: boolean;
}

const newScoringState = (): ScoringState => ({ greens: {}, knownCopies: {}, cracked: false });

const countLetters = (letters: string[]): Record<string, number> =>
  letters.reduce<Record<string, number>>((counts, letter) => {
    counts[letter] = (counts[letter] ?? 0) + 1;
    return counts;
  }, {});

/** Events earned by one guess (excluding game-end events). Mutates `state`. */
const scoreTurn = (
  guess: string,
  solution: SolutionWords,
  guessNumber: number,
  state: ScoringState,
  rules: ScoringRules
): ScoreEvent[] => {
  const m = turnMultiplier(guessNumber);
  const letters = normalizeWord(guess);
  const langs = activeLanguages(solution);
  const events: ScoreEvent[] = [];
  // Every slot can turn green across earlier guesses before the word itself is typed, so a
  // board with all greens stays open for the guess that actually solves it.
  const openBoards = langs.filter(
    (lang) => !state.greens[lang]?.every(Boolean) || normalizeWord(solution[lang]!) === letters
  );
  const newGreensPerBoard: number[] = [];
  let solvedThisTurn = false;

  openBoards.forEach((lang) => {
    const solutionWord = solution[lang]!;
    const greens = state.greens[lang] ?? [false, false, false, false, false];
    const knownCopies = state.knownCopies[lang] ?? {};
    state.greens[lang] = greens;
    state.knownCopies[lang] = knownCopies;
    const statuses = getGuessStatuses(guess, solutionWord);
    // Copies of each letter this guess reveals (green or yellow). With repeated letters, a
    // yellow only scores when it shows more copies than the board already knew about.
    const shownCopies = countLetters(
      [...letters].filter((_, index) => statuses[index] !== 'absent')
    );
    const unscoredCopies = Object.fromEntries(
      Object.entries(shownCopies).map(([letter, count]) => [
        letter,
        count - (knownCopies[letter] ?? 0),
      ])
    );
    let yellowCombo = 1;
    let newGreens = 0;

    statuses.forEach((status, index) => {
      if (status === 'correct' && !greens[index]) {
        greens[index] = true;
        newGreens += 1;
        events.push({ kind: 'green', points: rules.greenPerM * m, lang, index });
      }
      if (status === 'present') {
        if (rules.yellow.mode === 'combo') {
          events.push({ kind: 'yellow', points: rules.yellow.base * yellowCombo, lang, index });
          yellowCombo += 1;
        } else if (unscoredCopies[letters[index]] > 0) {
          unscoredCopies[letters[index]] -= 1;
          events.push({ kind: 'yellow', points: rules.yellow.perM * m, lang, index });
        }
      }
    });
    newGreensPerBoard.push(newGreens);

    const solutionLetters = [...normalizeWord(solutionWord)];
    const greenCopies = countLetters(solutionLetters.filter((_, index) => greens[index]));
    new Set([...Object.keys(shownCopies), ...Object.keys(greenCopies)]).forEach((letter) => {
      knownCopies[letter] = Math.max(
        knownCopies[letter] ?? 0,
        shownCopies[letter] ?? 0,
        greenCopies[letter] ?? 0
      );
    });

    if (normalizeWord(solutionWord) === letters) {
      solvedThisTurn = true;
      events.push({ kind: 'wordSolved', points: rules.wordSolvedPerM * m, lang });
    }
  });

  if (rules.crackPerM && solvedThisTurn && !state.cracked) {
    events.push({ kind: 'crack', points: rules.crackPerM * m });
  }
  state.cracked ||= solvedThisTurn;

  const allBoardsOpen = langs.length >= 3 && openBoards.length === langs.length;
  if (rules.hatTrick && allBoardsOpen && newGreensPerBoard.every((count) => count > 0)) {
    events.push({ kind: 'hatTrick', points: rules.hatTrick });
  }

  return events;
};

const getGameEndEvents = (
  guessHistory: string[],
  solution: SolutionWords,
  rules: ScoringRules
): ScoreEvent[] => {
  const langs = activeLanguages(solution);
  const solvedByLang = Object.fromEntries(
    langs.map((lang) => [
      lang,
      guessHistory.some((g) => normalizeWord(g) === normalizeWord(solution[lang]!)),
    ])
  ) as Record<Language, boolean>;

  if (langs.every((lang) => solvedByLang[lang])) {
    const findLastGuess = (word: string) =>
      guessHistory.findIndex((g) => normalizeWord(g) === normalizeWord(word));
    const finalGuessIndex = Math.max(...langs.map((lang) => findLastGuess(solution[lang]!)));
    const totalGuessesTaken = finalGuessIndex + 1;
    return [
      { kind: 'gameSolved', points: rules.gameSolvedPerM * turnMultiplier(totalGuessesTaken) },
    ];
  }

  if (guessHistory.length >= MAX_GUESSES) {
    return langs
      .filter((lang) => !solvedByLang[lang])
      .map((lang) => ({ kind: 'penalty' as const, points: rules.unsolvedPenalty, lang }));
  }

  return [];
};

/** Per-guess events for the whole history; game-end events are appended to the last guess. */
const scoreHistory = (
  guessHistory: string[],
  solution: SolutionWords,
  version: number
): ScoreEvent[][] => {
  const rules = rulesFor(version);
  const state = newScoringState();
  const turns = guessHistory.map((guess, index) =>
    scoreTurn(guess, solution, index + 1, state, rules)
  );
  if (turns.length > 0) {
    turns[turns.length - 1].push(...getGameEndEvents(guessHistory, solution, rules));
  }
  return turns;
};

/**
 * Score events earned by the most recent guess, including any game-end bonus or penalty
 * that guess triggered.
 */
export const getLatestTurnScoreEvents = (
  guessHistory: string[],
  solution: SolutionWords,
  version: number = SCORING_VERSION
): ScoreEvent[] => scoreHistory(guessHistory, solution, version).at(-1) ?? [];

/**
 * Recalculates the entire score for a game based on its full guess history.
 */
export const calculateScoreFromHistory = (
  guessHistory: string[],
  solution: SolutionWords,
  version: number = SCORING_VERSION
): number =>
  scoreHistory(guessHistory, solution, version)
    .flat()
    .reduce((total, event) => total + event.points, 0);

/**
 * Formats a definition string by capitalizing the first letter
 * (even if it's inside parentheses) and ensuring it ends with a period.
 */
export const formatDefinition = (text: string): string => {
  if (!text) {
    return '';
  }

  // 1. Find the first alphabetic character and capitalize it.
  // The callback function ensures only the first match is affected.
  let formattedText = text.replace(/([a-zA-Z])/, (match) => match.toUpperCase());

  // 2. Ensure it ends with a period.
  if (!formattedText.endsWith('.')) {
    formattedText += '.';
  }

  return formattedText;
};

export interface SplitDefinition {
  main: string;
  note?: string;
}

/**
 * Splits a definition into its main descriptive meaning and an optional
 * trailing parenthetical inflection/grammar note (e.g. "(present tense of frenar)").
 */
export const splitDefinition = (text: string): SplitDefinition => {
  if (!text) {
    return { main: '' };
  }

  const trimmed = text.trim();
  const match = trimmed.match(/^(.*?)\s*\(([^()]+)\)\.?$/);

  if (match && match[1].trim().length > 0) {
    return {
      main: formatDefinition(match[1].trim()),
      note: match[2].trim(),
    };
  }

  return {
    main: formatDefinition(trimmed),
  };
};

export interface ValidateGuessParams {
  guess: string;
  masterPools: Partial<Record<Language, string[]>>;
  solution: SolutionWords;
  isChallenge?: boolean;
  previousGuesses?: string[];
}

export interface GuessValidationResult {
  isValid: boolean;
  matchedLangs: Language[];
  solutionLangs: Language[];
}

/**
 * Validates a 5-letter guess against the loaded master dictionaries.
 *
 * In challenge mode (isChallenge: true), inherited solution words from the
 * challenger's session are always accepted as valid guesses even if they
 * are absent from the local/current master dictionary (preventing soft-locks
 * caused by dictionary drift).
 */
export const validateGuess = ({
  guess,
  masterPools,
  solution,
  isChallenge = false,
  previousGuesses = [],
}: ValidateGuessParams): GuessValidationResult => {
  const normGuess = normalizeWord(guess);

  if (normGuess.length !== 5) {
    return { isValid: false, matchedLangs: [], solutionLangs: [] };
  }

  if (previousGuesses.map(normalizeWord).includes(normGuess)) {
    return { isValid: false, matchedLangs: [], solutionLangs: [] };
  }

  const langs = activeLanguages(solution);
  const matchedLangs: Language[] = [];
  const solutionLangs: Language[] = [];

  langs.forEach((lang) => {
    const pool = masterPools[lang] ?? [];
    const inMaster = pool.some((w) => normalizeWord(w) === normGuess);
    const isSolution = Boolean(solution[lang] && normGuess === normalizeWord(solution[lang]!));
    if (isSolution) {
      solutionLangs.push(lang);
    }
    if (inMaster || (isChallenge && isSolution)) {
      matchedLangs.push(lang);
    }
  });

  if (matchedLangs.length === 0) {
    return { isValid: false, matchedLangs: [], solutionLangs: [] };
  }

  return {
    isValid: true,
    matchedLangs,
    solutionLangs,
  };
};
