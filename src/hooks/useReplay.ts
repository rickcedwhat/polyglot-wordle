import { useCallback, useEffect, useRef, useState } from 'react';

/** Per-letter delay while a guess is typed out. */
const TYPING_DELAY_MS = 150;
/** Pause after a guess lands (its score animations play) before typing the next. */
const TURN_PAUSE_MS = 1400;

interface UseReplayOptions {
  /** Called when a guess is played forward (not jumped to), so its animations can run. */
  onGuessPlayed?: (step: number) => void;
  /** Called on any jump, so in-flight animations can be cleared. */
  onJump?: () => void;
  /** Open on the finished position (default) or before the first guess. */
  startAt?: 'end' | 'start';
}

/**
 * Turn-by-turn playback of a finished game's guesses. Playing types each guess out, lands it,
 * pauses, then moves to the next.
 */
export function useReplay(
  timeline: string[],
  { onGuessPlayed, onJump, startAt = 'end' }: UseReplayOptions = {}
) {
  const total = timeline.length;
  const [step, setStep] = useState(startAt === 'start' ? 0 : total);
  const [playing, setPlaying] = useState(false);
  /** Letters of `timeline[step]` typed so far, while a guess is being typed out. */
  const [typed, setTyped] = useState<number | null>(null);

  const callbacks = useRef({ onGuessPlayed, onJump });
  callbacks.current = { onGuessPlayed, onJump };

  const timelineKey = timeline.join(',');
  useEffect(() => {
    const length = timelineKey ? timelineKey.split(',').length : 0;
    setStep(startAt === 'start' ? 0 : length);
    setPlaying(false);
    setTyped(null);
  }, [timelineKey, startAt]);

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
      landing ? TYPING_DELAY_MS * 2 : TYPING_DELAY_MS
    );
    return () => window.clearTimeout(timer);
  }, [typed, step, timeline]);

  // While playing, start typing the next guess after the previous one has had its moment.
  useEffect(() => {
    if (!playing || typed !== null) {
      return undefined;
    }
    if (step >= total) {
      setPlaying(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setTyped(0), step === 0 ? 300 : TURN_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [playing, typed, step, total]);

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
    /** True while the replay isn't showing the finished game. */
    isReplaying: playing || typed !== null || step < total,
    play,
    pause,
    next,
    goTo,
  };
}

export type Replay = ReturnType<typeof useReplay>;
