export type LetterStatus = 'empty' | 'correct' | 'present' | 'absent';
export type Dictionary = Record<string, number>;

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

  // 1. Convert both the guess and the solution to lowercase for a fair comparison.
  const lowerGuess = guess.toLowerCase();
  const lowerSolution = solution.toLowerCase();

  const solutionLetters = lowerSolution.split('');
  const guessLetters = lowerGuess.split('');
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

type Difficulty = 'basic' | 'intermediate' | 'advanced';
type Language = 'en' | 'es' | 'fr';

/**
 * Determines a difficulty level from a single hexadecimal character.
 */
const getDifficultyFromHex = (hexChar: string): Difficulty => {
  const value = parseInt(hexChar, 16);
  if (value <= 4) {
    return 'basic';
  }
  if (value <= 9) {
    return 'intermediate';
  }
  return 'advanced';
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
 * Decodes a game UUID to get the word and difficulty for all three languages,
 * including words from lower difficulty tiers.
 */
export const getWordsFromUuid = async (uuid: string) => {
  const difficulties: Record<Language, Difficulty> = {
    en: getDifficultyFromHex(uuid[24]),
    es: getDifficultyFromHex(uuid[25]),
    fr: getDifficultyFromHex(uuid[26]),
  };

  const thresholds: Record<Difficulty, number> = {
    basic: 0.5,
    intermediate: 0.75,
    advanced: 1.0, // No upper limit
  };

  const [enDict, esDict, frDict] = await Promise.all([
    fetchDictionary('en'),
    fetchDictionary('es'),
    fetchDictionary('fr'),
  ]);

  const dictionaries = { en: enDict, es: esDict, fr: frDict };
  const solutionWords: Record<string, string> = {};

  // Define the slicing points for the UUID
  const sliceMap = {
    en: { start: 0, end: 8 },
    es: { start: 8, end: 16 },
    fr: { start: 16, end: 24 },
  };

  (['en', 'es', 'fr'] as Language[]).forEach((lang) => {
    const threshold = thresholds[difficulties[lang]];
    const dictionary = dictionaries[lang];

    const wordList = Object.keys(dictionary).filter((word) => dictionary[word] <= threshold);

    if (wordList.length === 0) {
      throw new Error(`No words found for language ${lang} at difficulty ${difficulties[lang]}`);
    }

    // Use the slice map to get the correct part of the UUID
    const { start, end } = sliceMap[lang];
    const hexPart = uuid.substring(start, end);

    const index = getIndexFromHex(hexPart, wordList.length);
    solutionWords[lang] = wordList[index];
  });

  return {
    words: {
      en: solutionWords.en.toUpperCase(),
      es: solutionWords.es.toUpperCase(),
      fr: solutionWords.fr.toUpperCase(),
    },
    difficulties,
  };
};
