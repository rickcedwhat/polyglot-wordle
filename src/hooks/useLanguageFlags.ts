import { useEffect, useState } from 'react';
import { Language } from '@/types/firestore';
import { ALL_LANGUAGES, LANGUAGE_META } from '@/utils/languages';
import { extractSingleEmoji } from '@/utils/emojiUtils';

export type LanguageFlags = Record<Language, string>;

export const DEFAULT_FLAGS: LanguageFlags = {
  en: LANGUAGE_META.en.flag,
  es: LANGUAGE_META.es.flag,
  fr: LANGUAGE_META.fr.flag,
  it: LANGUAGE_META.it.flag,
  pt: LANGUAGE_META.pt.flag,
};

const STORAGE_KEY = 'polyglot_custom_flags_v2';

export const getStoredFlags = (): LanguageFlags => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('polyglot_custom_flags_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      return Object.fromEntries(
        ALL_LANGUAGES.map((lang) => [
          lang,
          extractSingleEmoji(parsed[lang]) || DEFAULT_FLAGS[lang],
        ])
      ) as LanguageFlags;
    }
  } catch (e) {
    // Ignore parse error
  }
  return { ...DEFAULT_FLAGS };
};

export const useLanguageFlags = () => {
  const [flags, setFlags] = useState<LanguageFlags>(getStoredFlags);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    } catch (e) {
      console.error('Failed to save custom flags:', e);
    }
  }, [flags]);

  const setFlag = (lang: Language, emoji: string) => {
    const single = extractSingleEmoji(emoji);
    if (single) {
      setFlags((prev) => ({
        ...prev,
        [lang]: single,
      }));
    }
  };

  const resetFlags = () => {
    setFlags({ ...DEFAULT_FLAGS });
  };

  return {
    flags,
    setFlag,
    resetFlags,
  };
};
