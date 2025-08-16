import { useQuery } from '@tanstack/react-query';

type DifficultyName = 'basic' | 'intermediate' | 'advanced';
type Language = 'en' | 'es' | 'fr';
type Difficulties = Record<Language, DifficultyName>;
type Dictionary = Record<string, number>;

/**
 * A utility function to fetch and combine word lists based on difficulty.
 */
const fetchWordPools = async (difficulties: Difficulties): Promise<Record<Language, string[]>> => {
  // 1. Define the score cutoffs for each difficulty level
  const thresholds: Record<DifficultyName, number> = {
    basic: 0.4,
    intermediate: 0.65,
    advanced: 1.0, // A score of 1.0 includes all words
  };

  // 2. Fetch all three master dictionaries at once
  const [enMaster, esMaster, frMaster] = await Promise.all([
    fetch('/en.json').then((res) => res.json() as Promise<Dictionary>),
    fetch('/es.json').then((res) => res.json() as Promise<Dictionary>),
    fetch('/fr.json').then((res) => res.json() as Promise<Dictionary>),
  ]);

  const masterDictionaries = { en: enMaster, es: esMaster, fr: frMaster };
  const filteredPools: Record<Language, string[]> = { en: [], es: [], fr: [] };

  // 3. Filter each dictionary based on the selected difficulty's score threshold
  (['en', 'es', 'fr'] as const).forEach((lang) => {
    const selectedDifficulty = difficulties[lang];
    const cutoff = thresholds[selectedDifficulty];
    const masterDict = masterDictionaries[lang];

    const filteredWords = Object.entries(masterDict)
      .filter(([_word, score]) => score <= cutoff)
      .map(([word, _score]) => word);

    filteredPools[lang] = filteredWords;
  });

  // 4. Return the object containing the three filtered word pools
  return filteredPools;
};

/**
 * A TanStack Query hook to fetch and cache the validation word lists.
 */
export const useWordPools = (difficulties: Difficulties | undefined) => {
  return useQuery({
    queryKey: ['wordPools', difficulties],
    queryFn: () => {
      if (!difficulties) {
        throw new Error('Difficulties are required to fetch word pools.');
      }
      return fetchWordPools(difficulties);
    },
    // This data is static, so we can cache it forever.
    staleTime: Infinity,
    gcTime: Infinity,
    // Only run the query if the difficulties object is available.
    enabled: !!difficulties,
  });
};
