/**
 * Channel events between replayable stories (preview) and the Replay panel (manager).
 * Keep this file free of app imports: the Storybook manager bundles it too.
 */
export const REPLAY_ADDON_ID = 'polyglot/replay';
export const REPLAY_PANEL_ID = `${REPLAY_ADDON_ID}/panel`;
export const REPLAY_STATE_EVENT = `${REPLAY_ADDON_ID}/state`;
export const REPLAY_REQUEST_EVENT = `${REPLAY_ADDON_ID}/request`;
/** Restore the saved guesses (dropping any typed branch) and go back to the start. */
export const REPLAY_RESET_EVENT = `${REPLAY_ADDON_ID}/reset`;

/** Story parameter that turns the Replay panel on. */
export const REPLAY_PARAM = 'replay';

export const REPLAY_SPEEDS = [0.5, 1, 2] as const;
export type ReplaySpeed = (typeof REPLAY_SPEEDS)[number];

export interface ReplayState {
  step: number;
  timeline: string[];
  /** Words solved at each step (1-based index into `timeline`), for highlighting. */
  solvedSteps: number[];
  isOver: boolean;
  score: number;
}
