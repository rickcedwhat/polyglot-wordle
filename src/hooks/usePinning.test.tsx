import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PinLimitError, setGamePinned, usePinning } from './usePinning';

const state = vi.hoisted(() => ({
  pins: undefined as string[] | undefined,
  update: vi.fn(),
  fail: false,
  exists: true,
  toast: vi.fn(),
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('@/utils/toast', () => ({ showToast: state.toast }));
vi.mock('firebase/firestore', async (original) => ({
  ...(await original<typeof import('firebase/firestore')>()),
  getFirestore: () => ({}),
  doc: (_db: unknown, ...parts: string[]) => parts.join('/'),
  runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<void>) => {
    if (state.fail) {
      throw new Error('offline');
    }
    return fn({
      get: async () => ({ exists: () => state.exists, data: () => ({ pinnedGames: state.pins }) }),
      update: (ref: string, data: { pinnedGames: string[] }) => {
        state.update(ref, data);
        state.pins = data.pinnedGames;
      },
    });
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.pins = undefined;
  state.fail = false;
  state.exists = true;
});
it('pins the first game when the saved pin list is missing', async () => {
  await setGamePinned('me', 'first', true);
  expect(state.pins).toEqual(['first']);
});
it('allows a sixth pin and rejects a seventh against the saved list', async () => {
  state.pins = ['1', '2', '3', '4', '5'];
  await setGamePinned('me', '6', true);
  expect(state.pins).toHaveLength(6);
  state.update.mockClear();
  await expect(setGamePinned('me', '7', true)).rejects.toBeInstanceOf(PinLimitError);
  expect(state.update).not.toHaveBeenCalled();
  expect(state.pins).toHaveLength(6);
});
it('treats repeat pins as idempotent at capacity and allows unpinning to make room', async () => {
  state.pins = ['1', '2', '3', '4', '5', '6'];
  await setGamePinned('me', '6', true);
  expect(state.update).not.toHaveBeenCalled();
  await setGamePinned('me', '3', false);
  await setGamePinned('me', '7', true);
  expect(state.pins).toEqual(['1', '2', '4', '5', '6', '7']);
});
it('toasts the six-game limit instead of silently failing when the cached profile is stale', async () => {
  state.pins = ['1', '2', '3', '4', '5', '6'];
  const client = new QueryClient();
  client.setQueryData(['userProfile', 'me'], { pinnedGames: ['1'] });
  const { result } = renderHook(usePinning, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  await act(async () => {
    await expect(result.current.pinGame('7')).rejects.toBeInstanceOf(PinLimitError);
  });
  expect(state.toast).toHaveBeenCalledWith(
    expect.objectContaining({ message: 'You can pin up to 6 games. Unpin a game to make room.' }),
    { immediate: true }
  );
});
it('reports write failures and refreshes both profile and pinned-game caches after success', async () => {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const { result } = renderHook(usePinning, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  state.fail = true;
  await act(async () => {
    await expect(result.current.pinGame('first')).rejects.toThrow('offline');
  });
  expect(state.toast).toHaveBeenCalledWith(
    expect.objectContaining({
      color: 'red',
      message: 'Could not update your pinned games. Please try again.',
    }),
    { immediate: true }
  );
  expect(invalidate).not.toHaveBeenCalled();
  state.fail = false;
  await act(async () => {
    await result.current.pinGame('first');
  });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['userProfile', 'me'] });
  expect(invalidate).toHaveBeenCalledWith({ queryKey: ['pinnedGames', 'me'] });
});
