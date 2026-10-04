import type { Meta, StoryObj } from '@storybook/react';
import type { Language } from '@/types/firestore';
import { TurnDuel, type DuelPlayer } from './TurnDuel';

/** A real challenge: You finished in 6 for 1366; Thiery ran out of guesses at 17. */
const WORDS = { pt: 'menti', en: 'emery', es: 'rubia' };
const LANGUAGES: Language[] = ['pt', 'en', 'es'];
const PLAYERS: DuelPlayer[] = [
  {
    id: 'me',
    name: 'You',
    color: 'blue',
    guesses: ['prato', 'begun', 'slime', 'menti', 'emery', 'rubia'],
  },
  {
    id: 'thiery',
    name: 'Thiery',
    color: 'orange',
    guesses: ['water', 'hater', 'later', 'miner', 'menos', 'mente', 'menti', 'merge'],
  },
];

const meta: Meta<typeof TurnDuel> = {
  title: 'Replay/Head-to-head turns',
  component: TurnDuel,
  args: { words: WORDS, languages: LANGUAGES, players: PLAYERS, scoringVersion: 2 },
};

export default meta;
type Story = StoryObj<typeof TurnDuel>;

/** Opens on the final standings; Play runs every turn, Next turn plays one. */
export const YouVsThiery: Story = { name: 'You vs Thiery (1366 – 17)' };

export const Phone: Story = {
  name: 'You vs Thiery on a phone',
  parameters: { viewport: { defaultViewport: 'phone' } },
};
