import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useQueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Box } from '@mantine/core';
import { ScoreProvider } from '@/context/ScoreContext';
import { STORY_GAMES, type StoryGameFixture } from '@/storybook/fixtures';
import type { GameDoc } from '@/types/firestore';
import { LeaderboardList } from '../Leaderboard/Leaderboard';
import { Score } from '../Score/Score';
import { PostGameLayout } from './PostGameView';

const FRIENDS = [
  { uid: 'me', displayName: 'You', score: 1127 },
  { uid: 'alex', displayName: 'Alex Rivera', score: 980 },
  { uid: 'sam', displayName: 'Sam Okafor', score: 640 },
];

const toGame = (fixture: StoryGameFixture, userId: string, score: number) =>
  ({
    userId,
    gameId: 'story-game',
    words: fixture.words,
    guessHistory: fixture.guesses,
    shuffledLanguages: fixture.languages,
    score,
    isLiveGame: false,
  }) as unknown as GameDoc;

/** Seeds leaderboard profiles so the cards don't hit Firestore. */
const SeedProfiles = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  useState(() => {
    queryClient.setQueryDefaults(['userProfile'], { staleTime: Infinity, retry: false });
    FRIENDS.forEach(({ uid, displayName }) =>
      queryClient.setQueryData(['userProfile', uid], { uid, displayName, photoURL: null })
    );
  });
  return children;
};

const PostGameStory = ({ fixture }: { fixture: StoryGameFixture }) => {
  const games = FRIENDS.map(({ uid, score }) => toGame(fixture, uid, score));
  const [selected, setSelected] = useState(games[0]);
  return (
    <>
      <Box maw={220} mb="md">
        <Score />
      </Box>
      <PostGameLayout
        game={selected}
        viewingUserId={selected.userId === 'me' ? null : selected.userId}
        onViewOwn={() => setSelected(games[0])}
        onOpenSummary={() => {}}
        leaderboard={
          <LeaderboardList
            games={games}
            selectedUserId={selected.userId}
            onGameSelect={setSelected}
          />
        }
      />
    </>
  );
};

const meta: Meta<typeof PostGameStory> = {
  title: 'Game/PostGame',
  component: PostGameStory,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <ScoreProvider>
          <SeedProfiles>
            <Story />
          </SeedProfiles>
        </ScoreProvider>
      </MemoryRouter>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PostGameStory>;

export const DesktopWin: Story = {
  args: { fixture: STORY_GAMES.quickWin },
  parameters: { viewport: { defaultViewport: 'laptop' } },
};

export const DesktopPartial: Story = {
  args: { fixture: STORY_GAMES.realGame },
  parameters: { viewport: { defaultViewport: 'laptop' } },
};

export const Mobile: Story = {
  args: { fixture: STORY_GAMES.realGame },
  parameters: { viewport: { defaultViewport: 'phone' } },
};
