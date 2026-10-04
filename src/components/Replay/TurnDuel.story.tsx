import type { Meta, StoryObj } from '@storybook/react';
import { DUEL_LANGUAGES, DUEL_PLAYERS, DUEL_WORDS } from '@/storybook/duelFixture';
import { TurnDuel } from './TurnDuel';

const meta: Meta<typeof TurnDuel> = {
  title: 'Replay/Head-to-head turns',
  component: TurnDuel,
  args: { words: DUEL_WORDS, languages: DUEL_LANGUAGES, players: DUEL_PLAYERS, scoringVersion: 2 },
};

export default meta;
type Story = StoryObj<typeof TurnDuel>;

/** Opens before turn 1; Play runs every turn, Next turn plays one. */
export const YouVsThiery: Story = { name: 'You vs Thiery (1366 – 17)' };

export const Phone: Story = {
  name: 'You vs Thiery on a phone',
  parameters: { viewport: { defaultViewport: 'phone' } },
};
