import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mantine/core';
import { getAchievements, type AchievementInputs } from '@/utils/achievements';
import { AchievementGrid } from './AchievementsTab';

const AchievementsPreview = (inputs: AchievementInputs) => (
  <AchievementGrid achievements={getAchievements(inputs)} />
);

const meta: Meta<typeof AchievementsPreview> = {
  title: 'Profile/Achievements',
  component: AchievementsPreview,
  decorators: [
    (Story) => (
      <Box p="md" maw={960}>
        <Story />
      </Box>
    ),
  ],
  argTypes: {
    wordCounts: { control: 'object' },
    definitionsRead: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof AchievementsPreview>;

export const NewPlayer: Story = {
  args: { wordCounts: {}, definitionsRead: 0 },
};

export const Regular: Story = {
  args: { wordCounts: { en: 180, es: 90, fr: 40, it: 12, pt: 3 }, definitionsRead: 64 },
};

export const Maxed: Story = {
  args: {
    wordCounts: { en: 1300, es: 1250, fr: 1400, it: 1210, pt: 1500 },
    definitionsRead: 800,
  },
};
