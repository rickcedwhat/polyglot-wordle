import { FC, useEffect, useMemo, useState } from 'react';
import { flagFor, labelFor } from '@/utils/languages';
import type { ScoreEvent } from '@/utils/wordUtils';
import classes from './ScorePopups.module.css';

const POPUP_DURATION_MS = 1800;
const POPUP_STAGGER_MS = 180;

type PopupTone = 'green' | 'yellow' | 'solved' | 'penalty';

interface PopupLine {
  id: string;
  points: number;
  label: string;
  tone: PopupTone;
}

export function buildPopupLines(events: ScoreEvent[]): PopupLine[] {
  const lines: PopupLine[] = [];
  const greens = events.filter((e) => e.kind === 'green').reduce((s, e) => s + e.points, 0);
  const yellows = events.filter((e) => e.kind === 'yellow').reduce((s, e) => s + e.points, 0);

  if (greens > 0) {
    lines.push({ id: 'green', points: greens, label: 'Green discovery', tone: 'green' });
  }
  if (yellows > 0) {
    lines.push({ id: 'yellow', points: yellows, label: 'Yellow combo', tone: 'yellow' });
  }
  events.forEach((event) => {
    if (event.kind === 'wordSolved' && event.lang) {
      lines.push({
        id: `solved-${event.lang}`,
        points: event.points,
        label: `${flagFor(event.lang)} ${labelFor(event.lang)} solved!`,
        tone: 'solved',
      });
    } else if (event.kind === 'gameSolved') {
      lines.push({ id: 'game', points: event.points, label: 'All words solved!', tone: 'solved' });
    } else if (event.kind === 'penalty' && event.lang) {
      lines.push({
        id: `penalty-${event.lang}`,
        points: event.points,
        label: `${flagFor(event.lang)} ${labelFor(event.lang)} unsolved`,
        tone: 'penalty',
      });
    }
  });

  return lines;
}

interface ScorePopupsProps {
  events: ScoreEvent[];
}

/** Remount (via `key`) for each new guess to replay the animation. */
export const ScorePopups: FC<ScorePopupsProps> = ({ events }) => {
  const lines = useMemo(() => buildPopupLines(events), [events]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const total = POPUP_DURATION_MS + POPUP_STAGGER_MS * Math.max(0, lines.length - 1);
    const timer = window.setTimeout(() => setVisible(false), total);
    return () => window.clearTimeout(timer);
  }, [lines.length]);

  if (!visible || lines.length === 0) {
    return null;
  }

  return (
    <div className={classes.container} aria-live="polite">
      {lines.map((line, index) => (
        <div
          key={line.id}
          className={`${classes.popup} ${classes[line.tone]}`}
          style={{
            animationDelay: `${index * POPUP_STAGGER_MS}ms`,
            animationDuration: `${POPUP_DURATION_MS}ms`,
            bottom: `${(lines.length - 1 - index) * 1.75}rem`,
          }}
        >
          <span className={classes.points}>
            {line.points > 0 ? '+' : '−'}
            {Math.abs(line.points)}
          </span>
          <span className={classes.label}>{line.label}</span>
        </div>
      ))}
    </div>
  );
};
