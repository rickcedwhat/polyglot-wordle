import { useCallback } from 'react';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import type { Language } from '@/types/firestore';
import type { Dictionary } from '@/utils/wordUtils';

/** Full word lists for `langs`, each fetched once and shared across the app. */
export const useDictionaries = (langs: Language[]) => {
  const key = [...new Set(langs)].sort().join(',');
  const unique = key ? (key.split(',') as Language[]) : [];

  // Stable per language set, so the combined object only changes when a list finishes loading.
  const combine = useCallback(
    (results: UseQueryResult<Dictionary>[]) => ({
      dictionaries: Object.fromEntries(
        results.flatMap((result, i) => (result.data ? [[key.split(',')[i], result.data]] : []))
      ) as Partial<Record<Language, Dictionary>>,
      isLoading: results.some((result) => result.isLoading),
    }),
    [key]
  );

  return useQueries({
    queries: unique.map((lang) => ({
      queryKey: ['dictionary', lang],
      queryFn: async (): Promise<Dictionary> => {
        const res = await fetch(`/${lang}.json`);
        if (!res.ok) {
          throw new Error(`Failed to fetch dictionary for ${lang}`);
        }
        return res.json();
      },
      staleTime: Infinity,
      gcTime: Infinity,
    })),
    combine,
  });
};
