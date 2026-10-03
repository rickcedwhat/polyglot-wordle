import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { IconArrowsShuffle, IconX } from '@tabler/icons-react';
import { ActionIcon, Box, Group, Stack, Text } from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import {
  boardKnowledge,
  conflictingSlots,
  createJumbler,
  nextLock,
  relock,
  targetStatuses,
  validArrangements,
  type JumbleLock,
  type JumbleSlot,
} from '@/utils/letterJumble';
import { getGuessStatuses, type LetterStatus } from '@/utils/wordUtils';
import { AlphabetKey } from '../AlphabetKey/AlphabetKey';
import { LetterTile } from '../LetterTile/LetterTile';
import { JumbleRow } from './JumbleRow';

/** The board from the French game you were stuck on: yellows O(2) T(4) S(3) L(3) S(4). */
const GUESSES = ['route', 'caser', 'valse'];
const SOLUTIONS = ['crisp', 'nieve', 'stylo'];
const KEY_ROWS = [
  'qwertyuiop'.split(''),
  [...'asdfghjkl'.split(''), 'enter'],
  [...'zxcvbnm'.split(''), 'del'],
];
const KEY_LABELS: Record<string, string> = { enter: '⏎', del: '←' };
const RANK: Record<LetterStatus, number> = { unknown: 0, absent: 1, present: 2, correct: 3 };

type LockGesture = 'tap-again' | 'long-press';

interface HarnessProps {
  word: string;
  locks: JumbleLock[];
  target: number | null;
  lockGesture: LockGesture;
  startInJumbleMode: boolean;
  width: number;
}

const toSlots = (word: string, locks: JumbleLock[]): JumbleSlot[] =>
  Array.from({ length: 5 }, (_, i) => {
    const letter = (word[i] ?? '').replace(/[^a-z]/, '');
    return { letter, lock: letter ? (locks[i] ?? 'free') : 'free' };
  });

const keyStatuses = (letter: string): LetterStatus[] =>
  SOLUTIONS.map((solution) =>
    GUESSES.reduce<LetterStatus>((best, guess) => {
      const statuses = getGuessStatuses(guess, solution);
      return guess.split('').reduce<LetterStatus>((acc, l, i) => {
        return l === letter && RANK[statuses[i]] > RANK[acc] ? statuses[i] : acc;
      }, best);
    }, 'unknown')
  );

function MockBoard({
  solution,
  index,
  isTarget,
  onSelect,
}: {
  solution: string;
  index: number;
  isTarget: boolean;
  onSelect: () => void;
}) {
  return (
    <Stack
      gap={4}
      p={6}
      onClick={onSelect}
      style={{
        cursor: 'pointer',
        borderRadius: 8,
        outline: isTarget ? '2px solid var(--mantine-color-orange-5)' : '1px solid transparent',
      }}
    >
      <Text size="xs" ta="center" c={isTarget ? 'orange' : 'dimmed'} fw={isTarget ? 700 : 400}>
        {isTarget ? '🎯 Target' : `Board ${index + 1}`}
      </Text>
      {Array.from({ length: MAX_GUESSES }, (_, row) => {
        const guess = GUESSES[row];
        const statuses = guess ? getGuessStatuses(guess, solution) : [];
        return (
          <Box
            key={row}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 21px)', gap: 2 }}
          >
            {Array.from({ length: 5 }, (__, col) => (
              <Box key={col} style={{ containerType: 'inline-size', fontSize: 10 }}>
                <LetterTile letter={guess?.[col] ?? ''} status={statuses[col] ?? 'unknown'} />
              </Box>
            ))}
          </Box>
        );
      })}
    </Stack>
  );
}

