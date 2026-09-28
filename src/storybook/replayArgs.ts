import { useCallback, useEffect } from 'react';
import { useArgs } from '@storybook/preview-api';
import type { ArgTypes } from '@storybook/react';
import { MAX_GUESSES } from '@/config';
import { STORY_GAME_KEYS, STORY_GAMES, type StoryGameKey } from './fixtures';
import { useStoryGame } from './useStoryGame';

const AUTOPLAY_INTERVAL_MS = 2500;

export interface ReplayArgs {
  game: StoryGameKey;
  step: number;
  autoplay: boolean;
}

export const replayArgTypes: ArgTypes<ReplayArgs> = {
  game: {
    control: {
      type: 'select',
      labels: Object.fromEntries(STORY_GAME_KEYS.map((key) => [key, STORY_GAMES[key].label])),
    },
    options: STORY_GAME_KEYS,
    description:
      'Saved game to replay. Type your own guess at any step to branch; use "Remount component" in the toolbar to restore the saved guesses.',
  },
  step: {
    control: { type: 'range', min: 0, max: MAX_GUESSES, step: 1 },
    description:
      'How many guesses have been played. Moving forward by one plays that guess’s animations.',
  },
  autoplay: {
    control: { type: 'boolean' },
    description: `Advance one guess every ${AUTOPLAY_INTERVAL_MS / 1000}s until the end of the game.`,
  },
};

export const replayDefaultArgs: ReplayArgs = {
  game: 'realGame',
  step: 0,
  autoplay: false,
};

export type UpdateReplayArgs = (args: Partial<ReplayArgs>) => void;

/**
 * Storybook's `useArgs` only works in the story function itself, so call this in `render`
 * and pass the result down to the component.
 */
export const useReplayArgsUpdater = (): UpdateReplayArgs => useArgs<ReplayArgs>()[1];

/** Story game driven by the `step` / `autoplay` Storybook controls. */
export function useReplayStoryGame(
  { game: gameKey, step, autoplay }: ReplayArgs,
  updateArgs: UpdateReplayArgs
) {
  const setStep = useCallback((next: number) => updateArgs({ step: next }), [updateArgs]);
  const game = useStoryGame(STORY_GAMES[gameKey], step, setStep);

  useEffect(() => {
    if (!autoplay) {
      return;
    }
    if (game.step >= game.timeline.length) {
      updateArgs({ autoplay: false });
      return;
    }
    const timer = window.setTimeout(() => setStep(game.step + 1), AUTOPLAY_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [autoplay, game.step, game.timeline.length, setStep, updateArgs]);

  return game;
}
