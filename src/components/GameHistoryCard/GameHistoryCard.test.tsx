import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getDoc, Timestamp } from 'firebase/firestore';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { GameDoc, UserDoc } from '@/types/firestore';
import { GameHistoryCard } from './GameHistoryCard';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
const pins = vi.hoisted(() => ({
  pinGame: vi.fn().mockResolvedValue('me'),
  unpinGame: vi.fn().mockResolvedValue('me'),
  isPending: false,
}));
vi.mock('@/hooks/usePinning', () => ({ usePinning: () => pins }));
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
function show(mine: GameDoc | null, cardGame = game, profile?: UserDoc) {
  vi.mocked(getDoc).mockResolvedValue({ exists: () => !!mine, data: () => mine } as Awaited<
    ReturnType<typeof getDoc>
  >);
  return render(
    <MantineProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <GameHistoryCard game={cardGame} userProfile={profile} />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  pins.pinGame.mockResolvedValue('me');
  pins.unpinGame.mockResolvedValue('me');
});
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

it('offers pinning on own games without a profile-only flag or an existing pin list', () => {
  show(null, { ...game, userId: 'me' }, { displayName: 'Me' } as UserDoc);
  const button = screen.getByRole('button', { name: 'Pin' });
  expect(button).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(button);
  expect(pins.pinGame).toHaveBeenCalledWith('puzzle');
});
it('keeps pin controls enabled even when six games are already pinned', () => {
  show(null, { ...game, userId: 'me' }, { pinnedGames: ['1', '2', '3', '4', '5', '6'] } as UserDoc);
  const button = screen.getByRole('button', { name: 'Pin' });
  expect(button).toBeEnabled();
  fireEvent.click(button);
  expect(pins.pinGame).toHaveBeenCalledWith('puzzle');
});
it('keeps unpinning available at the limit and consumes failures handled by the hook', async () => {
  pins.unpinGame.mockRejectedValueOnce(new Error('network'));
  show(null, { ...game, userId: 'me' }, {
    pinnedGames: ['puzzle', '2', '3', '4', '5', '6'],
  } as UserDoc);
  const button = screen.getByRole('button', { name: 'Unpin' });
  expect(button).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(button);
  await waitFor(() => expect(pins.unpinGame).toHaveBeenCalledWith('puzzle'));
});
it('does not offer pin controls for another player’s game', async () => {
  show(null);
  await screen.findByRole('link', { name: 'Challenge' });
  expect(screen.queryByRole('button', { name: 'Pin' })).not.toBeInTheDocument();
});
