import { FC, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useScoreFlightControls } from '@/context/ScoreContext';
import { TILE_STAGGER_MS } from '../ScorePopups/ScorePopups';
import {
  buildFlights,
  findScoreOrigin,
  findVisibleScoreTarget,
  GAME_ORIGIN,
  type ScoreBurst,
  type ScoreFlight,
} from './flightUtils';
import classes from './ScoreFlights.module.css';

const BASE_TILE_DURATION_MS = 1100;
/** Tile points finish flipping to letters around here (see LetterTile's points-out). */
const BOARD_LAUNCH_MS = TILE_STAGGER_MS * 4 + BASE_TILE_DURATION_MS * 0.7;
/** Game-level pills float above the guess row for a moment before flying. */
const GAME_LAUNCH_MS = BOARD_LAUNCH_MS + 1100;
const BOARD_STAGGER_MS = 150;
const FLIGHT_MS = 950;

interface Point {
  x: number;
  y: number;
}

interface ActiveFlight {
  burstId: number;
  flight: ScoreFlight;
  from: Point;
  to: Point;
  durationMs: number;
}

const centerOf = (el: HTMLElement): Point => {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
};

/** Follows Storybook's slow-motion control, which stretches `--score-tile-duration`. */
const motionScale = (el: Element | null) => {
  if (!el) {
    return 1;
  }
  const duration = parseFloat(getComputedStyle(el).getPropertyValue('--score-tile-duration'));
  return Number.isFinite(duration) && duration > 0 ? duration / BASE_TILE_DURATION_MS : 1;
};

/** Keep mounted across guesses so overlapping bursts can finish their flights. */
export const ScoreFlights: FC<{ burst: ScoreBurst }> = ({ burst }) => {
  const { releasePoints } = useScoreFlightControls();
  const [active, setActive] = useState<ActiveFlight[]>([]);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  useEffect(() => {
    if (!burst.fly) {
      return;
    }
    const flights = buildFlights(burst.events);
    const scale = motionScale(findScoreOrigin(flights[0]?.origin ?? GAME_ORIGIN));
    let boardIndex = 0;

    flights.forEach((flight) => {
      const delay =
        flight.origin === GAME_ORIGIN
          ? GAME_LAUNCH_MS * scale
          : (BOARD_LAUNCH_MS + boardIndex++ * BOARD_STAGGER_MS) * scale;
      const timer = window.setTimeout(() => {
        timers.current.delete(timer);
        const origin = findScoreOrigin(flight.origin);
        const target = findVisibleScoreTarget();
        if (!origin || !target) {
          releasePoints(burst.id, flight.origin);
          return;
        }
        setActive((current) => [
          ...current,
          {
            burstId: burst.id,
            flight,
            from: centerOf(origin),
            to: centerOf(target),
            durationMs: FLIGHT_MS * scale,
          },
        ]);
      }, delay);
      timers.current.add(timer);
    });
  }, [burst, releasePoints]);

  if (active.length === 0) {
    return null;
  }

  return createPortal(
    <div className={classes.layer} aria-hidden>
      {active.map(({ burstId, flight, from, to, durationMs }) => (
        <motion.div
          key={`${burstId}-${flight.origin}`}
          className={classes.flight}
          initial={{ x: from.x, y: from.y, scale: 0.6, opacity: 0 }}
          animate={{
            x: [from.x, from.x, to.x],
            y: [from.y, from.y - 16, to.y],
            scale: [0.6, 1.1, 0.7],
            opacity: [0, 1, 1],
          }}
          transition={{ duration: durationMs / 1000, times: [0, 0.25, 1], ease: 'easeInOut' }}
          onAnimationComplete={() => {
            releasePoints(burstId, flight.origin);
            setActive((current) =>
              current.filter((f) => f.burstId !== burstId || f.flight.origin !== flight.origin)
            );
          }}
        >
          <span className={`${classes.pill} ${classes[flight.tone]}`}>
            {flight.points > 0 ? '+' : '−'}
            {Math.abs(flight.points)}
          </span>
        </motion.div>
      ))}
    </div>,
    document.body
  );
};
