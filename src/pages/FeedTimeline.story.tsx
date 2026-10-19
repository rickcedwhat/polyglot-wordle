import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import { Container, Stack, Text, Title } from '@mantine/core';
import { ReactionBar } from '@/components/ActivityTimeline/ActivityReactions';
import { ActivityTimeline } from '@/components/ActivityTimeline/ActivityTimeline';
import type { ActivityReaction } from '@/hooks/useActivityReactions';
import { MockAuth } from '@/storybook/MockAuth';
import type { GameDoc } from '@/types/firestore';
import {
  buildTimeline,
  reactionKey,
  type ActivityRecord,
  type ReactionTarget,
} from '@/utils/activityTimeline';

const PEOPLE = {
  alex: { displayName: 'Alex Rivera', photoURL: '', pinnedGames: [] },
  mina: { displayName: 'Mina Chen', photoURL: '', pinnedGames: [] },
  sam: { displayName: 'Sam Okafor', photoURL: '', pinnedGames: [] },
  jules: { displayName: 'Jules Martin', photoURL: '', pinnedGames: [] },
} as const;
const games: (GameDoc & { id: string })[] = Array.from({ length: 10 }, (_, i) => ({
  id: `alex_timeline-${i}`,
  userId: 'alex',
  gameId: `timeline-${i}`,
  words: { en: 'apple', es: 'rubia', fr: 'merci' },
  difficulties: { en: 'basic', es: 'basic', fr: 'basic' },
  shuffledLanguages: ['en', 'es', 'fr'],
  guessHistory: ['crane', 'apple', 'rubia', 'merci'],
  isLiveGame: false,
  isWin: i < 8,
  score: 1240 - i * 35,
  scoringVersion: 3,
  startedAt: Timestamp.fromMillis(1792252800000),
  completedAt: Timestamp.fromMillis(1792253400000),
}));

const milestoneGame = (
  userId: string,
  id: string,
  activity: NonNullable<GameDoc['activity']>
): (typeof games)[number] => ({ ...games[0], userId, id, gameId: id, activity });
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
      createdAt: Timestamp.fromMillis(1792257000000),
    },
  },
  {
    type: 'game',
    game: milestoneGame('sam', 'sam-highlight', {
      feats: [{ id: 'dePrimeira', guess: 1, lang: 'pt' }],
      firstGame: false,
      personalBest: false,
      streak: null,
    }),
  },
  {
    type: 'game',
    game: milestoneGame('mina', 'mina-best', {
      feats: [],
      firstGame: false,
      personalBest: true,
      streak: null,
    }),
  },
  {
    type: 'game',
    game: {
      ...milestoneGame('alex', 'alex-streak', {
        feats: [],
        firstGame: false,
        personalBest: false,
        streak: 7,
      }),
      completedAt: Timestamp.fromMillis(1792167000000),
    },
  },
  {
    type: 'game',
    game: milestoneGame('jules', 'jules-first', {
      feats: [],
      firstGame: true,
      personalBest: false,
      streak: null,
    }),
  },
];
const LocalReactions = ({ target }: { target: ReactionTarget }) => {
  const [items, setItems] = useState<ActivityReaction[]>([
    { userId: 'fixture-friend', emoji: 'applause', targetKey: reactionKey(target) },
  ]);
  return (
    <ReactionBar
      reactions={items}
      userId="me"
      onToggle={(emoji, selected) =>
        setItems((old) => [
          ...old.filter((item) => !(item.userId === 'me' && item.emoji === emoji)),
          ...(selected ? [{ userId: 'me', emoji, targetKey: reactionKey(target) }] : []),
        ])
      }
    />
  );
};
const MixedFeedPreview = ({
  groupExpanded = false,
  gameExpanded = false,
}: {
  groupExpanded?: boolean;
  gameExpanded?: boolean;
}) => {
  const client = useQueryClient();
  useState(() => {
    client.setDefaultOptions({
      queries: {
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    });
    Object.entries(PEOPLE).forEach(([id, profile]) => {
      client.setQueryData(['userProfile', id], profile);
      client.setQueryData(['vocabulary', id], { en: {}, es: {}, fr: {}, pt: {}, it: {} });
    });
    records.forEach((record) => {
      if (record.type === 'game') {
        client.setQueryData(['playedGame', 'me', record.game.gameId], null);
      }
    });
  });
  return (
    <Container size={740} py={32}>
      <Stack gap="lg">
        <header>
          <Title order={1} size={30}>
            Activity feed
          </Title>
          <Text c="dimmed" mt={5}>
            Games, milestones, and moments worth sharing.
          </Text>
        </header>
        <ActivityTimeline
          entries={buildTimeline(records)}
          initiallyExpanded={gameExpanded ? 'details' : groupExpanded ? 'groups' : undefined}
          renderReactions={(target) => <LocalReactions target={target} />}
        />
        <Text size="xs" c="dimmed" ta="center">
          Storybook fixture data · reactions are local
        </Text>
      </Stack>
    </Container>
  );
};
const meta: Meta<typeof MixedFeedPreview> = {
  title: 'Social/Mixed activity',
  component: MixedFeedPreview,
  decorators: [
    (Story) => (
      <MockAuth>
        <Story />
      </MockAuth>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof MixedFeedPreview>;
export const Timeline: Story = {};
export const GamesExpanded: Story = { args: { groupExpanded: true } };
export const GameDetailsExpanded: Story = { args: { gameExpanded: true } };
