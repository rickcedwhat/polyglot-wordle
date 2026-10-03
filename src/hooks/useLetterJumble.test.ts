import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Language } from '@/types/firestore';
import { useLetterJumble } from './useLetterJumble';

const SHUFFLED: Language[] = ['en', 'es', 'fr'];
const SOLUTION = { en: 'crisp', es: 'nieve', fr: 'stylo' };
const GUESSES = ['route', 'caser', 'valse'];

const setup = ({
  guesses = GUESSES,
  preferredBoard = 2,
  initial = ['', '', '', '', ''],
}: { guesses?: string[]; preferredBoard?: number; initial?: string[] } = {}) => {
  const onNoArrangement = vi.fn();
  const hook = renderHook(() => {
    const [currentGuess, setCurrentGuess] = useState(initial);
    const jumble = useLetterJumble({
      guesses,
      solution: SOLUTION,
      shuffledLanguages: SHUFFLED,
      preferredBoard,
      currentGuess,
      setCurrentGuess,
      onNoArrangement,
      enabled: true,
    });
    return { currentGuess, jumble };
  });
  return { ...hook, onNoArrangement };
};

describe('useLetterJumble', () => {
  it('opens on the first press and jumbles on the next', () => {
    const { result } = setup();
    expect(result.current.jumble.targetBoard).toBeNull();

    act(() => result.current.jumble.press());
    expect(result.current.jumble.isOpen).toBe(true);
    expect(result.current.jumble.targetBoard).toBe(2);
    expect(result.current.currentGuess.join('')).toBe('');

    act(() => result.current.jumble.press());
    const word = result.current.currentGuess;
    expect([...word].sort()).toEqual(expect.arrayContaining(['l', 'o', 's', 't']));
  });

  it("keeps the player's letters and colours the row against the target", () => {
    const { result } = setup({ preferredBoard: 0, initial: ['', '', 'i', '', ''] });
    act(() => result.current.jumble.press());
    act(() => result.current.jumble.press());

    const word = result.current.currentGuess;
    expect(word[0]).toBe('c');
    expect(word[3]).toBe('s');
    expect(word).toEqual(expect.arrayContaining(['r', 'i']));
    expect(result.current.jumble.statuses?.[0]).toBe('correct');
  });

  it('keeps a pinned letter in place', () => {
    const { result } = setup({ initial: ['', 'x', '', '', ''] });
    act(() => result.current.jumble.press());
    act(() => result.current.jumble.togglePinAt(1));
    for (let i = 0; i < 5; i++) {
      act(() => result.current.jumble.press());
      expect(result.current.currentGuess[1]).toBe('x');
    }
  });

  it('Space opens and jumbles; Escape closes', () => {
    const { result } = setup();
    const press = (key: string) =>
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      });

    press(' ');
    expect(result.current.jumble.isOpen).toBe(true);
    press(' ');
    expect(result.current.currentGuess.join('')).toHaveLength(5);
    press('Escape');
    expect(result.current.jumble.isOpen).toBe(false);
  });

  it('stays closed and ignores Space when disabled', () => {
    const { result } = renderHook(() => {
      const [currentGuess, setCurrentGuess] = useState(['', '', '', '', '']);
      return useLetterJumble({
        guesses: GUESSES,
        solution: SOLUTION,
        shuffledLanguages: SHUFFLED,
        preferredBoard: 2,
        currentGuess,
        setCurrentGuess,
        onNoArrangement: vi.fn(),
        enabled: false,
      });
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    });
    act(() => result.current.press());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.targetBoard).toBeNull();
  });

  it('falls back to the first unsolved board when the preferred one is solved', () => {
    const { result } = setup({ guesses: [...GUESSES, 'crisp'], preferredBoard: 0 });
    act(() => result.current.jumble.press());
    expect(result.current.jumble.targetBoard).toBe(1);
  });

  it('reports when nothing fits', () => {
    const { result, onNoArrangement } = setup({ initial: ['r', 'r', 'r', 'r', 'r'] });
    act(() => result.current.jumble.press());
    act(() => result.current.jumble.press());
    expect(onNoArrangement).toHaveBeenCalled();
  });

  it('closes and clears pins when a guess is submitted', () => {
    const onNoArrangement = vi.fn();
    const { result, rerender } = renderHook(
      ({ guesses }) => {
        const [currentGuess, setCurrentGuess] = useState(['', 'x', '', '', '']);
        return useLetterJumble({
          guesses,
          solution: SOLUTION,
          shuffledLanguages: SHUFFLED,
          preferredBoard: 2,
          currentGuess,
          setCurrentGuess,
          onNoArrangement,
          enabled: true,
        });
      },
      { initialProps: { guesses: GUESSES } }
    );
    act(() => result.current.press());
    act(() => result.current.togglePinAt(1));
    expect(result.current.slots[1].lock).toBe('pinned');

    rerender({ guesses: [...GUESSES, 'stool'] });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.slots[1].lock).toBe('kept');
  });

  it("typing over a pinned or suggested letter makes it the player's again", () => {
    const { result } = renderHook(() => {
      const [currentGuess, setCurrentGuess] = useState(['', 'x', '', '', '']);
      const jumble = useLetterJumble({
        guesses: GUESSES,
        solution: SOLUTION,
        shuffledLanguages: SHUFFLED,
        preferredBoard: 2,
        currentGuess,
        setCurrentGuess,
        onNoArrangement: vi.fn(),
        enabled: true,
      });
      return { jumble, setCurrentGuess };
    });
    act(() => result.current.jumble.press());
    act(() => result.current.jumble.togglePinAt(1));
    act(() => result.current.setCurrentGuess(['', 'y', '', '', '']));
    expect(result.current.jumble.slots[1].lock).toBe('kept');
  });
});
