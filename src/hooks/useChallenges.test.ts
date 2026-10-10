import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const invite = (id: string, occurredAt = Date.now()) =>
  ({
    id,
    createdAt: firestore.Timestamp.fromMillis(occurredAt),
    source: 'friend_invite',
    status: 'pending',
    createdBy: 'friend',
    participantIds: ['friend', 'me'],
    participants: {
      friend: { displayName: 'Thiery', score: null, rsvp: 'accepted' },
      me: { displayName: 'Me', score: null, rsvp: 'pending' },
    },
  }) as unknown as ChallengeDoc & { id: string };

const result = (id: string, occurredAt = Date.now()) =>
  ({
    id,
    source: 'share',
    status: 'completed',
    createdBy: 'me',
    participantIds: ['me', 'friend'],
    participants: {
      me: {
        displayName: 'Me',
        score: 900,
        rsvp: null,
        completedAt: firestore.Timestamp.fromMillis(occurredAt - 60_000),
      },
      friend: {
        displayName: 'Thiery',
        score: 17,
        rsvp: null,
        completedAt: firestore.Timestamp.fromMillis(occurredAt),
      },
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
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    localStorage.clear();
    vi.mocked(authContext.useAuth).mockReturnValue({ currentUser: { uid: 'me' } } as never);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    mockInbox();
  });

  afterEach(() => {
    queryClient.clear();
    vi.restoreAllMocks();
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

  it.each([
    { create: invite, message: 'Thiery challenged you. Tap to play.', type: 'invite' },
    { create: result, message: 'Thiery finished. You won 900–17.', type: 'result' },
  ])('toasts a $type that arrives mid-game, once', async ({ create, message }) => {
    inbox = [result('b')];
    const { onToast, result: hook, rerender } = renderToasts(true);
    await waitFor(() => expect(hook.current.isSuccess).toBe(true));

    vi.mocked(Date.now).mockReturnValue(Date.now() + 1_000);
    await arrive(create('a'));
    await waitFor(() => expect(hook.current.challenges).toHaveLength(2));
    expect(onToast).toHaveBeenCalledExactlyOnceWith({
      challengeId: 'a',
      message,
    });

    await act(() => queryClient.refetchQueries({ queryKey: ['challenges', 'me'] }));
    rerender({ playing: true });
    expect(onToast).toHaveBeenCalledTimes(1);
  });

  it.each([
    { create: invite, type: 'invite' },
    { create: result, type: 'result' },
  ])('silences a delayed $type from before gameplay began', async ({ create }) => {
    inbox = [];
    const { onToast, result: hook, rerender } = renderToasts(false);
    await waitFor(() => expect(hook.current.isSuccess).toBe(true));
    const delayed = create('delayed');

    vi.mocked(Date.now).mockReturnValue(Date.now() + 1_000);
    rerender({ playing: true });
    await arrive(delayed);
    await waitFor(() => expect(hook.current.unreadCount).toBe(1));

    expect(onToast).not.toHaveBeenCalled();
  });

  it.each([
    { create: invite, type: 'invite' },
    { create: result, type: 'result' },
  ])('resets the cutoff when gameplay resumes for a $type', async ({ create }) => {
    inbox = [];
    const { onToast, result: hook, rerender } = renderToasts(true);
    await waitFor(() => expect(hook.current.isSuccess).toBe(true));
    rerender({ playing: false });
    vi.mocked(Date.now).mockReturnValue(Date.now() + 1_000);
    const delayed = create('delayed');

    vi.mocked(Date.now).mockReturnValue(Date.now() + 1_000);
    rerender({ playing: true });
    await arrive(delayed);
    await waitFor(() => expect(hook.current.unreadCount).toBe(1));
    expect(onToast).not.toHaveBeenCalled();

    vi.mocked(Date.now).mockReturnValue(Date.now() + 1_000);
    await arrive(create('live'));
    await waitFor(() => expect(hook.current.unreadCount).toBe(2));
    expect(onToast).toHaveBeenCalledTimes(1);
    expect(onToast).toHaveBeenCalledWith(expect.objectContaining({ challengeId: 'live' }));
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
