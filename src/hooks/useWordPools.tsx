import { useQuery } from '@tanstack/react-query';

type Difficulties = {
  en: 'basic' | 'intermediate' | 'advanced';
  es: 'basic' | 'intermediate' | 'advanced';
  fr: 'basic' | 'intermediate' | 'advanced';
};

/**
 * A utility function to fetch and combine word lists based on difficulty.
 */
const fetchWordPools = async (difficulties: Difficulties) => {
  const languagePromises = (['en', 'es', 'fr'] as const).map(async (lang) => {
    const difficulty = difficulties[lang];
    const tiers: ('basic' | 'intermediate' | 'advanced')[] = ['basic'];

    if (difficulty === 'intermediate') {
      tiers.push('intermediate');
    }
    if (difficulty === 'advanced') {
      tiers.push('intermediate', 'advanced');
    }

    const wordLists = await Promise.all(
      tiers.map((tier) => fetch(`/${lang}/${tier}.json`).then((res) => res.json()))
    );

    return wordLists.flat(); // Combine lists for the language
  });

  const [en, es, fr] = await Promise.all<string[]>(languagePromises);
  return { en, es, fr };
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
