import type { Meta, StoryObj } from '@storybook/react';
import { LetterTile } from './LetterTile';

const meta: Meta<typeof LetterTile> = {
  title: 'Game/LetterTile',
  component: LetterTile,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  // Add argTypes to configure the controls
  argTypes: {
    status: {
      control: { type: 'select' }, // Use a dropdown selector for the status
      options: ['empty', 'correct', 'present', 'absent'], // Provide the dropdown options
    },
    letter: {
      control: { type: 'text' }, // A standard text input for the letter
    },
    hasCursor: {
      control: { type: 'boolean' }, // A toggle switch for the cursor
    },
  },
};

export default meta;
type Story = StoryObj<typeof LetterTile>;

export const Empty: Story = { args: { letter: '', status: 'unknown' } };
export const Correct: Story = { args: { letter: 'A', status: 'correct' } };
export const Present: Story = { args: { letter: 'P', status: 'present' } };
export const Absent: Story = { args: { letter: 'L', status: 'absent' } };
