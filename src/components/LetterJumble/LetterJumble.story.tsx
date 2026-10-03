import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { IconArrowsShuffle } from '@tabler/icons-react';
import { ActionIcon, Box, Group, Stack, Text } from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import {
  boardKnowledge,
  conflictingSlots,
  createJumbler,
  nextLock,
  relock,
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
const JUMBLE_KEY = '🔀';

const KEY_ROWS = [
  'qwertyuiop'.split(''),
  [...'asdfghjkl'.split(''), 'enter'],
  [...'zxcvbnm'.split(''), 'del', JUMBLE_KEY],
];
const KEY_LABELS: Record<string, string> = { enter: '⏎', del: '←' };
const RANK: Record<LetterStatus, number> = { unknown: 0, absent: 1, present: 2, correct: 3 };

type LockGesture = 'tap-again' | 'long-press';
type JumblePlacement = 'keyboard' | 'row';

interface HarnessProps {
  word: string;
  locks: JumbleLock[];
  target: number | null;
  lockGesture: LockGesture;
  jumblePlacement: JumblePlacement;
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
  jumblePlacement,
}: HarnessProps) {
  const [slots, setSlots] = useState(() => toSlots(word, locks));
  const [cursorIndex, setCursorIndex] = useState(() => Math.min(word.length, 4));
  const [target, setTarget] = useState(initialTarget);
  const [isInvalid, setIsInvalid] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const jumbler = useRef(createJumbler());

  useEffect(() => {
    setSlots(toSlots(word, locks));
    setTarget(initialTarget);
  }, [word, locks, initialTarget]);

  const knowledge = useMemo(
    () => (target === null ? undefined : boardKnowledge(GUESSES, SOLUTIONS[target])),
    [target]
  );
  const conflicts = conflictingSlots(slots, knowledge);
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
      if (key === JUMBLE_KEY) {
        jumble();
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
    [cursorIndex, jumble, slots]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === ' ') {
        event.preventDefault();
        pressKey(JUMBLE_KEY);
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
  }, [pressKey]);

  const onTileClick = (index: number) => {
    if (lockGesture === 'tap-again' && index === cursorIndex) {
      cycleLock(index);
    }
    setCursorIndex(index);
  };

  const hint = !arrangements.length
    ? 'Nothing fits these locks on the target.'
    : openSlots === 1 && arrangements.length === 1
      ? 'One open slot: 🔀 steps through the keyboard (QWERTY order).'
      : `${arrangements.length} ordering${arrangements.length === 1 ? '' : 's'} of the locked letters fit${
          openSlots ? `, plus ${openSlots} random fill${openSlots === 1 ? '' : 's'}` : ''
        }.`;

  return (
    <Stack gap="md" w={375} mx="auto" p="sm">
      <Group justify="center" gap={4} wrap="nowrap">
        {SOLUTIONS.map((solution, i) => (
          <MockBoard
            key={solution}
            solution={solution}
            index={i}
            isTarget={target === i}
            onSelect={() => setTarget((t) => (t === i ? null : i))}
          />
        ))}
      </Group>

      <Group gap="xs" wrap="nowrap" align="center">
        <Box style={{ flex: 1 }}>
          <JumbleRow
            slots={slots}
            cursorIndex={cursorIndex}
            conflicts={conflicts}
            isInvalid={isInvalid}
            onTileClick={onTileClick}
            onTileLongPress={lockGesture === 'long-press' ? cycleLock : undefined}
          />
        </Box>
        {jumblePlacement === 'row' && (
          <ActionIcon variant="light" size="lg" onClick={jumble} aria-label="Jumble letters">
            <IconArrowsShuffle size={20} />
          </ActionIcon>
        )}
      </Group>

      <Text size="xs" c="dimmed" ta="center">
        {hint}
        {conflicts.some(Boolean) && ' Red = locked letter already grey on the target.'}
      </Text>

      <Stack gap={8}>
        {KEY_ROWS.map((row) => (
          <Group key={row[0]} gap="1.5%" wrap="nowrap">
            {row
              .filter((key) => key !== JUMBLE_KEY || jumblePlacement === 'keyboard')
              .map((key) => (
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
        {lockGesture === 'tap-again'
          ? 'Tap a tile to move the cursor; tap it again to cycle 🔓 → 🔒 letter → 📌 spot.'
          : 'Tap a tile to move the cursor; long-press to cycle 🔓 → 🔒 letter → 📌 spot.'}{' '}
        Tap a board to target it (tap again to clear). Space = jumble.
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
    jumblePlacement: { control: 'inline-radio', options: ['keyboard', 'row'] },
    target: { control: 'select', options: [null, 0, 1, 2] },
  },
  args: {
    word: 'tlohs',
    locks: ['letter', 'letter', 'letter', 'letter', 'letter'],
    target: 2,
    lockGesture: 'tap-again',
    jumblePlacement: 'keyboard',
  },
};

export default meta;
type Story = StoryObj<HarnessProps>;

export const StuckOnFrench: Story = {
  name: 'Stuck on the French board (TLOHS, letters locked)',
};

export const KeyboardStep: Story = {
  name: 'One open slot steps through the keyboard',
  args: { word: 'styl', locks: ['spot', 'spot', 'spot', 'spot', 'free'] },
};

export const NoTarget: Story = {
  name: 'No target board',
  args: { target: null },
};

export const LockedGreyLetter: Story = {
  name: 'Locked letter already grey on the target',
  args: { word: 'rotls', locks: ['letter', 'letter', 'free', 'letter', 'letter'] },
};

export const LongPressAndRowButton: Story = {
  name: 'Variant: long-press to lock, shuffle button by the row',
  args: { lockGesture: 'long-press', jumblePlacement: 'row' },
};
