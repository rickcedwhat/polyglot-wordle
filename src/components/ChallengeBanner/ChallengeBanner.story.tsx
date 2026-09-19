import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mantine/core';
import type { GameDoc } from '@/types/firestore';
import { ChallengeBanner } from './ChallengeBanner';

const meta: Meta<typeof ChallengeBanner> = {
  title: 'Social/ChallengeBanner',
  component: ChallengeBanner,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <Box maw={640} mx="auto" pt="md">
        <Story />
      </Box>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChallengeBanner>;

const baseGame: GameDoc = {
  userId: 'user-123',
  gameId: 'game-456',
  words: {
    en: 'apple',
    es: 'audio',
    fr: 'fruit',
  },
  difficulties: {
    en: 'basic',
    es: 'basic',
    fr: 'basic',
  },
  shuffledLanguages: ['en', 'es', 'fr'],
  isLiveGame: false,
  score: 850,
  guessHistory: ['crane', 'audio', 'pilot', 'apple'],
  isWin: true,
  startedAt: { seconds: 1726700000, nanoseconds: 0 } as any,
  completedAt: { seconds: 1726700500, nanoseconds: 0 } as any,
};

export const WithAvatar: Story = {
  args: {
    challengerUser: {
      displayName: 'Elena Rostova',
      photoURL:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    },
    challengerGame: baseGame,
  },
};

export const NoAvatar: Story = {
  args: {
    challengerUser: {
      displayName: 'Alex Chen',
    },
    challengerGame: {
      ...baseGame,
      score: 620,
      guessHistory: ['table', 'chair', 'grape', 'lemon', 'flame', 'apple'],
    },
  },
};

export const AnonymousFriend: Story = {
  name: 'Anonymous Friend (No Profile)',
  args: {
    challengerUser: null,
    challengerGame: {
      ...baseGame,
      score: 710,
      guessHistory: ['stand', 'point', 'react', 'apple'],
    },
  },
};

export const PerfectMatch: Story = {
  name: 'High Score / 3 Turns',
  args: {
    challengerUser: {
      displayName: 'WordMaster99',
    },
    challengerGame: {
      ...baseGame,
      score: 1250,
      guessHistory: ['apple', 'audio', 'fruit'],
    },
  },
};
