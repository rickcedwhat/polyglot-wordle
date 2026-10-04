import { useCallback, useEffect, useRef, useState } from 'react';

/** Per-letter delay while a guess is typed out, at 1×. */
const TYPING_DELAY_MS = 150;
/** Pause after a guess lands (its score animations play) before typing the next, at 1×. */
const TURN_PAUSE_MS = 1400;

export const REPLAY_SPEEDS = [1, 2] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

interface UseReplayOptions {
  /** Called when a guess is played forward (not jumped to), so its animations can run. */
  onGuessPlayed?: (step: number) => void;
  /** Called on any jump, so in-flight animations can be cleared. */
  onJump?: () => void;
}

/**
 * Turn-by-turn playback of a finished game's guesses. Starts on the final position; playing
 * types each guess out, lands it, pauses, then moves to the next.
 */
export function useReplay(timeline: string[], { onGuessPlayed, onJump }: UseReplayOptions = {}) {
  const total = timeline.length;
  const [step, setStep] = useState(total);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  /** Letters of `timeline[step]` typed so far, while a guess is being typed out. */
  const [typed, setTyped] = useState<number | null>(null);

  const callbacks = useRef({ onGuessPlayed, onJump });
  callbacks.current = { onGuessPlayed, onJump };

  const timelineKey = timeline.join(',');
  useEffect(() => {
    setStep(timelineKey ? timelineKey.split(',').length : 0);
    setPlaying(false);
    setTyped(null);
  }, [timelineKey]);

  // Type the current guess one letter at a time, then land it.
  useEffect(() => {
    if (typed === null) {
      return undefined;
    }
    const word = timeline[step];
    if (!word) {
      setTyped(null);
      return undefined;
    }
    const landing = typed >= word.length;
    const timer = window.setTimeout(
      () => {
        if (landing) {
          setTyped(null);
          setStep(step + 1);
          callbacks.current.onGuessPlayed?.(step + 1);
        } else {
          setTyped(typed + 1);
        }
      },
      (landing ? TYPING_DELAY_MS * 2 : TYPING_DELAY_MS) / speed
    );
    return () => window.clearTimeout(timer);
  }, [typed, step, timeline, speed]);

  // While playing, start typing the next guess after the previous one has had its moment.
  useEffect(() => {
    if (!playing || typed !== null) {
      return undefined;
    }
    if (step >= total) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setTyped(0), step === 0 ? 300 : TURN_PAUSE_MS / speed);
    return () => window.clearTimeout(timer);
  }, [playing, typed, step, total, speed]);

  const goTo = useCallback(
    (next: number) => {
      setPlaying(false);
      setTyped(null);
      setStep(Math.max(0, Math.min(total, next)));
      callbacks.current.onJump?.();
    },
    [total]
  );

  const play = useCallback(() => {
    if (step >= total) {
      setStep(0);
      callbacks.current.onJump?.();
    }
    setPlaying(true);
  }, [step, total]);

  const pause = useCallback(() => {
    setPlaying(false);
    setTyped(null);
  }, []);

  /** Play just the next guess, with its typing and animations. */
  const next = useCallback(() => {
    if (step < total && typed === null) {
      setPlaying(false);
      setTyped(0);
    }
  }, [step, total, typed]);

  const typedLetters =
    typed === null ? null : (timeline[step] ?? '').slice(0, typed).split('').filter(Boolean);

  return {
    step,
    total,
    guesses: timeline.slice(0, step),
    /** The guess being typed out, letter by letter, or null when not typing. */
    typedLetters,
    playing,
    speed,
    setSpeed,
    /** True while the replay isn't showing the finished game. */
    isReplaying: playing || typed !== null || step < total,
    play,
    pause,
    next,
    prev: () => goTo(step - 1),
    goTo,
  };
}

export type Replay = ReturnType<typeof useReplay>;
