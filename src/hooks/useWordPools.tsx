import { useQuery } from '@tanstack/react-query';
import type { Difficulty, Language } from '@/types/firestore';
import { ALL_LANGUAGES } from '@/utils/languages';
import { Dictionary } from '@/utils/wordUtils';

type Difficulties = Partial<Record<Language, Difficulty>>;

/**
 * Fetch and combine word lists based on difficulty for the active languages.
 */
const fetchWordPools = async (
  difficulties: Difficulties
): Promise<{
  filtered: Partial<Record<Language, string[]>>;
  master: Partial<Record<Language, string[]>>;
  dictionaries: Partial<Record<Language, Dictionary>>;
}> => {
  const thresholds: Record<Difficulty, number> = {
    basic: 0.4,
    intermediate: 0.65,
    advanced: 1.0,
  };

  const langs = ALL_LANGUAGES.filter((lang) => difficulties[lang] != null);

  const dictEntries = await Promise.all(
    langs.map(
      async (lang) =>
        [
          lang,
          await fetch(`/${lang}.json`).then((res) => res.json() as Promise<Dictionary>),
        ] as const
    )
  );

  const masterDictionaries = Object.fromEntries(dictEntries) as Partial<
    Record<Language, Dictionary>
  >;
  const filteredPools: Partial<Record<Language, string[]>> = {};
  const masterPools: Partial<Record<Language, string[]>> = {};

  langs.forEach((lang) => {
    const selectedDifficulty = difficulties[lang] || 'basic';
    const cutoff = thresholds[selectedDifficulty] || 0.4;
    const masterDict = masterDictionaries[lang]!;

    filteredPools[lang] = Object.entries(masterDict)
      .filter(([_word, entry]) => entry.d <= cutoff)
      .map(([word]) => word);

    masterPools[lang] = Object.keys(masterDict);
  });

  return { filtered: filteredPools, master: masterPools, dictionaries: masterDictionaries };
};

/**
 * TanStack Query hook for validation word lists.
 * Query key uses active language difficulties so only those dicts are fetched.
 */
export const useWordPools = (difficulties: Difficulties | undefined) => {
  const activeKey = ALL_LANGUAGES.map((lang) => `${lang}:${difficulties?.[lang] ?? ''}`).join('|');

  return useQuery({
    queryKey: ['wordPools', activeKey],
    queryFn: () => {
      if (!difficulties) {
        throw new Error('Difficulties are required to fetch word pools.');
      }
      return fetchWordPools(difficulties);
    },
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: !!difficulties,
  });
};
