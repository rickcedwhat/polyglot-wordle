import { useCallback, useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, Group, Stack, Text } from '@mantine/core';
import { CurrentGuessRow } from './CurrentGuessRow';

interface StoryArgs {
  word: string;
  cursorIndex: number;
  isInvalid: boolean;
}

const meta: Meta<StoryArgs> = {
  title: 'Game/CurrentGuessRow',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <Box
        p="xl"
        style={{
          minWidth: 360,
          minHeight: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Story />
      </Box>
    ),
  ],
  argTypes: {
    word: {
      control: { type: 'text' },
      description:
        'The current 5-letter guess word. Type up to 5 letters here to populate the row.',
    },
    cursorIndex: {
      control: { type: 'range', min: 0, max: 5, step: 1 },
      description: 'Active cursor position (0 = first tile, 5 = after all tiles).',
    },
    isInvalid: {
      control: { type: 'boolean' },
      description: 'Triggers the shake error animation when word is not in dictionary or invalid.',
    },
  },
  args: {
    word: 'HELLO',
    cursorIndex: 5,
    isInvalid: false,
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

const parseWordToGuess = (word: string = 'HELLO'): string[] => {
  const letters = (word || 'HELLO')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
    .slice(0, 5)
    .split('');
  return Array.from({ length: 5 }, (_, i) => letters[i] || '');
};

export const ControlsPlayground: Story = {
  name: 'Controls Playground',
  render: ({ word = 'HELLO', cursorIndex = 5, isInvalid = false }) => {
    const guess = parseWordToGuess(word);
    return (
      <CurrentGuessRow
        guess={guess}
        cursorIndex={cursorIndex}
        isInvalid={isInvalid}
        onTileClick={() => {}}
      />
    );
  },
  args: {
    word: 'HELLO',
    cursorIndex: 5,
    isInvalid: false,
  },
};

export const Empty: Story = {
  name: 'Empty Row (Ready to Type)',
  render: () => (
    <CurrentGuessRow guess={['', '', '', '', '']} cursorIndex={0} onTileClick={() => {}} />
  ),
};

export const PartiallyFilled: Story = {
  name: 'Partially Filled (2 Letters)',
  render: () => (
    <CurrentGuessRow guess={['w', 'o', '', '', '']} cursorIndex={2} onTileClick={() => {}} />
  ),
};

export const InvalidShake: Story = {
  name: 'Invalid Word Shake',
  render: () => (
    <CurrentGuessRow
      guess={['x', 'y', 'z', 'q', 'w']}
      cursorIndex={5}
      isInvalid
      onTileClick={() => {}}
    />
  ),
};

// --- Interactive Keyboard Harness ---

const InteractiveGuessRowHarness = () => {
  const [guess, setGuess] = useState<string[]>(Array(5).fill(''));
  const [cursorIndex, setCursorIndex] = useState(0);
  const [isInvalid, setIsInvalid] = useState(false);

  const handleTileClick = (index: number) => {
    setCursorIndex(index);
  };

  const handleKeyPress = useCallback(
    (key: string) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'backspace') {
        const newGuess = [...guess];
        const newCursorIndex = Math.max(0, cursorIndex - 1);
        newGuess[newCursorIndex] = '';
        setGuess(newGuess);
        setCursorIndex(newCursorIndex);
      } else if (cursorIndex < 5 && /^[a-z]$/.test(lowerKey)) {
        const newGuess = [...guess];
        newGuess[cursorIndex] = lowerKey;
        setGuess(newGuess);
        setCursorIndex(Math.min(5, cursorIndex + 1));
      }
    },
    [guess, cursorIndex]
  );

  const triggerInvalidShake = () => {
    setIsInvalid(true);
    setTimeout(() => setIsInvalid(false), 600);
  };

  const handleClear = () => {
    setGuess(Array(5).fill(''));
    setCursorIndex(0);
    setIsInvalid(false);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;
      if (event.key === 'ArrowLeft') {
        setCursorIndex((prev) => Math.max(0, prev - 1));
      } else if (event.key === 'ArrowRight') {
        setCursorIndex((prev) => Math.min(5, prev + 1));
      } else if (key === 'Backspace') {
        handleKeyPress('backspace');
      } else if (key.length === 1 && key.match(/[a-z]/i)) {
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  return (
    <Stack align="center" gap="md" w="100%" maw={380}>
      <CurrentGuessRow
        guess={guess}
        cursorIndex={cursorIndex}
        onTileClick={handleTileClick}
        isInvalid={isInvalid}
      />
      <Text size="xs" c="dimmed" ta="center">
        Click any tile to position cursor, or type with your keyboard (A-Z, Backspace, Left/Right
        arrows).
      </Text>
      <Group justify="center" gap="xs">
        <Button onClick={triggerInvalidShake} variant="outline" color="red" size="xs">
          Trigger Shake Error
        </Button>
        <Button onClick={handleClear} variant="subtle" size="xs">
          Clear Row
        </Button>
      </Group>
    </Stack>
  );
};

export const Interactive: Story = {
  name: 'Interactive Playground (Keyboard & Click)',
  render: () => <InteractiveGuessRowHarness />,
};
