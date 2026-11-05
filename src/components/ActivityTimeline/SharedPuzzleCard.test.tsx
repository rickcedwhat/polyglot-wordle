import { fireEvent, render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { FeedGame } from '@/utils/activityTimeline';
import { SharedPuzzleCard } from './SharedPuzzleCard';

const state = vi.hoisted(() => ({ mine: null as FeedGame | null, error: false, pending: false }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('@/hooks/usePlayedGame', () => ({
  usePlayedGame: () => ({
    mine: state.mine,
    canReveal: !!state.mine?.completedAt && !state.mine.isLiveGame,
    isError: state.error,
    isPending: state.pending,
    refetch: vi.fn(),
  }),
}));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: (id: string) => ({ data: { displayName: id, photoURL: '' } }),
}));
vi.mock('@/components/GameHistoryCard/GameHistoryCard', () => ({
  GameHistoryCard: ({ game }: { game: FeedGame }) => <div>Answers for {game.userId}</div>,
}));
const game = (userId: string, score: number): FeedGame => ({
  id: `${userId}_puzzle`,
  userId,
  gameId: 'puzzle',
  words: { en: 'apple' },
  difficulties: {},
  shuffledLanguages: ['en'],
  guessHistory: ['apple'],
  isLiveGame: false,
  isWin: true,
  score,
  startedAt: Timestamp.fromMillis(100),
  completedAt: Timestamp.fromMillis(200),
});
const mount = () =>
  render(
    <MantineProvider>
      <MemoryRouter>
        <SharedPuzzleCard
          entry={{
            id: 'shared',
            type: 'puzzle',
            at: 200,
            games: [game('alex', 1530), game('mina', 1320)],
          }}
          renderReactions={() => null}
          initiallyExpanded
        />
      </MemoryRouter>
    </MantineProvider>
  );
beforeEach(() => {
  state.mine = null;
  state.error = false;
  state.pending = false;
});
it('shows players but no scores, rankings or answer details before playing', () => {
  mount();
  expect(screen.getByText('alex')).toBeInTheDocument();
  expect(screen.queryByText(/1,530/)).not.toBeInTheDocument();
  expect(screen.queryByText('1')).not.toBeInTheDocument();
  expect(screen.queryByText(/Answers/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Show game details for/ })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Play this puzzle' })).toHaveAttribute(
    'href',
    expect.stringContaining('challenger=alex')
  );
});
it('keeps an in-progress game locked and offers Continue', () => {
  state.mine = { ...game('me', 100), isLiveGame: true, completedAt: null };
  mount();
  expect(screen.getByRole('link', { name: 'Continue challenge' })).toBeInTheDocument();
  expect(screen.queryByText(/1,530/)).not.toBeInTheDocument();
});
it('includes the viewer’s finished result and mounts details only when expanded', () => {
  state.mine = game('me', 1400);
  mount();
  expect(screen.getByText('3 players played this puzzle')).toBeInTheDocument();
  expect(screen.getByText('1,530 pts')).toBeInTheDocument();
  expect(screen.getByText('1,400 pts')).toBeInTheDocument();
  expect(screen.queryByText(/Answers/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show game details for alex' }));
  expect(screen.getByText('Answers for alex')).toBeInTheDocument();
});
it('does not unlock a different version of the same puzzle', () => {
  state.mine = { ...game('me', 1400), words: { en: 'melon' } };
  mount();
  expect(screen.getByText(/different setup/)).toBeInTheDocument();
  expect(screen.queryByText(/1,530/)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Show game details for/ })).not.toBeInTheDocument();
});
