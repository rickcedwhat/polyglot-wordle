import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { beforeEach, expect, it, vi } from 'vitest';
import type { ReactionNotification } from '@/utils/reactionNotifications';
import {
  ReactionNotificationsProvider,
  saveReactionReceipts,
  useReactionNotifications,
} from './ReactionNotificationsContext';

const state = vi.hoisted(() => ({
  uid: 'me',
  subscriptions: [] as {
    path: string;
    next: (snapshot: unknown) => void;
    fail: () => void;
    stop: ReturnType<typeof vi.fn>;
  }[],
  previous: undefined as Timestamp | undefined,
  writes: vi.fn(),
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: state.uid } }) }));
vi.mock('firebase/firestore', async (original) => ({
  ...(await original<typeof import('firebase/firestore')>()),
  getFirestore: () => ({}),
  collection: (_db: unknown, ...parts: string[]) => parts.join('/'),
  doc: (_db: unknown, ...parts: string[]) => parts.join('/'),
  query: (path: string) => path,
  onSnapshot: (
    path: string,
    _options: unknown,
    next: (snapshot: unknown) => void,
    fail: () => void
  ) => {
    const stop = vi.fn();
    state.subscriptions.push({ path, next, fail, stop });
    return stop;
  },
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<void>) =>
    fn({
      get: async () => ({
        exists: () => !!state.previous,
        data: () => ({ seenAt: state.previous }),
      }),
      set: state.writes,
    }),
}));
const emit = (index: number, rows: Record<string, unknown>[], cached = false) =>
  state.subscriptions[index].next({
    docs: rows.map((row) => ({ id: row.id, data: () => row })),
    metadata: { fromCache: cached },
  });
const reaction = {
  id: 'reaction',
  userId: 'alex',
  ownerId: 'me',
  sourceId: 'me_game',
  kind: 'game',
  targetKey: 'me_game__game',
  emoji: 'applause',
  createdAt: Timestamp.fromMillis(1000),
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <ReactionNotificationsProvider>{children}</ReactionNotificationsProvider>
);
beforeEach(() => {
  state.uid = 'me';
  state.subscriptions = [];
  state.previous = undefined;
  vi.clearAllMocks();
});
it('waits for both streams, distinguishes cache from server, and synchronizes read state', async () => {
  const { result, unmount } = renderHook(useReactionNotifications, { wrapper });
  expect(result.current.isLoading).toBe(true);
  act(() => emit(0, [reaction], true));
  expect(result.current.isLoading).toBe(true);
  act(() => emit(1, [], true));
  expect(result.current.ready).toBe(false);
  expect(result.current.items[0].unread).toBe(true);
  act(() => {
    emit(0, [reaction]);
    emit(1, []);
  });
  expect(result.current.ready).toBe(true);
  act(() => emit(1, [{ id: 'me_game__game', seenAt: Timestamp.fromMillis(1000) }]));
  expect(result.current.items[0].unread).toBe(false);
  unmount();
  expect(state.subscriptions.every((sub) => sub.stop.mock.calls.length === 1)).toBe(true);
});
it('cleans up on account change and can retry a failed listener', async () => {
  const { result, rerender } = renderHook(useReactionNotifications, { wrapper });
  act(() => {
    emit(0, [reaction]);
    emit(1, []);
  });
  state.uid = 'other';
  rerender();
  expect(result.current.items).toEqual([]);
  expect(state.subscriptions[0].stop).toHaveBeenCalledOnce();
  act(() => state.subscriptions[2].fail());
  expect(result.current.isError).toBe(true);
  act(() => result.current.retry());
  await waitFor(() => expect(state.subscriptions).toHaveLength(6));
  expect(result.current.isError).toBe(false);
});
it('never regresses a newer receipt from another tab', async () => {
  const item = {
    id: 'me_game__game',
    latestAt: Timestamp.fromMillis(1000),
  } as ReactionNotification;
  state.previous = Timestamp.fromMillis(2000);
  await saveReactionReceipts('me', [item]);
  expect(state.writes).not.toHaveBeenCalled();
  state.previous = Timestamp.fromMillis(500);
  await saveReactionReceipts('me', [item]);
  expect(state.writes).toHaveBeenCalledWith('users/me/reactionReceipts/me_game__game', {
    seenAt: item.latestAt,
  });
});
