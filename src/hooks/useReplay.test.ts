import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReplay } from './useReplay';

const TIMELINE = ['crane', 'plate', 'plant'];

/** Advance in small steps so each timer's state update can schedule the next timer. */
const tick = (ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += 10) {
    act(() => {
      vi.advanceTimersByTime(10);
    });
  }
};

describe('useReplay', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts on the finished game', () => {
    const { result } = renderHook(() => useReplay(TIMELINE));
    expect(result.current.step).toBe(3);
    expect(result.current.guesses).toEqual(TIMELINE);
    expect(result.current.isReplaying).toBe(false);
  });

  it('play rewinds, types each guess out, and lands it with its animations', () => {
    const onGuessPlayed = vi.fn();
    const { result } = renderHook(() => useReplay(TIMELINE, { onGuessPlayed }));

    act(() => result.current.play());
    expect(result.current.step).toBe(0);

    tick(300 + 150 * 2);
    expect(result.current.typedLetters).toEqual(['c', 'r']);
    expect(onGuessPlayed).not.toHaveBeenCalled();

    tick(150 * 3 + 300);
    expect(result.current.step).toBe(1);
    expect(result.current.typedLetters).toBeNull();
    expect(onGuessPlayed).toHaveBeenCalledWith(1);

    tick(20_000);
    expect(result.current.step).toBe(3);
    expect(result.current.playing).toBe(false);
    expect(onGuessPlayed).toHaveBeenCalledTimes(3);
  });

  it('jumps without animating, and stops playback', () => {
    const onGuessPlayed = vi.fn();
    const onJump = vi.fn();
    const { result } = renderHook(() => useReplay(TIMELINE, { onGuessPlayed, onJump }));

    act(() => result.current.play());
    act(() => result.current.goTo(2));
    expect(result.current.step).toBe(2);
    expect(result.current.playing).toBe(false);
    expect(onJump).toHaveBeenCalled();

    tick(20_000);
    expect(result.current.step).toBe(2);
    expect(onGuessPlayed).not.toHaveBeenCalled();
  });

  it('next plays just one guess', () => {
    const { result } = renderHook(() => useReplay(TIMELINE));
    act(() => result.current.goTo(0));
    act(() => result.current.next());
    tick(20_000);
    expect(result.current.step).toBe(1);
  });

  it('2× halves the timings', () => {
    const { result } = renderHook(() => useReplay(TIMELINE));
    act(() => result.current.setSpeed(2));
    act(() => result.current.goTo(0));
    act(() => result.current.next());
    tick(600);
    expect(result.current.step).toBe(1);
  });

  it('resets to the end when a different game is shown', () => {
    const { result, rerender } = renderHook(({ timeline }) => useReplay(timeline), {
      initialProps: { timeline: TIMELINE },
    });
    act(() => result.current.goTo(1));
    rerender({ timeline: ['audio', 'plant'] });
    expect(result.current.step).toBe(2);
  });
});
