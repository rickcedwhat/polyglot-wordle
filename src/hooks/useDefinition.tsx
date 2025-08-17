import { useQuery } from '@tanstack/react-query';

/**
 * Fetches a word definition from the Free Dictionary API.
 * @param lang The language code (e.g., 'en', 'es', 'fr').
 * @param word The word to define.
 * @returns The definition string.
 */
const fetchDefinition = async (lang: string, word: string): Promise<string> => {
  // Don't try to fetch if the word or lang is missing
  if (!lang || !word) {
    return 'No word selected.';
  }

  const response = await fetch(`https://freedictionaryapi.com/api/v1/entries/${lang}/${word}`);
  if (!response.ok) {
    throw new Error('Definition not found');
  }
  const data = await response.json();
  return data[0]?.meanings[0]?.definitions[0]?.definition || 'No definition available.';
};

/**
 * A custom hook to fetch a single definition on demand.
 * @param lang The language of the word to fetch.
 * @param word The word to fetch.
 */
export const useDefinition = (lang: string, word: string) => {
  const queryResult = useQuery({
    queryKey: ['definition', lang, word],
    queryFn: () => fetchDefinition(lang, word.toLowerCase()),
    // --- This is the key part ---
    enabled: false, // This prevents the query from running automatically
    // ---
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false, // Don't retry if the API returns a 404
  });

  return queryResult;
};
