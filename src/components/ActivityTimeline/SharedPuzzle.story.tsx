import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import { Container, Stack, Text, Title } from '@mantine/core';
import { MockAuth } from '@/storybook/MockAuth';
import type { ActivityRecord, FeedGame } from '@/utils/activityTimeline';
import { buildFeedTimeline } from '@/utils/sharedPuzzleFeed';
import { ActivityTimeline } from './ActivityTimeline';

const profiles = { alex: 'Alex Rivera', mina: 'Mina Chen', sam: 'Sam Okafor', me: 'Cedrick' };
const games: FeedGame[] = Object.keys(profiles)
  .filter((id) => id !== 'me')
  .map((userId, index) => ({
    id: `${userId}_shared-puzzle`,
    userId,
    gameId: 'shared-puzzle',
    words: { en: 'apple', es: 'queso', fr: 'fruit' },
    difficulties: { en: 'basic', es: 'intermediate', fr: 'basic' },
    shuffledLanguages: ['en', 'es', 'fr'],
    guessHistory: ['crane', 'apple', 'queso', 'fruit'],
    isLiveGame: false,
    isWin: true,
    score: [1320, 1530, 1320][index],
    scoringVersion: 3,
    startedAt: Timestamp.fromMillis(1793780000000),
    completedAt: Timestamp.fromMillis(1793780600000 + index * 60000),
  }));
const Preview = ({
  state = 'unplayed',
  expanded = false,
}: {
  state?: 'unplayed' | 'started' | 'finished';
  expanded?: boolean;
}) => {
  const client = useQueryClient();
  useState(() => {
    Object.entries(profiles).forEach(([id, displayName]) => {
      client.setQueryData(['userProfile', id], { displayName, photoURL: '', pinnedGames: [] });
      client.setQueryData(['vocabulary', id], { en: {}, es: {}, fr: {}, it: {}, pt: {} });
    });
    const mine =
      state === 'unplayed'
        ? null
        : {
            ...games[0],
            userId: 'me',
            id: 'me_shared-puzzle',
            score: 1400,
            isLiveGame: state === 'started',
            completedAt: state === 'started' ? null : games[0].completedAt,
          };
    client.setQueryData(['playedGame', 'me', 'shared-puzzle'], mine);
    client.setQueryData(['playedGame', 'me', 'solo-game'], null);
  });
  const records: ActivityRecord[] = [
    ...games.map((game) => ({ type: 'game' as const, game })),
    {
      type: 'certification',
      certification: {
        id: 'cert_mina_pt_2',
        userId: 'mina',
        lang: 'pt',
        level: 2,
        wordCount: 150,
        createdAt: Timestamp.fromMillis(1793780200000),
      },
    },
    {
      type: 'game',
      game: {
        ...games[0],
        id: 'alex_solo',
        gameId: 'solo-game',
        completedAt: Timestamp.fromMillis(1793780100000),
      },
    },
  ];
  return (
    <Container size={740} py={32}>
      <Stack gap="lg">
        <header>
          <Title order={1} size={28}>
            Activity feed
          </Title>
          <Text c="dimmed" mt={5}>
            Games, milestones, and moments worth sharing.
          </Text>
        </header>
        <ActivityTimeline
          entries={buildFeedTimeline(records)}
          initiallyExpanded={expanded ? 'groups' : undefined}
          renderReactions={() => null}
        />
        <Text size="xs" c="dimmed">
          Storybook fixture · shared-puzzle results reflect recent activity
        </Text>
      </Stack>
    </Container>
  );
};
const meta: Meta<typeof Preview> = {
  title: 'Social/Shared puzzles',
  component: Preview,
  decorators: [
    (Story) => (
      <MockAuth>
        <Story />
      </MockAuth>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Preview>;
export const NotPlayed: Story = {};
export const PlayersExpanded: Story = { args: { expanded: true } };
export const InProgress: Story = { args: { state: 'started', expanded: true } };
export const Finished: Story = { args: { state: 'finished', expanded: true } };
