import { useState, type ReactNode } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import { MockAuth } from '@/storybook/MockAuth';
import { FeedPage } from './Feed.page';

const SeedFeed = ({ children }: { children: ReactNode }) => {
  const client = useQueryClient();
  useState(() => {
    const games = ['alex', 'sam', 'me'].map((userId, i) => ({
      id: `${userId}_story-${i}`,
      userId,
      gameId: `story-${i}`,
      words: { en: 'apple', es: 'rubia', fr: 'merci' },
      shuffledLanguages: ['en', 'es', 'fr'],
      difficulties: {},
      guessHistory: i === 0 ? ['apple', 'rubia', 'merci'] : ['crane', 'apple'],
      isLiveGame: false,
      isWin: i === 0,
      score: i === 0 ? 500 : 100,
      startedAt: Timestamp.fromMillis(1_790_000_000_000),
      completedAt: Timestamp.fromMillis(1_790_000_000_000),
    }));
    client.setQueryData(['activityTimeline', 'me'], {
      pages: [{ records: games.map((game) => ({ type: 'game', game })) }],
      pageParams: [undefined],
    });
    client.setQueryDefaults(['activityTimeline'], { enabled: false });
    client.setQueryDefaults(['playedGame'], { enabled: false });
    // The first opponent is unplayed; the second is ready to compare.
    client.setQueryData(['playedGame', 'me', 'story-0'], null);
    client.setQueryData(['playedGame', 'me', 'story-1'], { ...games[1], userId: 'me' });
    client.setQueryData(
      ['headToHead', 'story-1', 'me', 'sam'],
      [{ ...games[1], userId: 'me' }, games[1]]
    );
    ['alex', 'sam', 'me'].forEach((id, i) => {
      client.setQueryData(['userProfile', id], {
        displayName: ['Alex Rivera', 'Sam Okafor', 'You'][i],
        photoURL: '',
        pinnedGames: [],
      });
      client.setQueryData(['vocabulary', id], { en: {}, es: {}, fr: {}, it: {}, pt: {} });
    });
  });
  return children;
};
const meta: Meta<typeof FeedPage> = {
  title: 'Social/Activity feed',
  component: FeedPage,
  decorators: [
    (Story) => (
      <MockAuth>
        <SeedFeed>
          <Story />
        </SeedFeed>
      </MockAuth>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof FeedPage>;
export const RecentGames: Story = {};
