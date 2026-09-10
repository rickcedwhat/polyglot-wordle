import { useQuery } from '@tanstack/react-query';
import { Dictionary, normalizeWord, WordEntry } from '@/utils/wordUtils';

export interface DefinitionData {
  display: string;
  pos: string;
  def: string;
  d?: number;
}

const fetchLocalDefinition = async (lang: string, word: string): Promise<DefinitionData> => {
  if (!lang || !word) {
    throw new Error('Language or word is missing.');
  }

  const normalized = normalizeWord(word);
  const response = await fetch(`/${lang}.json`);
  if (!response.ok) {
    throw new Error(`Failed to load ${lang} dictionary`);
  }

  const dictionary: Dictionary = await response.json();
  const entry: WordEntry | undefined = dictionary[normalized];

  if (!entry) {
    throw new Error('Definition not found');
  }

  return {
    display: entry.display || word,
    pos: entry.pos || 'word',
    def: entry.def || 'Definition available in standard dictionary.',
    d: entry.d,
  };
};

/**
 * A custom hook to fetch a single definition on demand from local dictionary and cache it.
 */
export const useDefinition = (lang: string, word: string) => {
  return useQuery({
    queryKey: ['definition', lang, normalizeWord(word)],
    queryFn: () => fetchLocalDefinition(lang, word),
    enabled: false, // Triggered on user interaction
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
};
