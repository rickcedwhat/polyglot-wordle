import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import * as reactRouterDom from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authContext from '@/context/AuthContext';
import { useChallenge } from './useChallenge';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: vi.fn(),
  };
});

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    getFirestore: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
  };
});

describe('useChallenge hook', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  };

  it('returns isChallenge = false when no challenger param is present', () => {
    vi.mocked(reactRouterDom.useSearchParams).mockReturnValue([new URLSearchParams(''), vi.fn()]);
    vi.mocked(authContext.useAuth).mockReturnValue({
      currentUser: { uid: 'user_1' } as any,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useChallenge('game_123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isChallenge).toBe(false);
    expect(result.current.challengerId).toBeNull();
  });

  it('ignores self-challenge when challengerId equals currentUser.uid', () => {
    vi.mocked(reactRouterDom.useSearchParams).mockReturnValue([
      new URLSearchParams('challenger=user_1'),
      vi.fn(),
    ]);
    vi.mocked(authContext.useAuth).mockReturnValue({
      currentUser: { uid: 'user_1' } as any,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    const { result } = renderHook(() => useChallenge('game_123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isChallenge).toBe(false);
    expect(result.current.challengerId).toBeNull();
  });

  it('loads challenger user and game doc when challengerId belongs to another user', async () => {
    vi.mocked(reactRouterDom.useSearchParams).mockReturnValue([
      new URLSearchParams('challenger=challenger_456'),
      vi.fn(),
    ]);
    vi.mocked(authContext.useAuth).mockReturnValue({
      currentUser: { uid: 'user_1' } as any,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    const mockUserData = { displayName: 'Alice Champion', photoURL: 'https://example.com/pic.jpg' };
    const mockGameData = {
      score: 380,
      guessHistory: ['guess1', 'guess2', 'guess3', 'guess4'],
      isWin: true,
    };

    vi.mocked(firestore.getDoc).mockImplementation(async (docRef: any) => {
      return {
        exists: () => true,
        data: () => (docRef?.path?.includes('users') ? mockUserData : mockGameData),
      } as any;
    });

    vi.mocked(firestore.doc).mockImplementation((_db: any, ...pathSegments: string[]) => {
      return { path: pathSegments.join('/') } as any;
    });

    const { result } = renderHook(() => useChallenge('game_123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isChallenge).toBe(true);
    expect(result.current.challengerId).toBe('challenger_456');
    expect(result.current.challengerUser?.displayName).toBe('Alice Champion');
    expect(result.current.challengerUser?.photoURL).toBe('https://example.com/pic.jpg');
    expect((result.current.challengerUser as any)?.email).toBeUndefined();
    expect(result.current.challengerGame?.score).toBe(380);
  });

  it('rejects query when game document fetch fails', async () => {
    vi.mocked(reactRouterDom.useSearchParams).mockReturnValue([
      new URLSearchParams('challenger=challenger_456'),
      vi.fn(),
    ]);
    vi.mocked(authContext.useAuth).mockReturnValue({
      currentUser: { uid: 'user_1' } as any,
      loading: false,
      signInWithGoogle: vi.fn(),
      logout: vi.fn(),
    });

    vi.mocked(firestore.getDoc).mockImplementation(async (docRef: any) => {
      if (docRef?.path?.includes('games')) {
        throw new Error('Firestore read failure');
      }
      return {
        exists: () => true,
        data: () => ({ displayName: 'Alice' }),
      } as any;
    });

    vi.mocked(firestore.doc).mockImplementation((_db: any, ...pathSegments: string[]) => {
      return { path: pathSegments.join('/') } as any;
    });

    const { result } = renderHook(() => useChallenge('game_123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isChallenge).toBe(false);
    expect(result.current.challengerGame).toBeNull();
  });
});
