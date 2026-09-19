import type { Meta, StoryObj } from '@storybook/react';
import { Box, Group, Stack, Text } from '@mantine/core';
import type { LetterStatus } from '@/utils/wordUtils';
import { LetterTile } from './LetterTile';

const meta: Meta<typeof LetterTile> = {
  title: 'Game/LetterTile',
  component: LetterTile,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <Box p="xl">
        <Box style={{ width: 64, height: 64, containerType: 'inline-size' }}>
          <Story />
        </Box>
      </Box>
    ),
  ],
  argTypes: {
    letter: {
      control: { type: 'text' },
      description: 'The letter displayed inside the tile.',
    },
    status: {
      control: { type: 'select' },
      options: ['unknown', 'correct', 'present', 'absent'] satisfies LetterStatus[],
      description:
        'Wordle status determining tile color: correct (green), present (yellow), absent (gray), unknown (neutral).',
    },
    hasCursor: {
      control: { type: 'boolean' },
      description: 'Whether this tile is currently selected/active with cursor highlight.',
    },
    isEmpty: {
      control: { type: 'boolean' },
      description:
        'Whether tile is in the active guessing row (transparent background with dark border).',
    },
    onClick: {
      action: 'clicked',
      table: { disable: true },
    },
  },
};

export default meta;
type Story = StoryObj<typeof LetterTile>;

export const Playground: Story = {
  args: {
    letter: 'A',
    status: 'correct',
    hasCursor: false,
    isEmpty: false,
  },
};

export const DefaultUnknown: Story = {
  name: 'Default (Unknown)',
  args: {
    letter: '',
    status: 'unknown',
    hasCursor: false,
    isEmpty: true,
  },
};

export const Correct: Story = {
  name: 'Correct (Green)',
  args: {
    letter: 'A',
    status: 'correct',
    hasCursor: false,
    isEmpty: false,
  },
};

export const Present: Story = {
  name: 'Present (Yellow)',
  args: {
    letter: 'P',
    status: 'present',
    hasCursor: false,
    isEmpty: false,
  },
};

export const Absent: Story = {
  name: 'Absent (Gray)',
  args: {
    letter: 'L',
    status: 'absent',
    hasCursor: false,
    isEmpty: false,
  },
};

export const ActiveWithCursor: Story = {
  name: 'Active with Cursor',
  args: {
    letter: 'E',
    status: 'unknown',
    hasCursor: true,
    isEmpty: true,
  },
};

export const StatesGallery: Story = {
  name: 'All States Gallery',
  decorators: [
    () => {
      const states: Array<{
        label: string;
        letter: string;
        status: LetterStatus;
        hasCursor?: boolean;
        isEmpty?: boolean;
      }> = [
        { label: 'Unknown / Empty', letter: '', status: 'unknown', isEmpty: true },
        { label: 'Active Cursor', letter: 'W', status: 'unknown', hasCursor: true, isEmpty: true },
        { label: 'Correct (Green)', letter: 'C', status: 'correct', isEmpty: false },
        { label: 'Present (Yellow)', letter: 'Y', status: 'present', isEmpty: false },
        { label: 'Absent (Gray)', letter: 'X', status: 'absent', isEmpty: false },
      ];

      return (
        <Group gap="lg" wrap="wrap" justify="center" p="md">
          {states.map((s) => (
            <Stack key={s.label} align="center" gap={6}>
              <Box style={{ width: 64, height: 64, containerType: 'inline-size' }}>
                <LetterTile
                  letter={s.letter}
                  status={s.status}
                  hasCursor={s.hasCursor}
                  isEmpty={s.isEmpty}
                />
              </Box>
              <Text size="xs" c="dimmed">
                {s.label}
              </Text>
            </Stack>
          ))}
        </Group>
      );
    },
  ],
};
