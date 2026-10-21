import { renderHook } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactionNotification } from '@/utils/reactionNotifications';
import { useReactionNotificationToasts } from './useReactionNotificationToasts';

const state = vi.hoisted(() => ({ items: [] as ReactionNotification[], ready: true }));
vi.mock('@/context/ReactionNotificationsContext', () => ({
  useReactionNotifications: () => state,
}));
const item = (time: number): ReactionNotification => ({
  id: 'source__game',
  kind: 'game',
  sourceId: 'source',
  ownerId: 'me',
  actors: ['alex'],
  reactions: [],
  latestAt: Timestamp.fromMillis(time),
  unread: true,
});
beforeEach(() => {
  state.items = [];
  state.ready = true;
  vi.spyOn(Date, 'now').mockReturnValue(1000);
});
afterEach(() => vi.restoreAllMocks());
it('silences initial data, then toasts only newer arrivals during gameplay once', () => {
  state.items = [item(900)];
  const toast = vi.fn();
  const { rerender } = renderHook(({ playing }) => useReactionNotificationToasts(playing, toast), {
    initialProps: { playing: true },
  });
  expect(toast).not.toHaveBeenCalled();
  state.items = [item(1100)];
  rerender({ playing: true });
  expect(toast).toHaveBeenCalledOnce();
  state.items = [{ ...item(1100), unread: false }];
  rerender({ playing: true });
  state.items = [item(1050)];
  rerender({ playing: true }); // newest reaction removed
  expect(toast).toHaveBeenCalledOnce();
  rerender({ playing: false });
  state.items = [item(1200)];
  rerender({ playing: false });
  rerender({ playing: true });
  expect(toast).toHaveBeenCalledOnce();
});
it('does not replay offline/reconnection snapshots or reactions from before gameplay', () => {
  const toast = vi.fn();
  const { rerender } = renderHook(() => useReactionNotificationToasts(true, toast));
  state.items = [item(950)];
  rerender();
  expect(toast).not.toHaveBeenCalled();
  state.ready = false;
  rerender();
  state.items = [item(1500)];
  state.ready = true;
  rerender();
  expect(toast).not.toHaveBeenCalled();
  state.items = [item(1600)];
  rerender();
  expect(toast).toHaveBeenCalledOnce();
});
