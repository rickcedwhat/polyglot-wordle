import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timestamp } from 'firebase/firestore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { ChallengeInboxItem } from '@/hooks/useChallenges';
import type { GameDoc } from '@/types/firestore';
import { ChallengeBanner } from '../ChallengeBanner/ChallengeBanner';
import { ChallengeInboxCard } from '../ChallengeInboxCard/ChallengeInboxCard';
import { LeaderboardCard } from '../LeaderboardCard/LeaderboardCard';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'me' } }),
}));
vi.mock('@/hooks/useGameActions', () => ({ useGameActions: () => ({ createNewGame: vi.fn() }) }));
vi.mock('@/hooks/useFriendships', () => ({
  useFriendships: () => ({ getFriendshipStatus: () => 'none' }),
}));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({ data: { displayName: 'Alex', photoURL: '/avatar.png' } }),
}));
vi.mock('../ChallengeFriendModal/ChallengeFriendModal', () => ({
  ChallengeFriendModal: () => null,
}));

const game: GameDoc = {
  userId: 'opponent',
  gameId: 'game',
  words: {},
  difficulties: {},
  shuffledLanguages: ['en', 'es', 'fr'],
  isLiveGame: false,
  guessHistory: [],
  isWin: false,
  score: 100,
  startedAt: Timestamp.fromMillis(0),
  completedAt: null,
};

function renderCard(children: ReactNode) {
  return render(
    <MantineProvider>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          {children}
          <Routes>
            <Route path="/" element={null} />
            <Route path="/profile/opponent" element={<h1>Opponent profile</h1>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
}

describe('avatar profile links', () => {
  it.each(['Alex', ''])('names the banner avatar before and after loading (%s)', (displayName) => {
    renderCard(
      <ChallengeBanner
        challengerGame={game}
        challengerUser={{ displayName, photoURL: '/avatar.png' }}
      />
    );
    const link = screen.getByRole('link', { name: `View ${displayName || 'A friend'}'s profile` });
    expect(link).toHaveAttribute('href', '/profile/opponent');
    fireEvent.load(link.querySelector('img')!);
    expect(link).toHaveAccessibleName(`View ${displayName || 'A friend'}'s profile`);
  });

  it.each(['Alex', ''])('names the inbox avatar before and after loading (%s)', (displayName) => {
    const challenge: ChallengeInboxItem = {
      id: 'challenge',
      gameId: 'game',
      createdAt: Timestamp.fromMillis(0),
      createdBy: 'opponent',
      source: 'share',
      type: 'direct',
      maxPlayers: 2,
      status: 'active',
      participants: {
        opponent: {
          displayName,
          photoURL: '/avatar.png',
          score: null,
          rsvp: null,
          completedAt: null,
        },
      },
      participantIds: ['me', 'opponent'],
      winnerId: null,
    };
    renderCard(
      <ChallengeInboxCard challenge={challenge} section="needsYou" onMarkSeen={vi.fn()} />
    );
    const link = screen.getByRole('link', { name: `View ${displayName || 'Opponent'}'s profile` });
    expect(link).toHaveAttribute('href', '/profile/opponent');
    fireEvent.load(link.querySelector('img')!);
    expect(link).toHaveAccessibleName(`View ${displayName || 'Opponent'}'s profile`);
  });
});

describe('leaderboard controls', () => {
  it('keeps row selection and profile navigation separate for mouse and keyboard', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderCard(<LeaderboardCard game={game} rank={1} onClick={onClick} isSelected />);
    const button = screen.getByRole('button', { name: 'View Alex’s game, rank 1, score 100' });
    const link = screen.getByRole('link');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).not.toContainElement(link);
    expect(link.closest('button, [role="button"]')).toBeNull();

    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(3);

    await user.tab();
    expect(link).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('heading', { name: 'Opponent profile' })).toBeInTheDocument();
    await user.click(link);
    expect(onClick).toHaveBeenCalledTimes(3);
  });
});
