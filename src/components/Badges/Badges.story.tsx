import type { Meta, StoryObj } from '@storybook/react';
import { Group, Stack } from '@mantine/core';
import { FEAT_ORDER, TRACKS } from '@/achievements/config';
import { FeatMedal, TrackBadge } from './Badges';
import { EarnedThisGame, GameBadgeRow } from './GameAchievements';

const meta: Meta = { title: 'Badges' };

export default meta;
type Story = StoryObj;

export const Medals: Story = {
  render: () => (
    <Stack p="md">
      <Group>
        {FEAT_ORDER.map((id) => (
          <FeatMedal key={id} id={id} />
        ))}
      </Group>
      <Group>
        {FEAT_ORDER.map((id) => (
          <FeatMedal key={id} id={id} count={0} />
        ))}
      </Group>
    </Stack>
  ),
};

export const TrackLevels: Story = {
  render: () => (
    <Group p="md">
      {[-1, 0, 1, 2, 3].map((level) => (
        <TrackBadge key={level} track={TRACKS.reader} level={level} />
      ))}
    </Group>
  ),
};

const sample = {
  feats: [
    { id: 'outOfNowhere' as const, guess: 5, lang: 'fr' as const, value: 1 },
    { id: 'jackpot' as const, guess: 2, value: 9 },
    { id: 'speedrun' as const, guess: 5 },
  ],
  levelUps: [{ lang: 'es' as const, level: 2 }],
};

export const PostGame: Story = {
  render: () => (
    <Stack p="md" maw={480}>
      <EarnedThisGame {...sample} />
    </Stack>
  ),
};

export const HistoryRow: Story = {
  render: () => (
    <Stack p="md">
      <GameBadgeRow {...sample} />
    </Stack>
  ),
};
