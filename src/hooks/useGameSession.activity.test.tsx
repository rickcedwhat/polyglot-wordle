import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { beforeEach, expect, it, vi } from 'vitest';
import type { GameDoc, UserDoc } from '@/types/firestore';
import { useGameSession } from './useGameSession';

const state = vi.hoisted(() => ({
  game: {} as GameDoc,
  stats: {} as UserDoc['stats'],
  update: vi.fn(),
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('react-router-dom', () => ({
  useParams: () => ({ uuid: 'b3e47403d2ec4ec9beb8a41faa0b3e47' }),
  useSearchParams: () => [new URLSearchParams()],
}));
vi.mock('@/utils/challengeUtils', () => ({ recordChallengeGameCompletion: vi.fn() }));
vi.mock('firebase/firestore', async (original) => ({
  ...(await original<typeof import('firebase/firestore')>()),
  getFirestore: () => ({}),
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  getDoc: async () => ({ exists: () => true, data: () => state.game }),
  serverTimestamp: () => 'SERVER_TIME',
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<void>) =>
    fn({
      get: async (ref: string) => ({
        exists: () => true,
        data: () => (ref.startsWith('games/') ? state.game : { stats: state.stats }),
      }),
      update: (ref: string, changes: Partial<GameDoc> & { stats?: UserDoc['stats'] }) => {
        state.update(ref, changes);
        if (ref.startsWith('games/')) {
          state.game = { ...state.game, ...changes };
        } else if (changes.stats) {
          state.stats = changes.stats;
        }
      },
    }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.game = {
    userId: 'me',
    gameId: 'b3e47403d2ec4ec9beb8a41faa0b3e47',
    words: { en: 'apple', es: 'rubia', fr: 'merci' },
    difficulties: {},
    shuffledLanguages: ['en', 'es', 'fr'],
    guessHistory: ['crane', 'apple', 'rubia', 'merci'],
    isLiveGame: true,
    isWin: null,
    score: null,
    startedAt: Timestamp.fromMillis(1),
    completedAt: null,
  };
  state.stats = {
    gamesPlayed: 10,
    wins: 7,
    winPercentage: 70,
    currentStreak: 6,
    maxStreak: 6,
    totalScore: 5000,
    highScore: 900,
    languages: {} as UserDoc['stats']['languages'],
  };
});
const setup = (client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) =>
  renderHook(() => useGameSession(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
it('snapshots a personal best and new streak exactly once across repeated completion', async () => {
  const { result } = setup();
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await act(async () => {
    await result.current.endGame({ isWin: true, score: 1240 });
  });
  expect(state.game.activity).toMatchObject({ personalBest: true, firstGame: false, streak: 7 });
  expect(state.game.activity?.feats.length).toBeGreaterThan(0);
  expect(state.stats.gamesPlayed).toBe(11);
  state.update.mockClear();
  await act(async () => {
    await result.current.endGame({ isWin: true, score: 1240 });
  });
  expect(state.update).not.toHaveBeenCalled();
  expect(state.stats.gamesPlayed).toBe(11);
});
it('emits a first game rather than a trivial personal-best announcement', async () => {
  state.stats.gamesPlayed = 0;
  state.stats.highScore = 0;
  state.stats.currentStreak = 0;
  state.stats.maxStreak = 0;
  const { result } = setup();
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await act(async () => {
    await result.current.endGame({ isWin: true, score: 1240 });
  });
  expect(state.game.activity).toMatchObject({ firstGame: true, personalBest: false, streak: null });
});
it('does not announce an old streak milestone again', async () => {
  state.stats.maxStreak = 14;
  const { result } = setup();
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await act(async () => {
    await result.current.endGame({ isWin: true, score: 800 });
  });
  expect(state.game.activity).toMatchObject({ personalBest: false, streak: null });
});

it('refetches a mounted empty leaderboard after the completed score is committed', async () => {
  const client = new QueryClient();
  const key = ['leaderboard', state.game.gameId, 'friends', ['me']];
  const { QueryObserver } = await import('@tanstack/react-query');
  const fetchScores = vi.fn(async () => (state.game.isLiveGame ? [] : [state.game]));
  const observer = new QueryObserver(client, { queryKey: key, queryFn: fetchScores });
  const unsubscribe = observer.subscribe(() => {});
  await waitFor(() => expect(client.getQueryData(key)).toEqual([]));
  const { result } = setup(client);
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await act(async () => {
    await result.current.endGame({ isWin: true, score: 1240 });
  });
  await waitFor(() =>
    expect(client.getQueryData(key)).toEqual([
      expect.objectContaining({ score: 1240, isLiveGame: false }),
    ])
  );
  unsubscribe();
});
