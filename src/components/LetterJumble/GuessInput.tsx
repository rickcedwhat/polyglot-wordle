import { FC, useEffect, useState } from 'react';
import { IconArrowsShuffle, IconPin, IconX } from '@tabler/icons-react';
import { ActionIcon, CloseButton, Group, Popover, Text } from '@mantine/core';
import type { LetterJumble } from '@/hooks/useLetterJumble';
import { CurrentGuessRow } from '../CurrentGuessRow/CurrentGuessRow';
import { JumbleRow } from './JumbleRow';
import classes from './GuessInput.module.css';

interface GuessInputProps {
  guess: string[];
  cursorIndex: number;
  isInvalid: boolean;
  onTileClick: (index: number) => void;
  jumble: LetterJumble;
}

const PIN_HINT_SEEN_KEY = 'polyglot_jumble_pin_hint_seen_v1';

/** Shown once: until the player pins a letter or dismisses the hint. */
function usePinHint(jumble: LetterJumble) {
  const [seen, setSeen] = useState(() => localStorage.getItem(PIN_HINT_SEEN_KEY) === '1');
  const hasLetter = jumble.slots.some((slot) => slot.letter);
  const hasPin = jumble.slots.some((slot) => slot.letter && slot.lock === 'pinned');

  const dismiss = () => {
    localStorage.setItem(PIN_HINT_SEEN_KEY, '1');
    setSeen(true);
  };

  useEffect(() => {
    if (hasPin && !seen) {
      localStorage.setItem(PIN_HINT_SEEN_KEY, '1');
      setSeen(true);
    }
  }, [hasPin, seen]);

  return { show: jumble.isOpen && hasLetter && !seen, dismiss };
}

/** The guess row flanked by Letter Jumble's controls: ✕ (while open) and 🔀. */
export const GuessInput: FC<GuessInputProps> = ({
  guess,
  cursorIndex,
  isInvalid,
  onTileClick,
  jumble,
}) => {
  const { isOpen } = jumble;
  const pinHint = usePinHint(jumble);

  const handleTileClick = (index: number) => {
    if (isOpen && index === cursorIndex) {
      jumble.togglePinAt(index);
    }
    onTileClick(index);
  };

  return (
    <div className={classes.input}>
      {isOpen ? (
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={jumble.close}
          aria-label="Leave Letter Jumble"
        >
          <IconX size={16} />
        </ActionIcon>
      ) : (
        <span />
      )}
      {isOpen ? (
        <Popover opened={pinHint.show} position="top" withArrow shadow="md" zIndex={150}>
          <Popover.Target>
            <div>
              <JumbleRow
                slots={jumble.slots}
                cursorIndex={cursorIndex}
                statuses={jumble.statuses}
                conflicts={jumble.conflicts}
                isInvalid={isInvalid}
                onTileClick={handleTileClick}
              />
            </div>
          </Popover.Target>
          <Popover.Dropdown py={6} px="sm">
            <Group gap={6} wrap="nowrap">
              <IconPin size={14} />
              <Text size="sm">Tap a letter twice to pin it in place</Text>
              <CloseButton size="sm" onClick={pinHint.dismiss} aria-label="Dismiss hint" />
            </Group>
          </Popover.Dropdown>
        </Popover>
      ) : (
        <CurrentGuessRow
          guess={guess}
          cursorIndex={cursorIndex}
          onTileClick={handleTileClick}
          isInvalid={isInvalid}
        />
      )}
      {jumble.enabled ? (
        <ActionIcon
          variant={isOpen ? 'filled' : 'subtle'}
          color={isOpen ? 'blue' : 'gray'}
          onClick={jumble.press}
          aria-label={isOpen ? 'Jumble letters' : 'Letter Jumble'}
        >
          <IconArrowsShuffle size={16} />
        </ActionIcon>
      ) : (
        <span />
      )}
    </div>
  );
};
