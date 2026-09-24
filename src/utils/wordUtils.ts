import {
  GAME_SOLVED_BONUS,
  GREEN_LETTER_BONUS,
  MAX_GUESSES,
  UNSOLVED_GAME_PENALTY,
  WORD_SOLVED_BONUS,
  YELLOW_LETTER_BONUS,
} from '@/config';
import { Difficulty, Language } from '@/types/firestore';
import { decodeLanguagesFromUuid, difficultyFromHex } from '@/utils/languages';

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

/** Entropy slices map to board languages in canonical (encoded) order. */
const ENTROPY_SLICES = [
  { start: 0, end: 8 },
  { start: 8, end: 16 },
  { start: 16, end: 24 },
] as const;

/**
 * Decodes a game UUID to get the word and difficulty for the three active languages.
 * Legacy ids always use en/es/fr; v2 ids (ending in `a`) encode languages at [28–30].
 */
export const getWordsFromUuid = async (uuid: string) => {
  const languages = decodeLanguagesFromUuid(uuid);
  const difficulties: Partial<Record<Language, Difficulty>> = {};
  languages.forEach((lang, i) => {
    difficulties[lang] = difficultyFromHex(uuid[24 + i] ?? '0');
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

    const { start, end } = ENTROPY_SLICES[i];
    const hexPart = uuid.substring(start, end);
    const index = getIndexFromHex(hexPart, wordList.length);
    solutionWords[lang] = wordList[index];
  });

  const seed = parseInt(uuid[27], 16) || 0;
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

/**
 * Calculates the points earned for a single turn.
 * @param currentGuess The guess that was just submitted.
 * @param solution The solution words object.
 * @param guessNumber The number of the current guess (e.g., 1 for the first guess).
 * @param scoredGreenSlots The current state of which green tiles have been scored.
 * @returns An object with the score for the turn and the updated green slots tracker.
 */
type SolutionWords = Partial<Record<Language, string>>;
type ScoredGreenSlots = Partial<Record<Language, boolean[]>>;

const activeLanguages = (solution: SolutionWords): Language[] =>
  (Object.keys(solution) as Language[]).filter((lang) => Boolean(solution[lang]));

const emptyScoredSlots = (langs: Language[]): ScoredGreenSlots =>
  Object.fromEntries(langs.map((lang) => [lang, [false, false, false, false, false]]));

export const getScoreForTurn = (
  currentGuess: string,
  solution: SolutionWords,
  guessNumber: number,
  scoredGreenSlots: ScoredGreenSlots
) => {
  let turnScore = 0;
  const updatedScoredSlots = JSON.parse(JSON.stringify(scoredGreenSlots)) as ScoredGreenSlots;

  console.log(`--- Turn #${guessNumber}, Guess: "${currentGuess}" ---`);

  activeLanguages(solution).forEach((lang) => {
    const solutionWord = solution[lang]!;
    const slots = scoredGreenSlots[lang] ?? [false, false, false, false, false];
    if (!updatedScoredSlots[lang]) {
      updatedScoredSlots[lang] = [false, false, false, false, false];
    }

    const wasPreviouslySolved = slots.every((slot) => slot) && solutionWord !== currentGuess;

    if (wasPreviouslySolved) {
      return;
    }

    const statuses = getGuessStatuses(currentGuess, solutionWord);
    let yellowComboCounter = 1;

    statuses.forEach((status, letterIndex) => {
      if (status === 'correct' && !updatedScoredSlots[lang]![letterIndex]) {
        const points = GREEN_LETTER_BONUS * (MAX_GUESSES + 3 - guessNumber);
        console.log(
          `[${lang.toUpperCase()}] Green bonus for '${currentGuess[letterIndex]}' in position ${letterIndex + 1}: +${points}`
        );
        turnScore += points;
        updatedScoredSlots[lang]![letterIndex] = true;
      }
      if (status === 'present') {
        const points = YELLOW_LETTER_BONUS * yellowComboCounter;
        console.log(
          `[${lang.toUpperCase()}] Yellow combo for '${currentGuess[letterIndex]}': +${points}`
        );
        turnScore += points;
        yellowComboCounter += 1;
      }
    });

    if (normalizeWord(solutionWord) === normalizeWord(currentGuess)) {
      const points = WORD_SOLVED_BONUS * (MAX_GUESSES + 3 - guessNumber);
      console.log(`[${lang.toUpperCase()}] Word Solved Bonus: +${points}`);
      turnScore += points;
    }
  });

  return { turnScore, updatedScoredSlots };
};

/**
 * Recalculates the entire score for a game based on its full guess history.
 */
export const calculateScoreFromHistory = (
  guessHistory: string[],
  solution: SolutionWords
): number => {
  let totalScore = 0;
  const langs = activeLanguages(solution);
  const scoredGreenSlots = emptyScoredSlots(langs);

  guessHistory.forEach((guess, index) => {
    const guessNumber = index + 1;
    const { turnScore, updatedScoredSlots } = getScoreForTurn(
      guess,
      solution,
      guessNumber,
      scoredGreenSlots
    );
    totalScore += turnScore;
    Object.assign(scoredGreenSlots, updatedScoredSlots);
  });

  const solvedByLang = Object.fromEntries(
    langs.map((lang) => [
      lang,
      guessHistory.some((g) => normalizeWord(g) === normalizeWord(solution[lang]!)),
    ])
  ) as Record<Language, boolean>;
  const allSolved = langs.every((lang) => solvedByLang[lang]);

  if (allSolved) {
    const findLastGuess = (word: string) =>
      guessHistory.findIndex((g) => normalizeWord(g) === normalizeWord(word));
    const finalGuessIndex = Math.max(...langs.map((lang) => findLastGuess(solution[lang]!)));
    const totalGuessesTaken = finalGuessIndex + 1;
    const points = GAME_SOLVED_BONUS * (MAX_GUESSES + 3 - totalGuessesTaken);
    console.log(`[GAME] Bonus for winning the game: +${points}`);
    totalScore += points;
  } else if (guessHistory.length >= MAX_GUESSES) {
    langs.forEach((lang) => {
      if (!solvedByLang[lang]) {
        console.log(
          `[${lang.toUpperCase()}] Penalty for not solving word: -${UNSOLVED_GAME_PENALTY}`
        );
        totalScore += UNSOLVED_GAME_PENALTY;
      }
    });
  }

  return totalScore;
};

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
