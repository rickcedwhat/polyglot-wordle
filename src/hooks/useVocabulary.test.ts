import { beforeEach, describe, expect, it } from 'vitest';
import { UserVocabularyMap } from '@/types/vocabulary';
import { getLocalVocabulary, saveLocalVocabulary, VOCABULARY_STORAGE_KEY } from './useVocabulary';

describe('useVocabulary storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default empty vocabulary maps when storage is empty', () => {
    const vocab = getLocalVocabulary();
    expect(vocab).toEqual({ en: {}, es: {}, fr: {}, it: {}, pt: {} });
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
      it: {},
      pt: {},
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
    expect(vocab).toEqual({ en: {}, es: {}, fr: {}, it: {}, pt: {} });
  });

  it('filters out null records, non-objects, and invalid records safely', () => {
    const corrupted = {
      es: {
        hola: null,
        mundo: { timesGuessed: 'not-a-number' },
        frena: {
          timesGuessed: 2,
          firstSeen: '2026-09-18T10:00:00.000Z',
          lastSeen: '2026-09-18T11:00:00.000Z',
          isSolved: true,
        },
      },
      en: 'corrupted-string',
      fr: null,
    };
    localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(corrupted));
    const vocab = getLocalVocabulary();

    expect(vocab.en).toEqual({});
    expect(vocab.fr).toEqual({});
    expect(vocab.es).toEqual({
      frena: {
        timesGuessed: 2,
        firstSeen: '2026-09-18T10:00:00.000Z',
        lastSeen: '2026-09-18T11:00:00.000Z',
        isSolved: true,
      },
    });
  });

  it('supports user-scoped storage key when userId is provided', () => {
    const userVocab: UserVocabularyMap = {
      en: {
        apple: {
          timesGuessed: 1,
          firstSeen: '2026-09-18T10:00:00.000Z',
          lastSeen: '2026-09-18T10:00:00.000Z',
          isSolved: true,
        },
      },
      es: {},
      fr: {},
      it: {},
      pt: {},
    };
    saveLocalVocabulary(userVocab, 'user_123');

    // Anonymous storage remains empty
    expect(getLocalVocabulary()).toEqual({ en: {}, es: {}, fr: {}, it: {}, pt: {} });

    // User-scoped storage retrieves user records
    expect(getLocalVocabulary('user_123').en.apple.timesGuessed).toBe(1);
  });
});
