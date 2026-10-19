import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useVocabulary } from './useVocabulary';

type Write = { ref: string; data: { words?: Record<string, unknown> } };
const state = vi.hoisted(() => ({
  exists: false,
  set: vi.fn(),
  words: {} as Record<string, unknown>,
  readAfterWrite: false,
  attempts: 0,
  failure: null as null | 'certReadDenied' | 'certWriteDenied' | 'unavailable' | 'vocabDenied',
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('firebase/firestore', async (original) => ({
  ...(await original<typeof import('firebase/firestore')>()),
  getFirestore: () => ({}),
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  getDoc: vi.fn(async () => ({ exists: () => false })),
  serverTimestamp: () => 'SERVER_TIME',
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<boolean>) => {
    state.attempts += 1;
    const writes: Write[] = [];
    const result = await fn({
      get: async (ref: string) => {
        if (writes.length > 0) {
          state.readAfterWrite = true;
        }
        if (ref.startsWith('activityEvents/')) {
          if (state.failure === 'certReadDenied') {
            throw Object.assign(new Error('certification read denied'), {
              code: 'permission-denied',
            });
          }
          return { exists: () => state.exists };
        }
        return { exists: () => true, data: () => ({ words: state.words }) };
      },
      set: (ref: string, data: Write['data'], options?: unknown) => {
        writes.push({ ref, data });
        state.set(ref, data, ...(options ? [options] : []));
      },
    });
    const certWrite = writes.some(({ ref }) => ref.startsWith('activityEvents/'));
    if (state.failure === 'vocabDenied' || (certWrite && state.failure === 'certWriteDenied')) {
      throw Object.assign(new Error('write denied'), { code: 'permission-denied' });
    }
    if (state.failure === 'unavailable') {
      throw Object.assign(new Error('offline'), { code: 'unavailable' });
    }
    // Only committed transactions affect remote state; failed attempts must not count a guess.
    for (const { ref, data } of writes) {
      if (ref.startsWith('activityEvents/')) {
        state.exists = true;
      } else if (data.words) {
        state.words = data.words;
      }
    }
    return result;
  },
}));
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  state.exists = false;
  state.readAfterWrite = false;
  state.attempts = 0;
  state.failure = null;
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
    { mergeFields: ['words', 'totalCount'] }
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
it('cleans malformed records before crossing a tier, so stored and effective counts agree', async () => {
  state.words.invalid = null;
  const { result } = setup();
  await act(async () => {
    await result.current.recordGuess({ guess: 'canto', matchedLangs: ['pt'] });
  });
  expect(state.attempts).toBe(2);
  expect(state.words).not.toHaveProperty('invalid');
  expect(state.words.canto).toMatchObject({ timesGuessed: 1 });
  expect(Object.keys(state.words)).toHaveLength(25);
  expect(state.exists).toBe(true);
  expect(state.readAfterWrite).toBe(false);
});
it.each(['certWriteDenied', 'certReadDenied'] as const)(
  'preserves the word without double-counting after %s',
  async (failure) => {
    state.failure = failure;
    const { result } = setup();
    await act(async () => {
      await result.current.recordGuess({ guess: 'canto', matchedLangs: ['pt'] });
    });
    expect(state.attempts).toBe(2);
    expect(state.words.canto).toMatchObject({ timesGuessed: 1 });
    expect(Object.keys(state.words)).toHaveLength(25);
    expect(state.exists).toBe(false);
  }
);
it('does not treat unrelated transaction failures as certification-rule failures', async () => {
  state.failure = 'unavailable';
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const { result } = setup();
    await act(async () => {
      await result.current.recordGuess({ guess: 'canto', matchedLangs: ['pt'] });
    });
    expect(state.attempts).toBe(1);
    expect(state.words).not.toHaveProperty('canto');
    expect(log).toHaveBeenCalledOnce();
  } finally {
    log.mockRestore();
  }
});
it('does not retry permission denial when no certification was attempted', async () => {
  state.failure = 'vocabDenied';
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    const { result } = setup();
    await act(async () => {
      await result.current.recordGuess({ guess: 'word0', matchedLangs: ['pt'] });
    });
    expect(state.attempts).toBe(1);
    expect(log).toHaveBeenCalledOnce();
  } finally {
    log.mockRestore();
  }
});
