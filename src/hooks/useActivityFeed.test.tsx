import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { getDocs } from 'firebase/firestore';
import { expect, it, vi } from 'vitest';
import { useActivityFeed } from './useActivityFeed';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  collection: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  query: vi.fn(),
  startAfter: vi.fn(),
  getDocs: vi.fn(),
}));
it('paginates completed games without dropping the earlier page', async () => {
  const docs = Array.from({ length: 12 }, (_, i) => ({
    id: `game-${i}`,
    data: () => ({ gameId: `puzzle-${i}`, completedAt: 10 }),
  }));
  vi.mocked(getDocs)
    .mockResolvedValueOnce({ docs, size: 12 } as Awaited<ReturnType<typeof getDocs>>)
    .mockResolvedValueOnce({
      docs: [{ id: 'last', data: () => ({ gameId: 'last', completedAt: 1 }) }],
      size: 1,
    } as Awaited<ReturnType<typeof getDocs>>);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useActivityFeed(), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.hasNextPage).toBe(true);
  await act(async () => {
    await result.current.fetchNextPage();
  });
  await waitFor(() =>
    expect(result.current.data?.pages.flatMap((page) => page.games)).toHaveLength(13)
  );
  expect(result.current.hasNextPage).toBe(false);
});
