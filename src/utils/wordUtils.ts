export type LetterStatus = 'empty' | 'correct' | 'present' | 'absent';

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

const fetchDictionary = async (lang: Language, difficulty: Difficulty): Promise<string[]> => {
  const path = `/${lang}/${difficulty}.json`;
  console.log(`[fetchDictionary] Attempting to fetch: ${path}`);

  const response = await fetch(path);

  if (!response.ok) {
    console.error(`[fetchDictionary] FAILED response for ${path}:`, response.status);
    throw new Error(`Failed to fetch ${difficulty} dictionary for ${lang}`);
  }

  console.log(`[fetchDictionary] Successfully fetched: ${path}`);
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

  console.log('[getWordsFromUuid] Calculated difficulties:', difficulties);

  const wordPools = await Promise.all(
    (['en', 'es', 'fr'] as Language[]).map(async (lang) => {
      const difficulty = difficulties[lang];
      const filesToFetch: Promise<string[]>[] = [fetchDictionary(lang, 'basic')];

      if (difficulty === 'intermediate') {
        filesToFetch.push(fetchDictionary(lang, 'intermediate'));
      } else if (difficulty === 'advanced') {
        filesToFetch.push(fetchDictionary(lang, 'intermediate'));
        filesToFetch.push(fetchDictionary(lang, 'advanced'));
      }

      const wordLists = await Promise.all(filesToFetch);
      return wordLists.flat(); // Combine all fetched lists into one pool
    })
  );

  const [enPool, esPool, frPool] = wordPools;

  const enIndex = getIndexFromHex(uuid.substring(0, 8), enPool.length);
  const esIndex = getIndexFromHex(uuid.substring(8, 16), esPool.length);
  const frIndex = getIndexFromHex(uuid.substring(16, 24), frPool.length);

  return {
    words: {
      en: enPool[enIndex].toUpperCase(),
      es: esPool[esIndex].toUpperCase(),
      fr: frPool[frIndex].toUpperCase(),
    },
    difficulties,
  };
};
