import { FC, useState } from 'react';
import { IconArrowsShuffle, IconEraser, IconX } from '@tabler/icons-react';
import { ActionIcon, Anchor, CloseButton, Group, Popover, Text } from '@mantine/core';
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
  /** Opens Letter Jumble help; without it the first-time note is never shown. */
  onJumbleHelp?: () => void;
  /** Empties the guess; its button shows while Letter Jumble is closed and the guess has letters. */
  onClear?: () => void;
}

const INTRO_SEEN_KEY = 'polyglot_jumble_intro_seen_v1';

/** Shown the first time Letter Jumble opens, until dismissed or followed. */
function useJumbleIntro(isOpen: boolean, enabled: boolean) {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(INTRO_SEEN_KEY) === '1';
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    setSeen(true);
    try {
      localStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      // Keep the hint dismissed for this session when storage is unavailable.
    }
  };

  return { show: enabled && isOpen && !seen, dismiss };
}

/** The guess row flanked by ✕ (leave Letter Jumble) or clear on the left, and 🔀 on the right. */
export const GuessInput: FC<GuessInputProps> = ({
  guess,
  cursorIndex,
  isInvalid,
  onTileClick,
  jumble,
  onJumbleHelp,
  onClear,
}) => {
  const { isOpen } = jumble;
  const intro = useJumbleIntro(isOpen, !!onJumbleHelp);

  const openHelp = () => {
    intro.dismiss();
    onJumbleHelp?.();
  };

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
      ) : onClear && guess.some(Boolean) ? (
        <ActionIcon variant="subtle" color="gray" onClick={onClear} aria-label="Clear guess">
          <IconEraser size={16} />
        </ActionIcon>
      ) : (
        <span />
      )}
      {isOpen ? (
        <Popover opened={intro.show} position="top" withArrow shadow="md" zIndex={150}>
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
          <Popover.Dropdown py={6} px="sm" maw="min(22rem, calc(100vw - 2rem))">
            <Group gap={6} wrap="nowrap" align="flex-start">
              <Text size="sm">
                Letter Jumble rearranges letters you already know.{' '}
                <Anchor component="button" type="button" size="sm" onClick={openHelp}>
                  How it works
                </Anchor>
              </Text>
              <CloseButton size="sm" onClick={intro.dismiss} aria-label="Dismiss hint" />
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
