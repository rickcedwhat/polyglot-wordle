import { useEffect, useState } from 'react';
import { Language } from '@/types/firestore';
import { extractSingleEmoji } from '@/utils/emojiUtils';

export interface LanguageFlags {
  en: string;
  es: string;
  fr: string;
}

export const DEFAULT_FLAGS: LanguageFlags = {
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
};

const STORAGE_KEY = 'polyglot_custom_flags_v1';

export const getStoredFlags = (): LanguageFlags => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        en: extractSingleEmoji(parsed.en) || DEFAULT_FLAGS.en,
        es: extractSingleEmoji(parsed.es) || DEFAULT_FLAGS.es,
        fr: extractSingleEmoji(parsed.fr) || DEFAULT_FLAGS.fr,
      };
    }
  } catch (e) {
    // Ignore parse error
  }
  return DEFAULT_FLAGS;
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
    setFlags(DEFAULT_FLAGS);
  };

  return {
    flags,
    setFlag,
    resetFlags,
  };
};
