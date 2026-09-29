export const MAX_GUESSES = 8;

/**
 * Point values per scoring version. "perM" values are multiplied by the turn multiplier
 * m = MAX_GUESSES + 3 − guess number (10 on guess 1, 3 on guess 8).
 */
export interface ScoringRules {
  greenPerM: number;
  /**
   * `combo`: every yellow tile scores, 1×, 2×, 3×… `base` within a guess.
   * `firstSeen`: a yellow scores `perM`×m only when it reveals a copy of the letter the
   * board didn't already know about (from earlier yellows or greens).
   */
  yellow: { mode: 'combo'; base: number } | { mode: 'firstSeen'; perM: number };
  wordSolvedPerM: number;
  gameSolvedPerM: number;
  unsolvedPenalty: number;
  /** Bonus on the guess that solves your first word. */
  crackPerM: number;
  /** Flat bonus when one guess adds new greens on every board while all are unsolved. */
  hatTrick: number;
}

export const SCORING_RULES: Record<number, ScoringRules> = {
  1: {
    greenPerM: 5,
    yellow: { mode: 'combo', base: 5 },
    wordSolvedPerM: 20,
    gameSolvedPerM: 25,
    unsolvedPenalty: -250,
    crackPerM: 0,
    hatTrick: 0,
  },
  2: {
    greenPerM: 5,
    yellow: { mode: 'firstSeen', perM: 2 },
    wordSolvedPerM: 20,
    gameSolvedPerM: 25,
    unsolvedPenalty: -250,
    crackPerM: 30,
    hatTrick: 75,
  },
};

/** Stored on new games; games without a version were scored under v1. */
export const SCORING_VERSION = 2;
export const LEGACY_SCORING_VERSION = 1;
