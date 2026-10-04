import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { PostGameModal } from '@/components/PostGameModal/PostGameModal';
import { ScoreProvider } from '@/context/ScoreContext';
import type { GameDoc } from '@/types/firestore';
import { PostGameView } from './PostGameView';

vi.mock('@/context/SidebarContext', () => ({
  useSidebar: () => ({ setSidebarContent: vi.fn() }),
}));
vi.mock('@/hooks/useChallenge', () => ({
  useChallenge: () => ({ challengerGame: { userId: 'challenger' } }),
}));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({ data: { displayName: 'Friend' } }),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'me' } }),
}));
vi.mock('@/components/Gameboard/Gameboard', () => ({ GameBoard: () => null }));
vi.mock('@/components/Leaderboard/Leaderboard', () => ({
  Leaderboard: ({ onGameSelect }: { onGameSelect: (game: GameDoc) => void }) => (
    <button type="button" onClick={() => onGameSelect({ ...game, userId: 'friend' })}>
      View friend
    </button>
  ),
}));
vi.mock('@/components/PostGameModal/PostGameModal', () => ({
  PostGameModal: ({ gameSession, onWatchDuel }: ComponentProps<typeof PostGameModal>) => (
    <section aria-label="Summary">
      <span>Summary for {gameSession.userId}</span>
      {onWatchDuel && (
        <button type="button" onClick={onWatchDuel}>
          Watch the replay
        </button>
      )}
    </section>
  ),
}));
vi.mock('@/components/Replay/HeadToHeadModal', () => ({
  HeadToHeadModal: ({ sides }: { sides: { userId: string }[] }) => (
    <div>Replay: {sides.map((side) => side.userId).join(' vs ')}</div>
  ),
}));

const game: GameDoc = {
  userId: 'me',
  gameId: 'puzzle',
  words: {},
  difficulties: {},
  shuffledLanguages: ['en', 'es', 'fr'],
  guessHistory: [],
  isLiveGame: false,
  isWin: false,
  score: 0,
  startedAt: Timestamp.fromMillis(0),
  completedAt: Timestamp.fromMillis(1),
};

it('offers the challenger replay only for the session owner summary', () => {
  render(
    <MantineProvider>
      <ScoreProvider>
        <PostGameView gameSession={game} />
      </ScoreProvider>
    </MantineProvider>
  );
  expect(screen.getByText('Summary for me')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Watch the replay' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'View friend' }));
  expect(screen.getByText('Summary for friend')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Watch the replay' })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Back to mine' }));
  fireEvent.click(screen.getByRole('button', { name: 'Watch the replay' }));
  expect(screen.getByText('Replay: me vs challenger')).toBeInTheDocument();
});
