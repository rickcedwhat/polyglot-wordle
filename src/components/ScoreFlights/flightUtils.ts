import { useCallback, useState } from 'react';
import { useScoreFlightControls } from '@/context/ScoreContext';
import type { ScoreEvent } from '@/utils/wordUtils';

export const SCORE_TARGET_ATTR = 'data-score-target';
export const SCORE_ORIGIN_ATTR = 'data-score-origin';
export const GAME_ORIGIN = 'game';

export interface ScoreBurst {
  id: number;
  events: ScoreEvent[];
  /** Points fly to the score counter; the counter holds them until each flight lands. */
  fly?: boolean;
}

export type FlightTone = 'green' | 'yellow' | 'solved' | 'penalty';

export interface ScoreFlight {
  /** Language code, or `GAME_ORIGIN` for the all-solved bonus and penalties. */
  origin: string;
  points: number;
  tone: FlightTone;
}

const isOnScreen = (el: Element) => {
  const rect = el.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    rect.right > 0 &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.top < window.innerHeight
  );
};

/** The score counter currently on screen (sidebar on desktop, header on mobile), if any. */
export function findVisibleScoreTarget(): HTMLElement | null {
  const targets = document.querySelectorAll<HTMLElement>(`[${SCORE_TARGET_ATTR}]`);
  return Array.from(targets).find(isOnScreen) ?? null;
}

export function findScoreOrigin(origin: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[${SCORE_ORIGIN_ATTR}="${origin}"]`);
}

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const canFlyScores = () => !prefersReducedMotion() && findVisibleScoreTarget() !== null;

/** One combined flight per board, plus one for the game-level bonus/penalties. */
export function buildFlights(events: ScoreEvent[]): ScoreFlight[] {
  const boards = new Map<string, ScoreEvent[]>();
  const gameEvents: ScoreEvent[] = [];
  for (const event of events) {
    if (event.kind === 'gameSolved' || event.kind === 'penalty' || !event.lang) {
      gameEvents.push(event);
    } else {
      boards.set(event.lang, [...(boards.get(event.lang) ?? []), event]);
    }
  }

  const flights: ScoreFlight[] = [];
  boards.forEach((boardEvents, lang) => {
    const points = boardEvents.reduce((total, e) => total + e.points, 0);
    if (points === 0) {
      return;
    }
    const tone: FlightTone = boardEvents.some((e) => e.kind === 'wordSolved')
      ? 'solved'
      : boardEvents.some((e) => e.kind === 'green')
        ? 'green'
        : 'yellow';
    flights.push({ origin: lang, points, tone });
  });

  const gamePoints = gameEvents.reduce((total, e) => total + e.points, 0);
  if (gamePoints !== 0) {
    flights.push({
      origin: GAME_ORIGIN,
      points: gamePoints,
      tone: gamePoints > 0 ? 'solved' : 'penalty',
    });
  }
  return flights;
}

/** Latest-guess score burst; holds the burst's points on the counter when they will fly. */
export function useScoreBurst() {
  const [burst, setBurst] = useState<ScoreBurst | null>(null);
  const { holdPoints } = useScoreFlightControls();

  const fireBurst = useCallback(
    (id: number, events: ScoreEvent[]) => {
      const flights = buildFlights(events);
      const fly = flights.length > 0 && canFlyScores();
      holdPoints(
        id,
        fly ? Object.fromEntries(flights.map((flight) => [flight.origin, flight.points])) : {}
      );
      setBurst({ id, events, fly });
    },
    [holdPoints]
  );

  const clearBurst = useCallback(() => {
    holdPoints(0, {});
    setBurst(null);
  }, [holdPoints]);

  return { burst, fireBurst, clearBurst };
}
