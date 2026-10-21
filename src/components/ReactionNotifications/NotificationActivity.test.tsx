import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { ActivityRecord, ReactionTarget } from '@/utils/activityTimeline';
import { NotificationActivity } from './NotificationActivity';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('@/components/ActivityTimeline/ActivityTimeline', () => ({
  ActivityTimeline: ({ entries }: { entries: { type: string }[] }) => (
    <div>{entries.map((item) => item.type).join(',')}</div>
  ),
}));
const mount = (kind: ReactionTarget['kind'], record: ActivityRecord | null) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(
    ['notificationSource', kind === 'certification' ? 'activityEvents' : 'games', 'old-source'],
    record
  );
  return render(
    <MantineProvider>
      <QueryClientProvider client={client}>
        <NotificationActivity target={{ kind, sourceId: 'old-source' }} />
      </QueryClientProvider>
    </MantineProvider>
  );
};
const game = {
  type: 'game',
  game: {
    id: 'old-source',
    userId: 'me',
    gameId: 'old',
    words: { en: 'apple' },
    difficulties: { en: 'basic' },
    shuffledLanguages: ['en'],
    guessHistory: ['apple'],
    isLiveGame: false,
    isWin: true,
    score: 500,
    startedAt: Timestamp.fromMillis(100),
    completedAt: Timestamp.fromMillis(200),
    activity: { feats: [], firstGame: false, personalBest: true, streak: null },
  },
} satisfies ActivityRecord;
it('opens the exact personal-best activity independently of feed pagination', () => {
  mount('personalBest', game);
  expect(screen.getByText('personalBest')).toBeInTheDocument();
  expect(screen.queryByText('games')).not.toBeInTheDocument();
});
it('opens certifications through the activity-event source', () => {
  mount('certification', {
    type: 'certification',
    certification: {
      id: 'old-source',
      userId: 'me',
      lang: 'pt',
      level: 2,
      wordCount: 150,
      createdAt: Timestamp.fromMillis(100),
    },
  });
  expect(screen.getByText('certification')).toBeInTheDocument();
});
it('handles missing sources without showing an unrelated activity', () => {
  mount('game', null);
  expect(screen.getByText('This activity is no longer available.')).toBeInTheDocument();
});
it('does not show another player’s activity through a notification link', () => {
  mount('game', { ...game, game: { ...game.game, userId: 'someone' } });
  expect(screen.getByText('This activity is no longer available.')).toBeInTheDocument();
});
