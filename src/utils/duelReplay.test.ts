import { describe, expect, it } from 'vitest';
import type { Language } from '@/types/firestore';
import { buildDuelTimeline, duelBarMax } from './duelReplay';

/** A real challenge: one player finished in 6, the other ran out of guesses with 17 points. */
const WORDS = { pt: 'menti', en: 'emery', es: 'rubia' };
const LANGS: Language[] = ['pt', 'en', 'es'];
const WINNER = ['prato', 'begun', 'slime', 'menti', 'emery', 'rubia'];
const SEVENTEEN = ['water', 'hater', 'later', 'miner', 'menos', 'mente', 'menti', 'merge'];

describe('buildDuelTimeline', () => {
  const winner = buildDuelTimeline(WINNER, WORDS, LANGS, 2, 8);
  const seventeen = buildDuelTimeline(SEVENTEEN, WORDS, LANGS, 2, 8);

  it('splits the score into languages and bonuses', () => {
    expect(seventeen[8]).toMatchObject({
      langTotals: { pt: 279, en: -186, es: -196 },
      bonusTotal: 120,
      total: 17,
      solvedOn: { pt: 7 },
    });
    expect(winner[6]).toMatchObject({
      langTotals: { pt: 390, en: 324, es: 317 },
      bonusTotal: 335,
      total: 1366,
      solvedOn: { pt: 4, en: 5, es: 6 },
    });
  });

  it('penalties land on the last turn', () => {
    expect(seventeen[7].langTotals).toEqual({ pt: 279, en: 64, es: 54 });
    expect(seventeen[8].events.filter((e) => e.kind === 'penalty')).toHaveLength(2);
  });

  it('a player who finished early keeps their standing with no guess', () => {
    expect(winner[7]).toMatchObject({ guess: null, events: [], total: 1366 });
  });

  it('bars are scaled to the best language either player reached', () => {
    expect(duelBarMax([winner, seventeen])).toBe(390);
  });
});
