import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box } from '@mantine/core';
import type { LetterJumble } from '@/hooks/useLetterJumble';
import { togglePin, type JumbleSlot } from '@/utils/letterJumble';
import { GuessInput } from './GuessInput';

function PinHintDemo() {
  const [slots, setSlots] = useState<JumbleSlot[]>(
    ['c', 'r', 'i', 's', 'p'].map((letter) => ({ letter, lock: 'kept' }))
  );
  const [cursorIndex, setCursorIndex] = useState(0);
  const jumble: LetterJumble = {
    enabled: true,
    isOpen: true,
    targetBoard: 0,
    slots,
    statuses: ['correct', 'present', 'unknown', 'correct', 'unknown'],
    conflicts: undefined,
    press: () => {},
    close: () => {},
    togglePinAt: (index) =>
      setSlots((prev) =>
        prev.map((slot, i) => (i === index ? { ...slot, lock: togglePin(slot.lock) } : slot))
      ),
  };
  return (
    <Box pt={80} maw={420} mx="auto">
      <GuessInput
        guess={slots.map((s) => s.letter)}
        cursorIndex={cursorIndex}
        isInvalid={false}
        onTileClick={setCursorIndex}
        jumble={jumble}
      />
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

/** The one-time hint (reset on every load). Pin a letter or press ✕ to see it go away. */
export const PinHint: StoryObj = {
  name: 'Pin hint (first time in jumble mode)',
  render: () => <PinHintDemo />,
};
