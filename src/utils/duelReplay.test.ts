import { describe, expect, it } from 'vitest';
import type { Language } from '@/types/firestore';
import { buildDuelTimeline, duelBarMax, duelTotalMax } from './duelReplay';

/** A real challenge: one player finished in 6, the other ran out of guesses with 17 points. */
const WORDS = { pt: 'menti', en: 'emery', es: 'rubia' };
const LANGS: Language[] = ['pt', 'en', 'es'];
const WINNER = ['prato', 'begun', 'slime', 'menti', 'emery', 'rubia'];
const SEVENTEEN = ['water', 'hater', 'later', 'miner', 'menos', 'mente', 'menti', 'merge'];

describe('buildDuelTimeline', () => {
  const winner = buildDuelTimeline(WINNER, WORDS, LANGS, 2, 8);
  const seventeen = buildDuelTimeline(SEVENTEEN, WORDS, LANGS, 2, 8);

  it('language bars get greens and yellows; solves, penalties and bonuses go to the total', () => {
    expect(seventeen[8]).toMatchObject({
      langTotals: { pt: 199, en: 64, es: 54 },
      bonusTotal: 80 + 120 - 500,
      total: 17,
      solvedOn: { pt: 7 },
      unsolved: ['en', 'es'],
    });
    expect(winner[6]).toMatchObject({
      langTotals: { pt: 250, en: 204, es: 217 },
      bonusTotal: 140 + 210 + 120 + 100 + 125,
      total: 1366,
      solvedOn: { pt: 4, en: 5, es: 6 },
      unsolved: [],
    });
  });

  it('penalties land on the last turn', () => {
    expect(seventeen[7]).toMatchObject({ total: 517, unsolved: [] });
    expect(seventeen[8].events.filter((e) => e.kind === 'penalty')).toHaveLength(2);
  });

  it('a player who finished early keeps their standing with no guess', () => {
    expect(winner[7]).toMatchObject({ guess: null, events: [], total: 1366 });
  });

  it('bars are scaled to the best language and best total either player reached', () => {
    expect(duelBarMax([winner, seventeen])).toBe(250);
    expect(duelTotalMax([winner, seventeen])).toBe(1366);
  });
});
