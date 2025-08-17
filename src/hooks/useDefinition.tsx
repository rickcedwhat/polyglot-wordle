// import { useMutation } from '@tanstack/react-query';

// // The actual API call function is the same
// const fetchDefinition = async ({ lang, word }: { lang: string; word: string }): Promise<string> => {
//   if (!lang || !word) {
//     throw new Error('Language and word are required.');
//   }

//   const response = await fetch(`https://freedictionaryapi.com/api/v1/entries/${lang}/${word}`);
//   if (!response.ok) {
//     throw new Error('Definition not found');
//   }
//   const data = await response.json();
//   return data.entries[0]?.senses[0]?.definition || 'No definition available.';
// };

// /**
//  * A custom hook that provides a function to fetch a definition on demand.
//  */
// export const useDefinition = () => {
//   // Use a mutation, as it's designed to be triggered manually
//   return useMutation({
//     mutationFn: fetchDefinition,
//   });
// };

import { useQuery } from '@tanstack/react-query';

// The function that performs the actual API call
const fetchDefinition = async (lang: string, word: string): Promise<string> => {
  if (!lang || !word) {
    throw new Error('Language or word is missing.');
  }

  const response = await fetch(`https://freedictionaryapi.com/api/v1/entries/${lang}/${word}`);
  if (!response.ok) {
    throw new Error('Definition not found');
  }
  const data = await response.json();
  return data.entries[0]?.senses[0]?.definition || 'No definition available.';
};

/**
 * A custom hook to fetch a single definition on demand and cache it.
 */
export const useDefinition = (lang: string, word: string) => {
  return useQuery({
    queryKey: ['definition', lang, word],
    queryFn: () => fetchDefinition(lang, word),
    enabled: false, // Don't run the query automatically
    staleTime: Infinity, // The data is static, so it never becomes "stale"
    gcTime: Infinity, // Never garbage-collect this data from the cache
    retry: false, // Don't retry if the API call fails
  });
};
