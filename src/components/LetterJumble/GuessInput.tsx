import { FC, useState } from 'react';
import { IconArrowsShuffle, IconX } from '@tabler/icons-react';
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
}

const INTRO_SEEN_KEY = 'polyglot_jumble_intro_seen_v1';

/** Shown the first time Letter Jumble opens, until dismissed or followed. */
function useJumbleIntro(isOpen: boolean, enabled: boolean) {
  const [seen, setSeen] = useState(() => localStorage.getItem(INTRO_SEEN_KEY) === '1');

  const dismiss = () => {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
    setSeen(true);
  };

  return { show: enabled && isOpen && !seen, dismiss };
}

/** The guess row flanked by Letter Jumble's controls: ✕ (while open) and 🔀. */
export const GuessInput: FC<GuessInputProps> = ({
  guess,
  cursorIndex,
  isInvalid,
  onTileClick,
  jumble,
  onJumbleHelp,
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
          <Popover.Dropdown py={6} px="sm">
            <Group gap={6} wrap="nowrap">
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
