import { getGuessStatuses, normalizeWord, type LetterStatus } from './wordUtils';

/** suggested: a random fill · kept: the player's letter, free to move · pinned: stays in its spot */
export type JumbleLock = 'suggested' | 'kept' | 'pinned';

export interface JumbleSlot {
  letter: string;
  lock: JumbleLock;
}

/** What one board has revealed so far. */
export interface BoardKnowledge {
  /** Green letter per position, or null. */
  greens: (string | null)[];
  /** Letters known not to be at each position (failed yellows and position-specific greys). */
  banned: Set<string>[];
  /** Letters not in the word at all. */
  absent: Set<string>;
  /** Letters known to be in the word, with the minimum count of each. */
  required: Map<string, number>;
}

const KEYBOARD_ORDER = 'qwertyuiopasdfghjklzxcvbnm';
const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const WORD_LENGTH = 5;

export const togglePin = (lock: JumbleLock): JumbleLock => (lock === 'pinned' ? 'kept' : 'pinned');

export const boardKnowledge = (guesses: string[], solution: string): BoardKnowledge => {
  const greens: (string | null)[] = Array(WORD_LENGTH).fill(null);
  const banned = Array.from({ length: WORD_LENGTH }, () => new Set<string>());
  const seen = new Set<string>();
  const greyed = new Set<string>();
  const required = new Map<string, number>();

  for (const guess of guesses) {
    const letters = normalizeWord(guess).split('');
    const found = new Map<string, number>();
    getGuessStatuses(guess, solution).forEach((status, i) => {
      const letter = letters[i];
      if (status !== 'absent') {
        found.set(letter, (found.get(letter) ?? 0) + 1);
      }
      if (status === 'correct') {
        greens[i] = letter;
        seen.add(letter);
      } else {
        banned[i].add(letter);
        if (status === 'present') {
          seen.add(letter);
        } else {
          greyed.add(letter);
        }
      }
    });
    found.forEach((count, letter) =>
      required.set(letter, Math.max(required.get(letter) ?? 0, count))
    );
  }

  const absent = new Set([...greyed].filter((letter) => !seen.has(letter)));
  return { greens, banned, absent, required };
};

const isAllowedAt = (letter: string, position: number, knowledge?: BoardKnowledge) =>
  !knowledge || (!knowledge.absent.has(letter) && !knowledge.banned[position].has(letter));

/** Letter-locked letters that are already grey on the target board. */
export const conflictingSlots = (slots: JumbleSlot[], knowledge?: BoardKnowledge): boolean[] =>
  slots.map(
    ({ letter, lock }) =>
      !!knowledge && !!letter && lock !== 'suggested' && knowledge.absent.has(letter)
  );

/** How each typed letter reads against the target: green here, known elsewhere, or not in it. */
export const targetStatuses = (slots: JumbleSlot[], knowledge?: BoardKnowledge): LetterStatus[] =>
  slots.map(({ letter }, i) => {
    if (!knowledge || !letter) {
      return 'unknown';
    }
    if (knowledge.greens[i] === letter) {
      return 'correct';
    }
    if (knowledge.required.has(letter)) {
      return 'present';
    }
    return knowledge.absent.has(letter) ? 'absent' : 'unknown';
  });

/**
 * Every placement of the floating letters into the open slots that respects the target.
 * Floating letters are the letter-locked ones plus any letter the target is known to contain.
 * Spot-locked slots and target greens are pinned; '' marks a slot to fill randomly.
 */
