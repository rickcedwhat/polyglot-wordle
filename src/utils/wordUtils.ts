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
      en: solutionWords.en,
      es: solutionWords.es,
      fr: solutionWords.fr,
    },
    difficulties,
  };
};

/**
 * Calculates the score for a single language based on the full game's guess history.
 * @param guesses The array of all guesses made in the game.
 * @param solution The solution word for this specific language.
 * @returns The total score for this language.
 */
export const getLanguageScore = (guesses: string[], solution: string): number => {
  let languageScore = 0;
  const scoredGreenSlots = [false, false, false, false, false];

  // Calculate Green and Yellow bonuses for each guess
  guesses.forEach((guess, guessIndex) => {
    const statuses = getGuessStatuses(guess, solution);
    let yellowComboCounter = 1;

    statuses.forEach((status, letterIndex) => {
      // Green Letter "Discovery" Bonus
      if (status === 'correct' && !scoredGreenSlots[letterIndex]) {
        languageScore += 5 * (11 - (guessIndex + 1));
        scoredGreenSlots[letterIndex] = true;
      }
      // Yellow Letter "Combo" Bonus
      if (status === 'present') {
        languageScore += 5 * yellowComboCounter;
        yellowComboCounter += 1;
      }
    });
  });

  // Calculate "Word Solved" Bonus
  const solvedIndex = guesses.findIndex((g) => normalizeWord(g) === normalizeWord(solution));
  if (solvedIndex !== -1) {
    const guessesTaken = solvedIndex + 1;
    languageScore += 20 * (10 - guessesTaken);
  }

  return languageScore;
};

/**
 * Calculates the points earned for a single turn.
 * @param currentGuess The guess that was just submitted.
 * @param solution The solution words object.
 * @param guessNumber The number of the current guess (e.g., 1 for the first guess).
 * @param scoredGreenSlots The current state of which green tiles have been scored.
 * @returns An object with the score for the turn and the updated green slots tracker.
 */
export const getScoreForTurn = (
  currentGuess: string,
  solution: { en: string; es: string; fr: string },
  guessNumber: number,
  scoredGreenSlots: { en: boolean[]; es: boolean[]; fr: boolean[] }
) => {
  let turnScore = 0;
  const updatedScoredSlots = JSON.parse(JSON.stringify(scoredGreenSlots)); // Deep copy

  (['en', 'es', 'fr'] as const).forEach((lang) => {
    const solutionWord = solution[lang];
    const statuses = getGuessStatuses(currentGuess, solutionWord);
    let yellowComboCounter = 1;

    statuses.forEach((status, letterIndex) => {
      // Green "Discovery" Bonus
      if (status === 'correct' && !updatedScoredSlots[lang][letterIndex]) {
        turnScore += 5 * (11 - guessNumber);
        updatedScoredSlots[lang][letterIndex] = true;
      }
      // Yellow "Combo" Bonus
      if (status === 'present') {
        turnScore += 5 * yellowComboCounter;
        yellowComboCounter += 1;
      }
    });

    // "Word Solved" Bonus
    if (normalizeWord(solutionWord) === normalizeWord(currentGuess)) {
      turnScore += 20 * (10 - guessNumber);
    }
  });

  return { turnScore, updatedScoredSlots };
};

/**
 * Recalculates the entire score for a game based on its full guess history.
 * @param guessHistory The array of all guesses made so far.
 * @param solution The solution words object.
 * @returns The total calculated score.
 */
export const calculateScoreFromHistory = (
  guessHistory: string[],
  solution: { en: string; es: string; fr: string }
): number => {
  let totalScore = 0;
  // This object tracks which green slots have already awarded points.
  const scoredGreenSlots = {
    en: [false, false, false, false, false],
    es: [false, false, false, false, false],
    fr: [false, false, false, false, false],
  };

  // Iterate through each guess in the history to recalculate points
  guessHistory.forEach((guess, index) => {
    const guessNumber = index + 1;
    const { turnScore, updatedScoredSlots } = getScoreForTurn(
      guess,
      solution,
      guessNumber,
      scoredGreenSlots
    );
    totalScore += turnScore;
    // Update the tracker for the next iteration
    Object.assign(scoredGreenSlots, updatedScoredSlots);
  });

  // After calculating turn-by-turn scores, check for final bonuses or penalties
  const enSolved = guessHistory.some((g) => normalizeWord(g) === normalizeWord(solution.en));
  const esSolved = guessHistory.some((g) => normalizeWord(g) === normalizeWord(solution.es));
  const frSolved = guessHistory.some((g) => normalizeWord(g) === normalizeWord(solution.fr));
  const allSolved = enSolved && esSolved && frSolved;

  if (allSolved) {
    const findLastGuess = (word: string) =>
      guessHistory.findIndex((g) => normalizeWord(g) === normalizeWord(word));
    const finalGuessIndex = Math.max(
      findLastGuess(solution.en),
      findLastGuess(solution.es),
      findLastGuess(solution.fr)
    );
    const totalGuessesTaken = finalGuessIndex + 1;
    totalScore += 25 * (11 - totalGuessesTaken);
  } else if (guessHistory.length >= 10) {
    if (!enSolved) {
      totalScore -= 250;
    }
    if (!esSolved) {
      totalScore -= 250;
    }
    if (!frSolved) {
      totalScore -= 250;
    }
  }

  return totalScore;
};
