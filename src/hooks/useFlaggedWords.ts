import { useEffect, useState } from 'react';

export interface FlaggedWordItem {
  id: string; // `${lang}:${wordKey}`
  lang: 'en' | 'es' | 'fr';
  wordKey: string;
  display?: string;
  pos?: string;
  d?: number;
  def?: string;
  note?: string;
  flaggedAt: number;
}

const STORAGE_KEY = 'polyglot_flagged_words_v1';

export const getStoredFlaggedWords = (): FlaggedWordItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const saveFlaggedWords = (items: FlaggedWordItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save flagged words:', e);
  }
};

export const useFlaggedWords = () => {
  const [flaggedWords, setFlaggedWords] = useState<FlaggedWordItem[]>(getStoredFlaggedWords);

  useEffect(() => {
    saveFlaggedWords(flaggedWords);
  }, [flaggedWords]);

  const isFlagged = (lang: 'en' | 'es' | 'fr', wordKey: string) => {
    const id = `${lang}:${wordKey.toLowerCase()}`;
    return flaggedWords.some((item) => item.id === id);
  };

  const toggleFlag = (entry: {
    lang: 'en' | 'es' | 'fr';
    wordKey: string;
    display?: string;
    pos?: string;
    d?: number;
    def?: string;
    note?: string;
  }) => {
    const id = `${entry.lang}:${entry.wordKey.toLowerCase()}`;
    setFlaggedWords((prev) => {
      const exists = prev.some((item) => item.id === id);
      if (exists) {
        return prev.filter((item) => item.id !== id);
      }
      return [
        ...prev,
        {
          id,
          lang: entry.lang,
          wordKey: entry.wordKey.toLowerCase(),
          display: entry.display || entry.wordKey,
          pos: entry.pos,
          d: entry.d,
          def: entry.def,
          note: entry.note || '',
          flaggedAt: Date.now(),
        },
      ];
    });
  };

  const updateNote = (lang: 'en' | 'es' | 'fr', wordKey: string, note: string) => {
    const id = `${lang}:${wordKey.toLowerCase()}`;
    setFlaggedWords((prev) => prev.map((item) => (item.id === id ? { ...item, note } : item)));
  };

  const clearAllFlagged = () => {
    setFlaggedWords([]);
  };

  const generateMarkdownSummary = () => {
    if (flaggedWords.length === 0) {
      return 'No flagged words in discussion list.';
    }

    let md = `### 🚩 Flagged Dictionary Words for Discussion (${flaggedWords.length})\n\n`;
    flaggedWords.forEach((item, index) => {
      const flagEmoji = item.lang === 'en' ? '🇬🇧' : item.lang === 'es' ? '🇪🇸' : '🇫🇷';
      md += `${index + 1}. **${item.display || item.wordKey}** (${flagEmoji} ${item.lang.toUpperCase()})\n`;
      if (item.pos) {
        md += `   - **POS**: ${item.pos}\n`;
      }
      if (item.d !== undefined) {
        md += `   - **Difficulty**: ${item.d}\n`;
      }
      if (item.def) {
        md += `   - **Definition**: ${item.def}\n`;
      }
      if (item.note && item.note.trim()) {
        md += `   - **Discussion Note**: ${item.note.trim()}\n`;
      }
      md += `\n`;
    });
    return md.trim();
  };

  return {
    flaggedWords,
    isFlagged,
    toggleFlag,
    updateNote,
    clearAllFlagged,
    generateMarkdownSummary,
  };
};
