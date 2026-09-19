import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mantine/core';
import MiniBoard from './MiniBoard';

const meta: Meta<typeof MiniBoard> = {
  title: 'Game/MiniBoard',
  component: MiniBoard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <Box p="md">
        <Story />
      </Box>
    ),
  ],
  argTypes: {
    solutionWord: { control: 'text' },
    submittedGuesses: { control: 'object' },
  },
};

export default meta;
type Story = StoryObj<typeof MiniBoard>;

export const EarlyWin: Story = {
  name: 'Solved in 3 Turns',
  args: {
    solutionWord: 'apple',
    submittedGuesses: ['crane', 'pilot', 'apple'],
  },
};

export const InProgress: Story = {
  name: 'In Progress (2 Guesses)',
  args: {
    solutionWord: 'fruit',
    submittedGuesses: ['crane', 'audio'],
  },
};

export const LateWin: Story = {
  name: 'Solved on Turn 6',
  args: {
    solutionWord: 'lemon',
    submittedGuesses: ['crane', 'audio', 'pilot', 'flame', 'melon', 'lemon'],
  },
};

export const FailedMatch: Story = {
  name: 'Failed (6 Guesses, Not Solved)',
  args: {
    solutionWord: 'tiger',
    submittedGuesses: ['crane', 'audio', 'pilot', 'flame', 'melon', 'ghost'],
  },
};

export const Empty: Story = {
  name: 'Empty Board',
  args: {
    solutionWord: 'apple',
    submittedGuesses: [],
  },
};
