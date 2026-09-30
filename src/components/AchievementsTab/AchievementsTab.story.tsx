import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mantine/core';
import { getAchievements } from '@/utils/achievements';
import { FeatGrid, TrackGrid } from './AchievementsTab';

const meta: Meta = {
  title: 'Profile/Achievements',
  decorators: [
    (Story) => (
      <Box p="md" maw={960}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;
type Story = StoryObj;

export const FeatsNewPlayer: Story = {
  render: () => <FeatGrid counts={{}} />,
};

export const FeatsRegular: Story = {
  render: () => (
    <FeatGrid
      counts={{
        outOfNowhere: 2,
        jackpot: 1,
        minimalist: 2,
        speedrun: 5,
        underdog: 3,
        dud: 1,
        soClose: 9,
      }}
    />
  ),
};

export const TracksNewPlayer: Story = {
  render: () => (
    <TrackGrid
      achievements={getAchievements({
        wordCounts: {},
        definitionsRead: 0,
        definitionsReadByLang: {},
        maxStreak: 0,
        gamesPlayed: 0,
        friends: 0,
        challengeWins: 0,
      })}
    />
  ),
};

export const TracksRegular: Story = {
  render: () => (
    <TrackGrid
      achievements={getAchievements({
        wordCounts: { en: 702, es: 180, fr: 90, it: 12, pt: 3 },
        definitionsRead: 64,
        definitionsReadByLang: { en: 30, es: 20, fr: 14 },
        maxStreak: 9,
        gamesPlayed: 82,
        friends: 2,
        challengeWins: 4,
      })}
    />
  ),
};

export const TracksMaxed: Story = {
  render: () => (
    <TrackGrid
      achievements={getAchievements({
        wordCounts: { en: 1300, es: 1250, fr: 1400, it: 1210, pt: 1500 },
        definitionsRead: 800,
        definitionsReadByLang: { en: 200, es: 200, fr: 200, it: 100, pt: 100 },
        maxStreak: 40,
        gamesPlayed: 600,
        friends: 12,
        challengeWins: 60,
      })}
    />
  ),
};
