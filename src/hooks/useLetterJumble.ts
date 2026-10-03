import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Language } from '@/types/firestore';
import {
  boardKnowledge,
  conflictingSlots,
  createJumbler,
  relock,
  targetStatuses,
  togglePin,
  type JumbleSlot,
} from '@/utils/letterJumble';
import { normalizeWord } from '@/utils/wordUtils';

const NO_MARKS: JumbleSlot[] = Array.from({ length: 5 }, () => ({ letter: '', lock: 'kept' }));

interface UseLetterJumbleOptions {
  /** Jumble mode closes and pins clear whenever a guess is submitted. */
  guesses: string[];
  solution: Partial<Record<Language, string>>;
  shuffledLanguages: Language[];
  /** Board the player has picked; a solved board falls back to the first unsolved one. */
  preferredBoard: number;
  currentGuess: string[];
  setCurrentGuess: (guess: string[]) => void;
  /** Called when nothing fits the pins and the target's known letters. */
  onNoArrangement: () => void;
  /** Off once the game is over: hides the controls and stops the Space / Esc shortcuts. */
  enabled: boolean;
}

export function useLetterJumble({
  guesses,
  solution,
  shuffledLanguages,
  preferredBoard,
  currentGuess,
  setCurrentGuess,
  onNoArrangement,
  enabled,
}: UseLetterJumbleOptions) {
  const [isOpen, setIsOpen] = useState(false);
  /** Pins and suggestions, each tied to the letter it was set on: typing over a slot clears it. */
  const [marks, setMarks] = useState(NO_MARKS);
  const jumbler = useRef(createJumbler());

  const targetBoard = useMemo(() => {
    const guessed = new Set(guesses.map(normalizeWord));
    const solved = shuffledLanguages.map((lang) =>
      guessed.has(normalizeWord(solution[lang] ?? ''))
    );
    return solved[preferredBoard] ? solved.indexOf(false) : preferredBoard;
  }, [guesses, preferredBoard, shuffledLanguages, solution]);

  const knowledge = useMemo(() => {
    const word = solution[shuffledLanguages[targetBoard]];
    return word ? boardKnowledge(guesses, word) : undefined;
  }, [guesses, shuffledLanguages, solution, targetBoard]);

  useEffect(() => {
    setIsOpen(false);
    setMarks(NO_MARKS);
  }, [guesses.length]);

  const slots: JumbleSlot[] = currentGuess.map((letter, i) => {
    if (!letter) {
      return { letter, lock: 'suggested' };
    }
    return { letter, lock: marks[i].letter === letter ? marks[i].lock : 'kept' };
  });

  const jumble = () => {
    const result = jumbler.current(slots, knowledge);
    if (!result) {
      onNoArrangement();
      return;
    }
    const next = relock(slots, result);
    setCurrentGuess(next.map((slot) => slot.letter));
    setMarks(next);
  };

  /** The 🔀 button: opens jumble mode, then jumbles on every press. */
  const press = () => (isOpen ? jumble() : setIsOpen(true));

  const togglePinAt = (index: number) => {
    const { letter, lock } = slots[index];
    if (letter) {
      setMarks((prev) =>
        prev.map((mark, i) => (i === index ? { letter, lock: togglePin(lock) } : mark))
      );
    }
  };

  const close = useCallback(() => setIsOpen(false), []);

  const pressRef = useRef(press);
  pressRef.current = press;
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (/^(INPUT|TEXTAREA|BUTTON)$/.test(target.tagName) || target.isContentEditable)
      ) {
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        pressRef.current();
      } else if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  const open = enabled && isOpen;
  return {
    enabled,
    isOpen: open,
    targetBoard: open && targetBoard !== -1 ? targetBoard : null,
    slots,
    statuses: open ? targetStatuses(slots, knowledge) : undefined,
    conflicts: open ? conflictingSlots(slots, knowledge) : undefined,
    press,
    close,
    togglePinAt,
  };
}

export type LetterJumble = ReturnType<typeof useLetterJumble>;
