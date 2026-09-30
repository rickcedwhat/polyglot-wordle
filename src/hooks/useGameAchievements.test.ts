import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserVocabularyMap } from '@/types/vocabulary';
import { useGameAchievements } from './useGameAchievements';

let vocabulary: UserVocabularyMap;
let isLoading: boolean;

vi.mock('@/hooks/useVocabulary', () => ({
  useVocabulary: () => ({ vocabulary, isLoading }),
}));

const wordsSeenAt = (count: number, firstSeen: string) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      `word${index}`,
      { timesGuessed: 1, firstSeen, lastSeen: firstSeen },
    ])
  );

const mountTime = new Date('2026-09-30T10:00:00.000Z');
const completionTime = new Date('2026-09-30T10:10:00.000Z');
const laterTime = new Date('2026-09-30T10:20:00.000Z');
const game = { words: { en: 'apple' }, guessHistory: ['apple'] };

describe('useGameAchievements completion fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mountTime);
    vocabulary = {
      en: wordsSeenAt(24, '2026-09-30T09:00:00.000Z'),
      es: {},
      fr: {},
      it: {},
      pt: {},
    };
    isLoading = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([false, true])(
    'counts words learned during the game and keeps the end time stable (loading: %s)',
    (loading) => {
      isLoading = loading;
      const { result, rerender } = renderHook(useGameAchievements, {
        initialProps: { ...game, isLiveGame: true },
      });
      expect(result.current.levelUps).toEqual([]);

      vocabulary = {
        ...vocabulary,
        en: {
          ...vocabulary.en,
          apple: wordsSeenAt(1, '2026-09-30T10:05:00.000Z').word0,
        },
      };
      vi.setSystemTime(completionTime);
      rerender({ ...game, isLiveGame: false });
      expect(result.current.levelUps).toEqual(loading ? [] : [{ lang: 'en', level: 0 }]);

      vi.setSystemTime(laterTime);
      vocabulary = {
        ...vocabulary,
        es: wordsSeenAt(25, '2026-09-30T10:15:00.000Z'),
      };
      isLoading = false;
      rerender({ ...game, isLiveGame: false });
      expect(result.current.levelUps).toEqual([{ lang: 'en', level: 0 }]);

      vi.setSystemTime(new Date('2026-09-30T10:30:00.000Z'));
      vocabulary = { ...vocabulary };
      rerender({ ...game, isLiveGame: false });
      expect(result.current.levelUps).toEqual([{ lang: 'en', level: 0 }]);
    }
  );

  it('captures a fallback for a game already completed at mount and prefers its server timestamp', () => {
    vocabulary.en = wordsSeenAt(25, '2026-09-30T09:30:00.000Z');
    const { result, rerender } = renderHook(
      ({ completedAt }: { completedAt?: { toDate: () => Date } }) =>
        useGameAchievements({
          ...game,
          isLiveGame: false,
          startedAt: { toDate: () => new Date('2026-09-30T09:00:00.000Z') },
          completedAt,
        }),
      { initialProps: {} }
    );
    expect(result.current.levelUps).toEqual([{ lang: 'en', level: 0 }]);

    rerender({ completedAt: { toDate: () => new Date('2026-09-30T09:15:00.000Z') } });
    expect(result.current.levelUps).toEqual([]);
  });
});
