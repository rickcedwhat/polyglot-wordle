import { FC } from 'react';
import { IconArrowsShuffle, IconX } from '@tabler/icons-react';
import { ActionIcon } from '@mantine/core';
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

/** The guess row flanked by Letter Jumble's controls: ✕ (while open) and 🔀. */
export const GuessInput: FC<GuessInputProps> = ({
  guess,
  cursorIndex,
  isInvalid,
  onTileClick,
  jumble,
}) => {
  const { isOpen } = jumble;

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
        <JumbleRow
          slots={jumble.slots}
          cursorIndex={cursorIndex}
          statuses={jumble.statuses}
          conflicts={jumble.conflicts}
          isInvalid={isInvalid}
          onTileClick={handleTileClick}
        />
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
