import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authContext from '@/context/AuthContext';
import type { ChallengeDoc } from '@/types/firestore';
import { useChallengeResultToasts, useChallenges } from './useChallenges';

vi.mock('@/context/AuthContext', () => ({ useAuth: vi.fn() }));

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    getFirestore: vi.fn(),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
  };
});

const invite = (id: string) =>
  ({
    id,
    source: 'friend_invite',
    status: 'pending',
    createdBy: 'friend',
    participantIds: ['friend', 'me'],
    participants: {
      friend: { displayName: 'Thiery', score: null, rsvp: 'accepted' },
      me: { displayName: 'Me', score: null, rsvp: 'pending' },
    },
  }) as unknown as ChallengeDoc & { id: string };

const result = (id: string) =>
  ({
    id,
    source: 'share',
    status: 'completed',
    createdBy: 'me',
    participantIds: ['me', 'friend'],
    participants: {
      me: { displayName: 'Me', score: 900, rsvp: null },
      friend: { displayName: 'Thiery', score: 17, rsvp: null },
    },
  }) as unknown as ChallengeDoc & { id: string };

let inbox: (ChallengeDoc & { id: string })[] = [];

const mockInbox = () =>
  vi.mocked(firestore.getDocs).mockImplementation(
    async () =>
      ({
        docs: inbox.map(({ id, ...data }) => ({ id, data: () => data })),
      }) as never
  );

describe('challenge toasts', () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  beforeEach(() => {
    localStorage.clear();
    vi.mocked(authContext.useAuth).mockReturnValue({ currentUser: { uid: 'me' } } as never);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockInbox();
  });

  const renderToasts = (isPlaying: boolean) => {
    const onToast = vi.fn();
    const hook = renderHook(
      ({ playing }) => {
        useChallengeResultToasts(onToast, { isPlaying: playing });
        return useChallenges();
      },
      { wrapper, initialProps: { playing: isPlaying } }
    );
    return { onToast, ...hook };
  };

  const arrive = async (item: ChallengeDoc & { id: string }) => {
    inbox = [...inbox, item];
    await act(() => queryClient.refetchQueries({ queryKey: ['challenges', 'me'] }));
  };

  it('stays quiet about the pile waiting at sign-in, and badges it', async () => {
    inbox = [invite('a'), result('b'), result('c')];
    const { onToast, result: hook } = renderToasts(true);

    await waitFor(() => expect(hook.current.unreadCount).toBe(3));
    expect(onToast).not.toHaveBeenCalled();
  });

  it('toasts a challenge that arrives mid-game, once', async () => {
    inbox = [result('b')];
    const { onToast, result: hook, rerender } = renderToasts(true);
    await waitFor(() => expect(hook.current.isSuccess).toBe(true));

    await arrive(invite('a'));
    await waitFor(() => expect(hook.current.challenges).toHaveLength(2));
    expect(onToast).toHaveBeenCalledExactlyOnceWith({
      challengeId: 'a',
      message: 'Thiery challenged you — tap to play',
    });

    await act(() => queryClient.refetchQueries({ queryKey: ['challenges', 'me'] }));
    rerender({ playing: true });
    expect(onToast).toHaveBeenCalledTimes(1);
  });

  it('leaves arrivals to the badge when not playing, even after starting a game', async () => {
    inbox = [];
    const { onToast, result: hook, rerender } = renderToasts(false);
    await waitFor(() => expect(hook.current.isSuccess).toBe(true));

    await arrive(result('b'));
    await waitFor(() => expect(hook.current.unreadCount).toBe(1));
    rerender({ playing: true });

    expect(onToast).not.toHaveBeenCalled();
  });
});