export const validArrangements = (slots: JumbleSlot[], knowledge?: BoardKnowledge): string[][] => {
  if (
    slots.some(
      ({ letter, lock }, i) =>
        lock === 'pinned' && knowledge?.greens[i] && knowledge.greens[i] !== letter
    )
  ) {
    return [];
  }

  const base = slots.map(({ letter, lock }) => (lock === 'pinned' ? letter : ''));
  const floating = slots
    .filter(({ letter, lock }) => letter && lock === 'kept')
    .map((s) => s.letter);

  slots.forEach(({ lock }, i) => {
    const green = knowledge?.greens[i];
    if (lock !== 'pinned' && green) {
      base[i] = green;
      const used = floating.indexOf(green);
      if (used !== -1) {
        floating.splice(used, 1);
      }
    }
  });

  knowledge?.required.forEach((count, letter) => {
    const have = [...base, ...floating].filter((l) => l === letter).length;
    for (let i = have; i < count; i++) {
      floating.push(letter);
    }
  });

  const open = base.flatMap((letter, i) => (letter ? [] : [i]));
  if (floating.length > open.length) {
    return [];
  }

  const results = new Map<string, string[]>();
  const place = (index: number, current: string[], usedPositions: Set<number>) => {
    if (index === floating.length) {
      results.set(current.join('|'), [...current]);
      return;
    }
    for (const position of open) {
      if (!usedPositions.has(position) && isAllowedAt(floating[index], position, knowledge)) {
        current[position] = floating[index];
        usedPositions.add(position);
        place(index + 1, current, usedPositions);
        usedPositions.delete(position);
        current[position] = '';
      }
    }
  };
  place(0, [...base], new Set());

  return [...results.values()];
};

/** Fill '' slots with letters allowed on the target, preferring letters not already used. */
export const fillOpenSlots = (
  arrangement: string[],
  knowledge?: BoardKnowledge,
  random: () => number = Math.random
): string[] => {
  const result = [...arrangement];
  result.forEach((letter, i) => {
    if (letter) {
      return;
    }
    const allowed = ALPHABET.filter((l) => isAllowedAt(l, i, knowledge));
    const fresh = allowed.filter((l) => !result.includes(l));
    const pool = fresh.length ? fresh : allowed;
    result[i] = pool.length ? pool[Math.floor(random() * pool.length)] : '';
  });
  return result;
};

/** The next keyboard-order letter (QWERTY rows, wrapping) allowed at this position. */
export const nextKeyboardLetter = (
  current: string,
  position: number,
  knowledge?: BoardKnowledge
): string => {
  const candidates = KEYBOARD_ORDER.split('').filter((l) => isAllowedAt(l, position, knowledge));
  if (!candidates.length) {
    return current;
  }
  const start = current ? KEYBOARD_ORDER.indexOf(current) : -1;
  return candidates.find((l) => KEYBOARD_ORDER.indexOf(l) > start) ?? candidates[0];
};

/** Carry locks over to a jumbled result: letter locks follow their letter, spot locks stay. */
export const relock = (slots: JumbleSlot[], result: string[]): JumbleSlot[] => {
  const floating = slots
    .filter(({ letter, lock }) => letter && lock === 'kept')
    .map((s) => s.letter);
  const relocked = result.map(
    (letter, i): JumbleSlot => ({
      letter,
      lock: slots[i].lock === 'pinned' ? 'pinned' : 'suggested',
    })
  );
  relocked.forEach((slot, i) => {
    const index = floating.indexOf(slot.letter);
    if (slots[i].lock !== 'pinned' && index !== -1) {
      floating.splice(index, 1);
      slot.lock = 'kept';
    }
  });
  return relocked;
};

const shuffle = <T>(items: T[], random: () => number): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * Stateful jumbler: steps through a shuffled deck of valid arrangements so presses don't repeat
 * until every option has shown. With a single slot to fill, it steps through keyboard order.
 */
export const createJumbler = (random: () => number = Math.random) => {
  let deck: string[][] = [];
  let signature = '';

  return (slots: JumbleSlot[], knowledge?: BoardKnowledge): string[] | null => {
    const arrangements = validArrangements(slots, knowledge);
    if (!arrangements.length) {
      return null;
    }

    const open = arrangements[0].flatMap((letter, i) => (letter ? [] : [i]));
    if (arrangements.length === 1 && open.length === 1) {
      const [position] = open;
      const result = [...arrangements[0]];
      result[position] = nextKeyboardLetter(slots[position].letter, position, knowledge);
      return result;
    }

    const nextSignature = JSON.stringify([
      slots.map(({ letter, lock }) => (lock === 'suggested' ? '' : `${letter}${lock}`)),
      arrangements.length,
      knowledge && [
        knowledge.greens,
        [...knowledge.absent].sort(),
        knowledge.banned.map((b) => [...b].sort()),
        [...knowledge.required].sort(),
      ],
    ]);
    if (nextSignature !== signature || !deck.length) {
      signature = nextSignature;
      deck = shuffle(arrangements, random);
    }
    return fillOpenSlots(deck.pop()!, knowledge, random);
  };
};
