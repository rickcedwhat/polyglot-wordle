import { FC } from 'react';
import { flagFor, labelFor } from '@/utils/languages';
import type { ScoreEvent } from '@/utils/wordUtils';
import classes from './ScorePopups.module.css';

const POPUP_STAGGER_MS = 180;
export const TILE_STAGGER_MS = 90;
/** Finish the popup's 15% fade-in when the final tile's letter reaches its 88% reveal. */
const BOARD_POPUP_DELAY = `calc(${TILE_STAGGER_MS * 4}ms + var(--score-tile-duration, 1100ms) * 0.88 - var(--score-popup-duration, 1800ms) * 0.15)`;

type PopupTone = 'green' | 'yellow' | 'solved' | 'penalty';

interface PopupLine {
  id: string;
  points: number;
  label: string;
  tone: PopupTone;
}

const sum = (events: ScoreEvent[]) => events.reduce((total, e) => total + e.points, 0);

/** Game-level lines shown above the guess row: bonuses not tied to one board, and penalties. */
export function buildGameLines(events: ScoreEvent[]): PopupLine[] {
  return events.flatMap((event): PopupLine[] => {
    if (event.kind === 'crack') {
      return [{ id: 'crack', points: event.points, label: 'First word cracked!', tone: 'solved' }];
    }
    if (event.kind === 'hatTrick') {
      return [{ id: 'hatTrick', points: event.points, label: 'Hat trick!', tone: 'green' }];
    }
    if (event.kind === 'gameSolved') {
      return [{ id: 'game', points: event.points, label: 'All words solved!', tone: 'solved' }];
    }
    if (event.kind === 'penalty' && event.lang) {
      return [
        {
          id: `penalty-${event.lang}`,
          points: event.points,
          label: `${flagFor(event.lang)} ${labelFor(event.lang)} unsolved`,
          tone: 'penalty',
        },
      ];
    }
    return [];
  });
}

/**
 * Board-level line for one language's events. Full-size boards show tile points inline, so
 * only the solved bonus floats; compact boards float the board's whole turn total.
 */
export function buildBoardLine(events: ScoreEvent[], compact: boolean): PopupLine | null {
  const solved = events.find((e) => e.kind === 'wordSolved');
  if (!compact) {
    return solved
      ? { id: 'solved', points: solved.points, label: 'Solved!', tone: 'solved' }
      : null;
  }
  const total = sum(events.filter((e) => e.kind !== 'penalty'));
  if (total <= 0) {
    return null;
  }
  const hasGreen = events.some((e) => e.kind === 'green');
  return {
    id: 'total',
    points: total,
    label: solved ? 'Solved!' : '',
    tone: solved ? 'solved' : hasGreen ? 'green' : 'yellow',
  };
}

const Pill: FC<{ line: PopupLine; animationDelay: string; bottomRem?: number }> = ({
  line,
  animationDelay,
  bottomRem = 0,
}) => (
  <div
    className={`${classes.popup} ${classes[line.tone]}`}
    style={{ animationDelay, bottom: `${bottomRem}rem` }}
  >
    <span className={classes.points}>
      {line.points > 0 ? '+' : '−'}
      {Math.abs(line.points)}
    </span>
    {line.label && <span className={classes.label}>{line.label}</span>}
  </div>
);

/** Remount (via `key`) for each new guess to replay the animation. */
export const ScorePopups: FC<{ events: ScoreEvent[] }> = ({ events }) => {
  const lines = buildGameLines(events);
  if (lines.length === 0) {
    return null;
  }
  return (
    <div className={classes.container} aria-live="polite">
      {lines.map((line, index) => (
        <Pill
          key={line.id}
          line={line}
          animationDelay={`calc(${BOARD_POPUP_DELAY} + ${index * POPUP_STAGGER_MS}ms)`}
          bottomRem={(lines.length - 1 - index) * 1.75}
        />
      ))}
    </div>
  );
};

/** Remount (via `key`) for each new guess to replay the animation. */
export const BoardScorePopup: FC<{ events: ScoreEvent[]; compact: boolean }> = ({
  events,
  compact,
}) => {
  const line = buildBoardLine(events, compact);
  if (!line) {
    return null;
  }
  return (
    <div className={classes.boardContainer} aria-live="polite">
      <Pill line={line} animationDelay={compact ? '0ms' : BOARD_POPUP_DELAY} />
    </div>
  );
};
