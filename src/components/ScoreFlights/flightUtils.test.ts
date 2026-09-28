import { describe, expect, it } from 'vitest';
import type { ScoreEvent } from '@/utils/wordUtils';
import { buildFlights, GAME_ORIGIN } from './flightUtils';

describe('buildFlights', () => {
  it('combines each board into one flight', () => {
    const events: ScoreEvent[] = [
      { kind: 'green', points: 25, lang: 'en', index: 0 },
      { kind: 'yellow', points: 5, lang: 'en', index: 3 },
      { kind: 'yellow', points: 5, lang: 'es', index: 1 },
    ];
    expect(buildFlights(events)).toEqual([
      { origin: 'en', points: 30, tone: 'green' },
      { origin: 'es', points: 5, tone: 'yellow' },
    ]);
  });

  it('marks a solved board and folds game bonus and penalties into one game flight', () => {
    const events: ScoreEvent[] = [
      { kind: 'green', points: 25, lang: 'it', index: 0 },
      { kind: 'wordSolved', points: 200, lang: 'it' },
      { kind: 'gameSolved', points: 500 },
      { kind: 'penalty', points: -100, lang: 'pt' },
    ];
    expect(buildFlights(events)).toEqual([
      { origin: 'it', points: 225, tone: 'solved' },
      { origin: GAME_ORIGIN, points: 400, tone: 'solved' },
    ]);
  });

  it('skips boards that scored nothing and flags a net penalty', () => {
    const events: ScoreEvent[] = [{ kind: 'penalty', points: -150, lang: 'fr' }];
    expect(buildFlights(events)).toEqual([{ origin: GAME_ORIGIN, points: -150, tone: 'penalty' }]);
  });
});
