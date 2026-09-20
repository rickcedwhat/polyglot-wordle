import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import * as reactRouterDom from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authContext from '@/context/AuthContext';
import * as challengeUtils from '@/utils/challengeUtils';
import * as wordUtils from '@/utils/wordUtils';
import { fetchOrCreateGame, useGameSession } from './useGameSession';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(),
    useSearchParams: vi.fn(),
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/utils/challengeUtils', () => ({
  ensureShareChallengeOnFirstGuess: vi.fn(),
  recordChallengeGameCompletion: vi.fn(),
}));

vi.mock('@/utils/wordUtils', async () => {
  const actual = await vi.importActual('@/utils/wordUtils');
  return {
    ...actual,
    getWordsFromUuid: vi.fn(),
  };
});

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    getFirestore: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    runTransaction: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  };
});

describe('useGameSession & fetchOrCreateGame', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(wordUtils.getWordsFromUuid).mockResolvedValue({
      words: { en: 'derived_en', es: 'derived_es', fr: 'derived_fr' },
      difficulties: { en: 'basic', es: 'basic', fr: 'basic' },
      shuffledLanguages: ['en', 'es', 'fr'],
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  describe('fetchOrCreateGame', () => {
    it('returns existing game if it exists in Firestore', async () => {
      const existingGame = {
        userId: 'user_1',
        gameId: 'b3e47403d2ec4ec9beb8a41faa0b3e47',
        words: { en: 'apple', es: 'queso', fr: 'fruit' },
        isLiveGame: true,
      };

      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => existingGame,
      } as any);

      const result = await fetchOrCreateGame('b3e47403d2ec4ec9beb8a41faa0b3e47', 'user_1');

      expect(result).toEqual(existingGame);
      expect(firestore.setDoc).not.toHaveBeenCalled();
    });

    it('inherits words, difficulties, and shuffledLanguages from challenger if doc exists', async () => {
      const challengerGame = {
        userId: 'challenger_1',
        gameId: 'b3e47403d2ec4ec9beb8a41faa0b3e47',
        words: { en: 'challenger_en', es: 'challenger_es', fr: 'challenger_fr' },
        difficulties: { en: 'advanced', es: 'intermediate', fr: 'basic' },
        shuffledLanguages: ['fr', 'es', 'en'],
      };

      vi.mocked(firestore.getDoc)
        .mockResolvedValueOnce({
          exists: () => false,
        } as any)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => challengerGame,
        } as any);

      const result = await fetchOrCreateGame(
        'b3e47403d2ec4ec9beb8a41faa0b3e47',
        'user_2',
        'challenger_1'
      );

      expect(result.words).toEqual(challengerGame.words);
      expect(result.difficulties).toEqual(challengerGame.difficulties);
      expect(result.shuffledLanguages).toEqual(challengerGame.shuffledLanguages);
      expect(wordUtils.getWordsFromUuid).not.toHaveBeenCalled();
      expect(firestore.setDoc).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          userId: 'user_2',
          gameId: 'b3e47403d2ec4ec9beb8a41faa0b3e47',
          words: challengerGame.words,
          difficulties: challengerGame.difficulties,
          shuffledLanguages: challengerGame.shuffledLanguages,
        })
      );
    });

    it('falls back to getWordsFromUuid when no challenger is provided', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const result = await fetchOrCreateGame('b3e47403d2ec4ec9beb8a41faa0b3e47', 'user_1');

      expect(result.words).toEqual({ en: 'derived_en', es: 'derived_es', fr: 'derived_fr' });
      expect(wordUtils.getWordsFromUuid).toHaveBeenCalledWith('b3e47403d2ec4ec9beb8a41faa0b3e47');
      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('falls back to getWordsFromUuid when challengerId is self', async () => {
      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as any);

      const result = await fetchOrCreateGame(
        'b3e47403d2ec4ec9beb8a41faa0b3e47',
        'user_1',
        'user_1'
      );

      expect(result.words).toEqual({ en: 'derived_en', es: 'derived_es', fr: 'derived_fr' });
      expect(wordUtils.getWordsFromUuid).toHaveBeenCalledWith('b3e47403d2ec4ec9beb8a41faa0b3e47');
    });
  });

  describe('useGameSession hook', () => {
    it('fetches game with activeChallengerId when searchParam is set', async () => {
      vi.mocked(reactRouterDom.useParams).mockReturnValue({
        uuid: 'b3e47403d2ec4ec9beb8a41faa0b3e47',
      });
      vi.mocked(reactRouterDom.useSearchParams).mockReturnValue([
        new URLSearchParams('challenger=challenger_123'),
        vi.fn(),
      ]);
      vi.mocked(authContext.useAuth).mockReturnValue({
        currentUser: { uid: 'user_current' } as any,
        loading: false,
        signInWithGoogle: vi.fn(),
        logout: vi.fn(),
      });

      const userGame = {
        userId: 'user_current',
        gameId: 'b3e47403d2ec4ec9beb8a41faa0b3e47',
        words: { en: 'apple', es: 'queso', fr: 'fruit' },
        isLiveGame: true,
      };

      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => userGame,
      } as any);

      const { result } = renderHook(() => useGameSession(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(userGame);
    });

    it.each([
      { initialGuesses: [], label: 'first' },
      { initialGuesses: ['prior'], label: 'later' },
    ])('ensures the share challenge on a $label guess (idempotent recovery)', async (testCase) => {
      const gameId = 'b3e47403d2ec4ec9beb8a41faa0b3e47';
      vi.mocked(reactRouterDom.useParams).mockReturnValue({ uuid: gameId });
      vi.mocked(reactRouterDom.useSearchParams).mockReturnValue([
        new URLSearchParams('challenger=challenger_123'),
        vi.fn(),
      ]);
      vi.mocked(authContext.useAuth).mockReturnValue({
        currentUser: {
          uid: 'user_current',
          displayName: 'Current User',
          photoURL: 'avatar.png',
        } as any,
        loading: false,
        signInWithGoogle: vi.fn(),
        logout: vi.fn(),
      });

      vi.mocked(firestore.getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          userId: 'user_current',
          gameId,
          guessHistory: testCase.initialGuesses,
          words: { en: 'apple', es: 'queso', fr: 'fruit' },
          difficulties: { en: 'basic', es: 'basic', fr: 'basic' },
          shuffledLanguages: ['en', 'es', 'fr'],
          isLiveGame: true,
        }),
      } as any);

      const { result } = renderHook(() => useGameSession(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      await act(async () => {
        await result.current.updateGuessHistory('apple');
      });

      expect(challengeUtils.ensureShareChallengeOnFirstGuess).toHaveBeenCalledTimes(1);
    });
  });
});
