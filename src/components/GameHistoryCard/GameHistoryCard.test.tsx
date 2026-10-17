import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getDoc, Timestamp } from 'firebase/firestore';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { GameDoc } from '@/types/firestore';
import { GameHistoryCard } from './GameHistoryCard';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('@/hooks/usePinning', () => ({ usePinning: () => ({}) }));
vi.mock('@/hooks/useGameAchievements', () => ({
  useGameAchievements: () => ({ feats: [], levelUps: [] }),
}));
vi.mock('@/components/Replay/HeadToHeadModal', () => ({
  HeadToHeadModal: () => <div>Comparison replay</div>,
}));
const game: GameDoc & { id: string } = {
  id: 'other_puzzle',
  userId: 'other',
  gameId: 'puzzle',
  words: { en: 'apple', es: 'rubia', fr: 'merci' },
  difficulties: {},
  shuffledLanguages: ['en', 'es', 'fr'],
  guessHistory: ['apple'],
  isLiveGame: false,
  isWin: false,
  score: 100,
  startedAt: Timestamp.fromMillis(0),
  completedAt: Timestamp.fromMillis(10),
};
function show(mine: GameDoc | null) {
  vi.mocked(getDoc).mockResolvedValue({ exists: () => !!mine, data: () => mine } as Awaited<
    ReturnType<typeof getDoc>
  >);
  return render(
    <MantineProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <GameHistoryCard game={game} />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}
beforeEach(() => vi.mocked(getDoc).mockClear());
it('offers the opponent’s puzzle as a challenge without showing answers', async () => {
  show(null);
  const link = await screen.findByRole('link', { name: 'Challenge' });
  await waitFor(() => expect(link).not.toHaveAttribute('data-loading'));
  expect(link.getAttribute('href')).toContain('challenger=other');
  expect(screen.queryByText(/apple/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Compare' })).not.toBeInTheDocument();
});
it('keeps a started puzzle spoiler-free and offers Continue challenge', async () => {
  show({ ...game, userId: 'me', completedAt: null, isLiveGame: true });
  expect(await screen.findByRole('link', { name: 'Continue challenge' })).toHaveAttribute(
    'href',
    expect.stringContaining('challenger=other')
  );
  expect(screen.queryByText(/apple/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Compare' })).not.toBeInTheDocument();
});
it('reveals answers and opens the comparison only after finishing', async () => {
  show({ ...game, userId: 'me' });
  fireEvent.click(await screen.findByRole('button', { name: 'Compare' }));
  expect(screen.getByText('apple · rubia · merci')).toBeInTheDocument();
  expect(screen.getByText('Comparison replay')).toBeInTheDocument();
});
