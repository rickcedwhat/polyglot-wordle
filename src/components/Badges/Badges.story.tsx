import type { Meta, StoryObj } from '@storybook/react';
import { IconSwords } from '@tabler/icons-react';
import { Button, Group, Stack } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

import '@mantine/notifications/styles.css';

import { FEAT_ORDER, TRACKS } from '@/achievements/config';
import i18n from '@/i18n';
import { promptFlagMissingWord } from '@/components/Game/promptFlagMissingWord';
import { showToast } from '@/utils/toast';
import { FeatMedal, TrackBadge } from './Badges';
import { EarnedThisGame, GameBadgeRow } from './GameAchievements';
import { notifyFeat } from './notifyFeat';

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

export const Toasts: Story = {
  render: () => (
    <Stack p="md" align="flex-start">
      <Notifications />
      <Button
        onClick={() => {
          notifyFeat({ id: 'outOfNowhere', guess: 5, lang: 'fr', value: 1 });
          notifyFeat({ id: 'jackpot', guess: 5, value: 9 });
          showToast({
            icon: <IconSwords size={18} />,
            message: i18n.t('challenges.toastWon', { name: 'Alex', mine: 1503, theirs: 1240 }),
            color: 'blue',
          });
        }}
      >
        Fire toasts
      </Button>
      <Button variant="light" onClick={() => promptFlagMissingWord('treco', ['pt', 'en', 'es'])}>
        Flag missing word prompt
      </Button>
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
