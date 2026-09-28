import { useCallback, useEffect, useRef } from 'react';
import { addons, useArgs } from '@storybook/preview-api';
import type { ArgTypes } from '@storybook/react';
import { normalizeWord } from '@/utils/wordUtils';
import { STORY_GAME_KEYS, STORY_GAMES, type StoryGameKey } from './fixtures';
import {
  REPLAY_REQUEST_EVENT,
  REPLAY_RESET_EVENT,
  REPLAY_STATE_EVENT,
  type ReplaySpeed,
  type ReplayState,
} from './replayEvents';
import { useStoryGame } from './useStoryGame';

const AUTOPLAY_INTERVAL_MS = 2500;
/** Per-letter delay when the replay types out the next saved guess. */
const TYPING_DELAY_MS = 150;

export interface ReplayArgs {
  game: StoryGameKey;
  step: number;
  autoplay: boolean;
  speed: ReplaySpeed;
}

/** `step`, `autoplay` and `speed` are driven from the Replay panel, not Controls. */
const panelOnly = { table: { disable: true } };

export const replayArgTypes: ArgTypes<ReplayArgs> = {
  game: {
    control: {
      type: 'select',
      labels: Object.fromEntries(STORY_GAME_KEYS.map((key) => [key, STORY_GAMES[key].label])),
    },
    options: STORY_GAME_KEYS,
    description:
      'Saved game to replay. Step through it in the Replay panel; type your own guess at any step to branch.',
  },
  step: panelOnly,
  autoplay: panelOnly,
  speed: panelOnly,
};

export const replayDefaultArgs: ReplayArgs = {
  game: 'realGame',
  step: 0,
  autoplay: false,
  speed: 1,
};

/** Story parameters for replayable stories (enables the Replay panel). */
export const replayParameters = { replay: true };

export type UpdateReplayArgs = (args: Partial<ReplayArgs>) => void;

/**
 * Storybook's `useArgs` only works in the story function itself, so call this in `render`
 * and pass the result down to the component.
 */
export const useReplayArgsUpdater = (): UpdateReplayArgs => useArgs<ReplayArgs>()[1];

/** Story game driven by the Replay panel (`step`, `autoplay`, `speed` args). */
export function useReplayStoryGame(
  { game: gameKey, step, autoplay, speed }: ReplayArgs,
  updateArgs: UpdateReplayArgs
) {
  const setStep = useCallback((next: number) => updateArgs({ step: next }), [updateArgs]);
  const game = useStoryGame(STORY_GAMES[gameKey], step, setStep, TYPING_DELAY_MS / (speed || 1));

  useEffect(() => {
    if (!autoplay) {
      return;
    }
    if (game.step >= game.timeline.length) {
      updateArgs({ autoplay: false });
      return;
    }
    const timer = window.setTimeout(
      () => setStep(game.step + 1),
      AUTOPLAY_INTERVAL_MS / (speed || 1)
    );
    return () => window.clearTimeout(timer);
  }, [autoplay, speed, game.step, game.timeline.length, setStep, updateArgs]);

  useReplayBroadcast(game);

  const { resetTimeline } = game;
  useEffect(() => {
    const channel = addons.getChannel();
    const reset = () => {
      resetTimeline();
      updateArgs({ step: 0, autoplay: false });
    };
    channel.on(REPLAY_RESET_EVENT, reset);
    return () => channel.off(REPLAY_RESET_EVENT, reset);
  }, [resetTimeline, updateArgs]);

  return game;
}

/** Keeps the Replay panel in sync with the story's timeline. */
function useReplayBroadcast(game: ReturnType<typeof useStoryGame>) {
  const { step, timeline, isOver, score, solution, languages } = game;
  const stateRef = useRef<ReplayState | null>(null);

  useEffect(() => {
    const solutions = languages.map((lang) => normalizeWord(solution[lang]!));
    const solvedSteps = timeline.flatMap((guess, index) =>
      solutions.includes(normalizeWord(guess)) ? [index + 1] : []
    );
    stateRef.current = { step, timeline, solvedSteps, isOver, score };
    addons.getChannel().emit(REPLAY_STATE_EVENT, stateRef.current);
  }, [step, timeline, isOver, score, solution, languages]);

  useEffect(() => {
    const channel = addons.getChannel();
    const reply = () => stateRef.current && channel.emit(REPLAY_STATE_EVENT, stateRef.current);
    channel.on(REPLAY_REQUEST_EVENT, reply);
    return () => channel.off(REPLAY_REQUEST_EVENT, reply);
  }, []);
}
