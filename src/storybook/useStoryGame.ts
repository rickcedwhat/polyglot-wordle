import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useScoreBurst } from '@/components/ScoreFlights/flightUtils';
import { MAX_GUESSES } from '@/config';
import { useLetterStatus } from '@/hooks/useLetterStatus';
import { useWordPools } from '@/hooks/useWordPools';
import {
  calculateScoreFromHistory,
  getLatestTurnScoreEvents,
  normalizeWord,
  validateGuess,
} from '@/utils/wordUtils';
import type { StoryGameFixture } from './fixtures';

const EMPTY_GUESS = ['', '', '', '', ''];

/**
 * Local, Firebase-free game state for stories: a saved guess timeline you can step through,
 * plus live typing that branches the timeline from the current step.
 *
 * `requestedStep` is controlled (e.g. by a Storybook `step` arg); typing a guess reports the
 * new step through `onStepChange`.
 */
export function useStoryGame(
  fixture: StoryGameFixture,
  requestedStep: number,
  onStepChange: (step: number) => void
) {
  const { languages, words: solution } = fixture;
  const difficulties = useMemo(
    () => Object.fromEntries(languages.map((lang) => [lang, 'advanced' as const])),
    [languages]
  );
  const { data: wordPools } = useWordPools(difficulties);
  const { updateLetterStatuses } = useLetterStatus();

  const [timeline, setTimeline] = useState<string[]>(fixture.guesses);
  const step = Math.max(0, Math.min(timeline.length, Math.round(requestedStep || 0)));
  const [currentGuess, setCurrentGuess] = useState<string[]>(EMPTY_GUESS);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [isInvalid, setIsInvalid] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const { burst, fireBurst, clearBurst } = useScoreBurst();
  const burstCounter = useRef(0);

  const guesses = useMemo(() => timeline.slice(0, step), [timeline, step]);
  const normGuesses = guesses.map(normalizeWord);
  const solvedAll = languages.every((lang) => normGuesses.includes(normalizeWord(solution[lang]!)));
  const isOver = solvedAll || guesses.length >= MAX_GUESSES;
  const score = calculateScoreFromHistory(guesses, solution);

  useEffect(() => {
    updateLetterStatuses({ guesses, solution, shuffledLanguages: languages });
  }, [guesses, solution, languages, updateLetterStatuses]);

  // Stepping exactly one guess forward replays that guess's animations; other jumps don't.
  const prevStep = useRef(step);
  useEffect(() => {
    if (step === prevStep.current) {
      return;
    }
    if (step === prevStep.current + 1) {
      burstCounter.current += 1;
      fireBurst(burstCounter.current, getLatestTurnScoreEvents(timeline.slice(0, step), solution));
    } else {
      clearBurst();
    }
    prevStep.current = step;
    setCurrentGuess(EMPTY_GUESS);
    setCursorIndex(0);
  }, [step, timeline, solution, fireBurst, clearBurst]);

  // Keep the external control in range (e.g. slider dragged past the last saved guess).
  useEffect(() => {
    if (requestedStep !== step) {
      onStepChange(step);
    }
  }, [requestedStep, step, onStepChange]);

  const submit = (guess: string) => {
    if (!wordPools || isOver) {
      return false;
    }
    const { isValid } = validateGuess({
      guess,
      masterPools: wordPools.master,
      solution,
      previousGuesses: guesses,
    });
    if (!isValid) {
      setIsInvalid(true);
      setTimeout(() => setIsInvalid(false), 500);
      return false;
    }
    const nextTimeline = [...guesses, guess];
    setTimeline(nextTimeline);
    onStepChange(nextTimeline.length);
    return true;
  };

  /** Drop any typed branch and restore the fixture's saved guesses. */
  const resetTimeline = useCallback(() => setTimeline(fixture.guesses), [fixture.guesses]);

  // Key events can arrive faster than re-renders; read the latest state through a ref.
  const latest = useRef({ currentGuess, cursorIndex, isOver, submit });
  latest.current = { currentGuess, cursorIndex, isOver, submit };

  const handleKeyPress = useCallback((key: string) => {
    const {
      currentGuess: row,
      cursorIndex: cursor,
      isOver: over,
      submit: doSubmit,
    } = latest.current;
    if (over) {
      return;
    }
    const lowerKey = key.toLowerCase();
    setActiveKey(null);
    setTimeout(() => setActiveKey(lowerKey), 10);

    if (lowerKey === 'enter') {
      const guess = row.join('');
      if (guess.length === 5) {
        doSubmit(guess);
      }
    } else if (lowerKey === 'del' || lowerKey === 'backspace') {
      const next = [...row];
      if (next[cursor]) {
        next[cursor] = '';
        latest.current.currentGuess = next;
        setCurrentGuess(next);
      } else if (cursor > 0) {
        next[cursor - 1] = '';
        latest.current.currentGuess = next;
        latest.current.cursorIndex = cursor - 1;
        setCurrentGuess(next);
        setCursorIndex(cursor - 1);
      }
    } else if (/^[a-z]$/.test(lowerKey)) {
      const next = [...row];
      next[cursor] = lowerKey;
      const nextCursor = Math.min(4, cursor + 1);
      latest.current.currentGuess = next;
      latest.current.cursorIndex = nextCursor;
      setCurrentGuess(next);
      setCursorIndex(nextCursor);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }
      if (event.key === 'Enter') {
        handleKeyPress('enter');
      } else if (event.key === 'Backspace') {
        handleKeyPress('del');
      } else if (event.key === 'ArrowLeft') {
        setCursorIndex((i) => Math.max(0, i - 1));
      } else if (event.key === 'ArrowRight') {
        setCursorIndex((i) => Math.min(4, i + 1));
      } else if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
        handleKeyPress(event.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKeyPress]);

  return {
    fixture,
    languages,
    solution,
    wordPools,
    timeline,
    step,
    guesses,
    currentGuess,
    cursorIndex,
    setCursorIndex,
    isInvalid,
    activeKey,
    burst,
    score,
    solvedAll,
    isOver,
    handleKeyPress,
    resetTimeline,
  };
}

export type StoryGame = ReturnType<typeof useStoryGame>;
