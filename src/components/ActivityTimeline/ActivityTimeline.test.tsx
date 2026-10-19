import { fireEvent, render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { buildTimeline, type FeedGame } from '@/utils/activityTimeline';
import { ActivityTimeline } from './ActivityTimeline';

vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({ data: { displayName: 'Alex', photoURL: '' } }),
}));
vi.mock('@/components/GameHistoryCard/GameHistoryCard', () => ({
  GameHistoryCard: ({ game }: { game: FeedGame }) => <div>Full game detail {game.id}</div>,
}));
const game = (id: string): FeedGame => ({
  id,
  userId: 'alex',
  gameId: id,
  words: { en: 'apple' },
  difficulties: {},
  shuffledLanguages: ['en', 'es', 'fr'],
  guessHistory: ['crane', 'apple', 'rubia', 'merci'],
  score: 1240,
  isLiveGame: false,
  isWin: true,
  startedAt: Timestamp.fromMillis(1),
  completedAt: Timestamp.fromMillis(1000),
});
it('uses cards for every event and expands a group before mounting game details', () => {
  const first = game('first');
  first.activity = { firstGame: false, personalBest: true, streak: null, feats: [] };
  const entries = buildTimeline([
    { type: 'game', game: first },
    { type: 'game', game: game('second') },
    {
      type: 'certification',
      certification: {
        id: 'cert',
        userId: 'mina',
        lang: 'pt',
        level: 2,
        wordCount: 150,
        createdAt: Timestamp.fromMillis(2000),
      },
    },
  ]);
  render(
    <MantineProvider>
      <MemoryRouter>
        <ActivityTimeline entries={entries} renderReactions={() => null} />
      </MemoryRouter>
    </MantineProvider>
  );
  expect(screen.getAllByRole('article')).toHaveLength(3);
  expect(screen.getByText('1,240 pts')).toBeInTheDocument();
  expect(screen.queryByText(/Full game detail/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show games' }));
  expect(screen.getAllByRole('button', { name: /Solved in 4 guesses/ })).toHaveLength(2);
  fireEvent.click(screen.getAllByRole('button', { name: /Solved in 4 guesses/ })[0]);
  expect(screen.getByText('Full game detail first')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show games' }));
  expect(screen.queryByText('Full game detail first')).not.toBeInTheDocument();
});
