import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useVocabulary } from './useVocabulary';

const state = vi.hoisted(() => ({
  exists: false,
  set: vi.fn(),
  words: {} as Record<string, unknown>,
  readAfterWrite: false,
  wrote: false,
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('firebase/firestore', async (original) => ({
  ...(await original<typeof import('firebase/firestore')>()),
  getFirestore: () => ({}),
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  getDoc: vi.fn(async () => ({ exists: () => false })),
  serverTimestamp: () => 'SERVER_TIME',
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<void>) =>
    fn({
      get: async (ref: string) => {
        if (state.wrote) {
          state.readAfterWrite = true;
        }
        return ref.startsWith('activityEvents/')
          ? { exists: () => state.exists }
          : { exists: () => true, data: () => ({ words: state.words }) };
      },
      set: (...args: unknown[]) => {
        state.wrote = true;
        state.set(...args);
      },
    }),
}));
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  state.exists = false;
  state.wrote = false;
  state.readAfterWrite = false;
  state.words = Object.fromEntries(
    Array.from({ length: 24 }, (_, i) => [
      `word${i}`,
      { timesGuessed: 1, firstSeen: '2026-01-01', lastSeen: '2026-01-01' },
    ])
  );
});
const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(['vocabulary', 'me'], { en: {}, es: {}, fr: {}, it: {}, pt: state.words });
  return renderHook(() => useVocabulary(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};
it('writes the certification and new vocabulary together only at a threshold', async () => {
  const { result } = setup();
  await act(async () => {
    await result.current.recordGuess({ guess: 'canto', matchedLangs: ['pt'] });
  });
  expect(state.set).toHaveBeenCalledWith('activityEvents/cert_me_pt_0', {
    userId: 'me',
    lang: 'pt',
    level: 0,
    wordCount: 25,
    createdAt: 'SERVER_TIME',
  });
  expect(state.set).toHaveBeenCalledWith(
    'users/me/vocabulary/pt',
    expect.objectContaining({ totalCount: 25 }),
    { merge: true }
  );
  expect(state.readAfterWrite).toBe(false);
});
it('does not republish an existing event on a recovery attempt', async () => {
  state.exists = true;
  const { result } = setup();
  await act(async () => {
    await result.current.recordGuess({ guess: 'canto', matchedLangs: ['pt'] });
  });
  expect(
    state.set.mock.calls.filter(([ref]) => String(ref).startsWith('activityEvents/'))
  ).toHaveLength(0);
});
it('repeated words do not count toward a certification', async () => {
  const { result } = setup();
  await act(async () => {
    await result.current.recordGuess({ guess: 'word0', matchedLangs: ['pt'] });
  });
  expect(
    state.set.mock.calls.filter(([ref]) => String(ref).startsWith('activityEvents/'))
  ).toHaveLength(0);
});
