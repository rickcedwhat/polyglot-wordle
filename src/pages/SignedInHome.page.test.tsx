import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { ChallengeInboxItem } from '@/hooks/useChallenges';
import { SignedInHomePage } from './SignedInHome.page';

const state = vi.hoisted(() => ({
  needsYou: [] as ChallengeInboxItem[],
  challengeError: false,
  feedError: false,
  loading: false,
  games: [] as { id: string }[],
  needsSetup: true,
  markSeen: vi.fn().mockResolvedValue(undefined),
  refetchChallenges: vi.fn(),
  refetchFeed: vi.fn(),
  createNewGame: vi.fn(),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'me', displayName: 'Cedrick' } }),
}));
vi.mock('@/hooks/useChallenges', () => ({
  useChallenges: () => ({
    needsYou: state.needsYou,
    isLoading: state.loading,
    isError: state.challengeError,
    markResultSeen: state.markSeen,
    refetch: state.refetchChallenges,
  }),
}));
vi.mock('@/hooks/useActivityFeed', () => ({
  useActivityFeed: () => ({
    data: { pages: [{ games: state.games }] },
    isPending: state.loading,
    isError: state.feedError,
    refetch: state.refetchFeed,
  }),
}));
vi.mock('@/hooks/useGameActions', () => ({
  useGameActions: () => ({ needsSetup: state.needsSetup, createNewGame: state.createNewGame }),
}));
vi.mock('@/hooks/useFriendships', () => ({
  useFriendships: () => ({ getFriendshipStatus: () => 'none' }),
}));
vi.mock('@/components/FeedCard/FeedCard', () => ({
  FeedCard: ({ game }: { game: { id: string } }) => <div>{game.id}</div>,
}));
vi.mock('@/components/GameSetup/GameSetupDialog', () => ({
  GameSetupDialog: ({ opened }: { opened: boolean }) => (opened ? <div>Setup is open</div> : null),
}));
vi.mock('@/components/Replay/HeadToHeadModal', () => ({ HeadToHeadModal: () => null }));
vi.mock('@/components/ChallengeFriendModal/ChallengeFriendModal', () => ({
  ChallengeFriendModal: () => null,
}));

const challenge = (id: string, completed = false): ChallengeInboxItem => ({
  id,
  gameId: 'puzzle',
  createdBy: 'alex',
  createdAt: Timestamp.fromMillis(1),
  participantIds: ['me', 'alex'],
  source: 'friend_invite',
  type: 'direct',
  maxPlayers: 2,
  status: completed ? 'completed' : 'pending',
  winnerId: completed ? 'me' : null,
  participants: {
    me: {
      displayName: 'Cedrick',
      photoURL: '',
      score: completed ? 500 : null,
      rsvp: 'pending',
      completedAt: null,
    },
    alex: {
      displayName: 'Alex',
      photoURL: '',
      score: 400,
      rsvp: 'accepted',
      completedAt: Timestamp.fromMillis(1),
    },
  },
});
const GameDestination = () => <div>Challenge game{useLocation().search}</div>;
const mount = () =>
  render(
    <MantineProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<SignedInHomePage />} />
            <Route path="/game/:uuid" element={<GameDestination />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
beforeEach(() => {
  state.needsYou = [];
  state.games = [];
  state.challengeError = false;
  state.feedError = false;
  state.loading = false;
  state.needsSetup = true;
  vi.clearAllMocks();
});
it('opens the received challenge game with challenger attribution', () => {
  state.needsYou = [challenge('invite')];
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Play' }));
  expect(screen.getByText('Challenge game?challenger=alex')).toBeInTheDocument();
});
it('opens an unread result and marks it seen only when requested', async () => {
  state.needsYou = [challenge('result', true)];
  const view = mount();
  expect(state.markSeen).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Showdown' }));
  expect(state.markSeen).toHaveBeenCalledWith('result');
  expect(await screen.findByRole('dialog')).toHaveTextContent('You won');
  state.needsYou = [];
  view.rerender(
    <MantineProvider>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={<SignedInHomePage />} />
            <Route path="/game/:uuid" element={<GameDestination />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
  expect(screen.getByRole('dialog')).toHaveTextContent('You won');
});
it('bounds the previews and links to the complete lists', () => {
  state.needsYou = Array.from({ length: 5 }, (_, i) => challenge(String(i)));
  state.games = [{ id: 'game-one' }, { id: 'game-two' }, { id: 'game-three' }];
  mount();
  expect(screen.getAllByRole('button', { name: 'Play' })).toHaveLength(3);
  expect(screen.getByRole('link', { name: /All challenges/ })).toHaveAttribute(
    'href',
    '/challenges'
  );
  expect(screen.getByRole('link', { name: /View all/ })).toHaveAttribute('href', '/feed');
  expect(screen.getByText('game-two')).toBeInTheDocument();
  expect(screen.queryByText('game-three')).not.toBeInTheDocument();
});
it('keeps each section usable if the other request fails and offers retries', () => {
  state.challengeError = true;
  state.games = [{ id: 'recent-game' }];
  const view = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(state.refetchChallenges).toHaveBeenCalledOnce();
  expect(screen.getByText('recent-game')).toBeInTheDocument();
  view.unmount();
  state.challengeError = false;
  state.feedError = true;
  state.needsYou = [challenge('invite')];
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(state.refetchFeed).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
});
it('does not mistake loading for an empty inbox or community', () => {
  state.loading = true;
  mount();
  expect(screen.queryByText('You’re all caught up')).not.toBeInTheDocument();
  expect(
    screen.queryByText('No finished games yet. Be the first to play!')
  ).not.toBeInTheDocument();
});
it('starts games through the existing setup preference behavior', () => {
  const view = mount();
  const community = screen.getByRole('region', { name: 'Around the community' });
  fireEvent.click(within(community).getByRole('button', { name: 'New game' }));
  expect(screen.getByText('Setup is open')).toBeInTheDocument();
  expect(state.createNewGame).not.toHaveBeenCalled();
  view.unmount();
  state.needsSetup = false;
  mount();
  fireEvent.click(
    within(screen.getByRole('region', { name: 'Around the community' })).getByRole('button', {
      name: 'New game',
    })
  );
  expect(state.createNewGame).toHaveBeenCalledOnce();
});
