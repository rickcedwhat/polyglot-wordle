import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Text } from '@mantine/core';
import { useLetterJumble } from '@/hooks/useLetterJumble';
import type { Language } from '@/types/firestore';
import { GuessInput } from './GuessInput';

const SHUFFLED: Language[] = ['en', 'es', 'fr'];
const SOLUTION = { en: 'crisp', es: 'nieve', fr: 'stylo' };
/** Against CRISP: C and S green, R yellow. */
const GUESSES = ['route', 'caser', 'valse'];

function GuessInputDemo() {
  const [currentGuess, setCurrentGuess] = useState(['', '', '', '', '']);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [isInvalid, setIsInvalid] = useState(false);
  const jumble = useLetterJumble({
    guesses: GUESSES,
    solution: SOLUTION,
    shuffledLanguages: SHUFFLED,
    preferredBoard: 0,
    currentGuess,
    setCurrentGuess,
    onNoArrangement: () => {
      setIsInvalid(true);
      setTimeout(() => setIsInvalid(false), 500);
    },
    enabled: true,
  });
  return (
    <Box pt={80} maw={420} mx="auto">
      <GuessInput
        guess={currentGuess}
        cursorIndex={cursorIndex}
        isInvalid={isInvalid}
        onTileClick={setCursorIndex}
        jumble={jumble}
      />
      <Text size="xs" c="dimmed" ta="center">
        Target: CRISP after ROUTE, CASER, VALSE (C and S green, R yellow)
      </Text>
    </Box>
  );
}

const meta: Meta = {
  title: 'Game/Letter Jumble',
  decorators: [
    (Story) => {
      localStorage.removeItem('polyglot_jumble_pin_hint_seen_v1');
      return <Story />;
    },
  ],
};

export default meta;

/**
 * Starts in normal play. 🔀 (or Space) opens jumble mode, then jumbles. The one-time pin hint
 * appears once the row has letters; it resets on every load.
 */
export const PinHint: StoryObj = {
  name: 'Jumble button and pin hint',
  render: () => <GuessInputDemo />,
};
