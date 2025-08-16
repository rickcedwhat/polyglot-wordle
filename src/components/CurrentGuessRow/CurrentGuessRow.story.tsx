import { useCallback, useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, Text } from '@mantine/core';
import { CurrentGuessRow } from './CurrentGuessRow';

const meta: Meta<typeof CurrentGuessRow> = {
  title: 'Game/CurrentGuessRow',
  component: CurrentGuessRow,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof CurrentGuessRow>;

// --- Static Stories ---

export const Empty: Story = {
  args: {
    guess: ['', '', '', '', ''],
    cursorIndex: 0,
  },
};

export const Full: Story = {
  args: {
    guess: ['w', 'o', 'r', 'l', 'd'],
    cursorIndex: 5,
  },
};

// --- New Interactive Story ---

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
    setTimeout(() => setIsInvalid(false), 600); // Duration matches CSS animation
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
    <Box>
      <CurrentGuessRow
        guess={guess}
        cursorIndex={cursorIndex}
        onTileClick={handleTileClick}
        isInvalid={isInvalid}
      />
      <Text size="xs" c="dimmed" mt="md">
        Use your keyboard (letters, backspace, arrow keys) to interact with the row.
      </Text>
      <Button onClick={triggerInvalidShake} variant="outline" size="xs" mt="sm">
        Trigger Invalid Shake
      </Button>
    </Box>
  );
};

export const Interactive: Story = {
  name: 'Interactive Guess Row',
  render: () => <InteractiveGuessRowHarness />,
};