function LetterJumbleHarness({
  word,
  locks,
  target: initialTarget,
  lockGesture,
  startInJumbleMode,
  width,
}: HarnessProps) {
  const [slots, setSlots] = useState(() => toSlots(word, locks));
  const [cursorIndex, setCursorIndex] = useState(() => Math.min(word.length, 4));
  const [target, setTarget] = useState(initialTarget);
  const [jumbleMode, setJumbleMode] = useState(startInJumbleMode);
  const [isInvalid, setIsInvalid] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const jumbler = useRef(createJumbler());

  useEffect(() => {
    setSlots(toSlots(word, locks));
    setTarget(initialTarget);
    setJumbleMode(startInJumbleMode);
  }, [word, locks, initialTarget, startInJumbleMode]);

  const knowledge = useMemo(
    () => (target === null ? undefined : boardKnowledge(GUESSES, SOLUTIONS[target])),
    [target]
  );
  const conflicts = jumbleMode ? conflictingSlots(slots, knowledge) : undefined;
  const visibleSlots = jumbleMode ? slots : slots.map((s) => ({ ...s, lock: 'free' as const }));
  const arrangements = validArrangements(slots, knowledge);
  const openSlots = arrangements[0]?.filter((l) => !l).length ?? 0;

  const shake = () => {
    setIsInvalid(true);
    setTimeout(() => setIsInvalid(false), 500);
  };

  const cycleLock = (index: number) => {
    if (!slots[index].letter) {
      return;
    }
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, lock: nextLock(s.lock) } : s)));
  };

  const jumble = useCallback(() => {
    const result = jumbler.current(slots, knowledge);
    if (!result) {
      shake();
      return;
    }
    setSlots(relock(slots, result));
  }, [slots, knowledge]);

  const pressKey = useCallback(
    (key: string) => {
      setActiveKey(null);
      setTimeout(() => setActiveKey(key), 0);
      if (key === 'enter') {
        setJumbleMode(false);
      } else if (key === 'del') {
        const index = slots[cursorIndex]?.letter ? cursorIndex : Math.max(0, cursorIndex - 1);
        setSlots((prev) => prev.map((s, i) => (i === index ? { letter: '', lock: 'free' } : s)));
        setCursorIndex(index);
      } else if (/^[a-z]$/.test(key) && cursorIndex < 5) {
        setSlots((prev) =>
          prev.map((s, i) => (i === cursorIndex ? { letter: key, lock: 'free' } : s))
        );
        setCursorIndex((i) => Math.min(4, i + 1));
      }
    },
    [cursorIndex, slots]
  );

  const onJumbleButton = useCallback(() => {
    if (jumbleMode) {
      jumble();
    } else {
      setJumbleMode(true);
    }
  }, [jumble, jumbleMode]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault();
        onJumbleButton();
      } else if (event.key === 'Escape') {
        setJumbleMode(false);
      } else if (event.key === 'Enter') {
        pressKey('enter');
      } else if (event.key === 'Backspace') {
        pressKey('del');
      } else if (event.key === 'ArrowLeft') {
        setCursorIndex((i) => Math.max(0, i - 1));
      } else if (event.key === 'ArrowRight') {
        setCursorIndex((i) => Math.min(4, i + 1));
      } else if (/^[a-z]$/i.test(event.key)) {
        pressKey(event.key.toLowerCase());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onJumbleButton, pressKey]);

  const onTileClick = (index: number) => {
    if (jumbleMode && lockGesture === 'tap-again' && index === cursorIndex) {
      cycleLock(index);
    }
    setCursorIndex(index);
  };

  const hint = !arrangements.length
    ? 'Nothing fits these locks on the target.'
    : openSlots === 1 && arrangements.length === 1
      ? 'One open slot: 🔀 steps through the keyboard (QWERTY order).'
      : `${arrangements.length} ordering${arrangements.length === 1 ? '' : 's'} of the known and locked letters fit${
          openSlots ? `, plus ${openSlots} random fill${openSlots === 1 ? '' : 's'}` : ''
        }.`;

  return (
    <Stack gap="md" w={width} mx="auto" p="sm">
      <Group justify="center" gap={4} wrap="nowrap">
        {SOLUTIONS.map((solution, i) => (
          <MockBoard
            key={solution}
            solution={solution}
            index={i}
            isTarget={jumbleMode && target === i}
            onSelect={() => setTarget((t) => (t === i && jumbleMode ? null : i))}
          />
        ))}
      </Group>

      <Box
        style={{
          display: 'grid',
          gridTemplateColumns: '28px minmax(0, 320px) 28px',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {jumbleMode ? (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="md"
            onClick={() => setJumbleMode(false)}
            aria-label="Leave jumble mode"
          >
            <IconX size={16} />
          </ActionIcon>
        ) : (
          <span />
        )}
        <JumbleRow
          slots={visibleSlots}
          cursorIndex={cursorIndex}
          statuses={jumbleMode ? targetStatuses(slots, knowledge) : undefined}
          conflicts={conflicts}
          isInvalid={isInvalid}
          onTileClick={onTileClick}
          onTileLongPress={jumbleMode && lockGesture === 'long-press' ? cycleLock : undefined}
        />
        <ActionIcon
          variant={jumbleMode ? 'filled' : 'subtle'}
          color={jumbleMode ? 'blue' : 'gray'}
          size="md"
          onClick={onJumbleButton}
          aria-label={jumbleMode ? 'Jumble letters' : 'Jumble mode'}
        >
          <IconArrowsShuffle size={16} />
        </ActionIcon>
      </Box>

      {jumbleMode && (
        <Text size="xs" c="dimmed" ta="center">
          {hint}
          {conflicts?.some(Boolean) && ' Red = locked letter already grey on the target.'}
        </Text>
      )}

      <Stack gap={8}>
        {KEY_ROWS.map((row) => (
          <Group key={row[0]} gap="1.5%" wrap="nowrap">
            {row.map((key) => (
              <Box key={key} style={{ flex: key.length > 1 ? 1.5 : 1 }}>
                <AlphabetKey
                  letter={KEY_LABELS[key] ?? key}
                  statuses={key.length === 1 ? keyStatuses(key) : undefined}
                  activeKey={activeKey === key ? (KEY_LABELS[key] ?? key) : null}
                  onClick={() => pressKey(key)}
                />
              </Box>
            ))}
          </Group>
        ))}
      </Stack>

      <Text size="xs" c="dimmed">
        {jumbleMode
          ? `${
              lockGesture === 'tap-again'
                ? 'Tap a tile, then tap it again to cycle 🔓 → 🔒 letter → 📌 spot.'
                : 'Long-press a tile to cycle 🔓 → 🔒 letter → 📌 spot.'
            } Tap a board to target it. 🔀 (or Space) jumbles; ✕, Esc or ⏎ leaves.`
          : 'Normal play. Tap 🔀 (or Space) to enter jumble mode.'}
      </Text>
    </Stack>
  );
}

const meta: Meta<HarnessProps> = {
  title: 'Mockups/Letter Jumble',
  render: (args) => <LetterJumbleHarness {...args} />,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    lockGesture: { control: 'inline-radio', options: ['tap-again', 'long-press'] },
    target: { control: 'select', options: [null, 0, 1, 2] },
    width: { control: 'inline-radio', options: [320, 375, 430] },
  },
  args: {
    word: 'tlohs',
    locks: ['letter', 'letter', 'letter', 'letter', 'letter'],
    target: 2,
    lockGesture: 'tap-again',
    startInJumbleMode: true,
    width: 375,
  },
};

export default meta;
type Story = StoryObj<HarnessProps>;

export const NormalPlay: Story = {
  name: 'Normal play (jumble button only)',
  args: { startInJumbleMode: false },
};

export const StuckOnFrench: Story = {
  name: 'Jumble mode: TLOHS, letters locked',
};

export const KeyboardStep: Story = {
  name: 'Jumble mode: one open slot steps through the keyboard',
  args: { word: 'styl', locks: ['spot', 'spot', 'spot', 'spot', 'free'] },
};

export const EmptyRow: Story = {
  name: "Jumble mode: empty row still uses the target's known letters",
  args: { word: '', locks: [] },
};

export const NoTarget: Story = {
  name: 'Jumble mode: no target board',
  args: { target: null },
};

export const LockedGreyLetter: Story = {
  name: 'Jumble mode: locked letter already grey on the target',
  args: { word: 'rotls', locks: ['letter', 'letter', 'free', 'letter', 'letter'] },
};

export const SmallPhone: Story = {
  name: 'Small phone (320px)',
  args: { width: 320 },
};

export const LongPress: Story = {
  name: 'Variant: long-press to lock',
  args: { lockGesture: 'long-press' },
};
