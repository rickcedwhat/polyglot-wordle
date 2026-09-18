import { beforeEach, describe, expect, it } from 'vitest';
import { UserVocabularyMap } from '@/types/vocabulary';
import { getLocalVocabulary, saveLocalVocabulary, VOCABULARY_STORAGE_KEY } from './useVocabulary';

describe('useVocabulary storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default empty vocabulary maps when storage is empty', () => {
    const vocab = getLocalVocabulary();
    expect(vocab).toEqual({ en: {}, es: {}, fr: {} });
  });

  it('saves and retrieves vocabulary correctly from localStorage', () => {
    const mockVocab: UserVocabularyMap = {
      es: {
        frena: {
          timesGuessed: 3,
          firstSeen: '2026-09-18T12:00:00.000Z',
          lastSeen: '2026-09-18T12:30:00.000Z',
          isSolved: true,
        },
      },
      en: {},
      fr: {},
    };

    saveLocalVocabulary(mockVocab);
    const retrieved = getLocalVocabulary();

    expect(retrieved.es.frena.timesGuessed).toBe(3);
    expect(retrieved.es.frena.isSolved).toBe(true);
    expect(retrieved.es.frena.firstSeen).toBe('2026-09-18T12:00:00.000Z');
  });

  it('handles invalid JSON gracefully without throwing', () => {
    localStorage.setItem(VOCABULARY_STORAGE_KEY, 'invalid-json');
    const vocab = getLocalVocabulary();
    expect(vocab).toEqual({ en: {}, es: {}, fr: {} });
  });
});
