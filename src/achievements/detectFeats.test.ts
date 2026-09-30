import { describe, expect, it } from 'vitest';
import { detectFeats } from './detectFeats';

const ids = (feats: ReturnType<typeof detectFeats>) => feats.map((f) => f.id);

describe('detectFeats', () => {
  it('finds Out of Nowhere and Speedrun (real game)', () => {
    const feats = detectFeats({
      words: { fr: 'fleur', en: 'craps', es: 'dandi' },
      guessHistory: ['think', 'spoil', 'dandi', 'fleur', 'craps'],
    });
    expect(feats).toEqual([
      { id: 'outOfNowhere', guess: 4, lang: 'fr', value: 1 },
      { id: 'speedrun', guess: 5, value: 5 },
    ]);
  });

  it('finds a Dud only while every board is open (real game)', () => {
    const feats = detectFeats({
      words: { es: 'pesos', en: 'slump', fr: 'pluie' },
      guessHistory: ['hello', 'yells', 'grate', 'slime', 'slate', 'slump', 'pluie', 'pesos'],
    });
    expect(feats).toEqual([{ id: 'dud', guess: 5 }]);
  });

  it('finds a Jackpot (real game)', () => {
    const feats = detectFeats({
      words: { es: 'tarde', fr: 'crise', en: 'wince' },
      guessHistory: ['black', 'weird'],
    });
    expect(feats).toEqual([{ id: 'jackpot', guess: 2, value: 9 }]);
  });

  it('finds So Close on a loss (real game)', () => {
    const feats = detectFeats({
      words: { es: 'arbol', fr: 'odeur', en: 'wails' },
      guessHistory: ['trash', 'douce', 'broma', 'arbol', 'odeur', 'sails', 'fling', 'jails'],
    });
    expect(feats).toEqual([{ id: 'soClose', guess: 8, lang: 'en' }]);
  });

  it('finds First Try and Two Birds when two boards share an answer', () => {
    const feats = detectFeats({
      words: { es: 'radio', en: 'radio', fr: 'pomme' },
      guessHistory: ['radio'],
    });
    // Ten new greens at once also counts as a Jackpot.
    expect(ids(feats)).toEqual(['firstTry', 'firstTry', 'twoBirds', 'jackpot']);
  });

  it('finds Hail Mary when no letters were known', () => {
    const feats = detectFeats({
      words: { en: 'jumpy', es: 'perro', fr: 'pomme' },
      guessHistory: ['stale', 'jumpy'],
    });
    expect(feats[0]).toEqual({ id: 'hailMary', guess: 2, lang: 'en', value: 0 });
  });

  it('finds Scrambled for five yellows', () => {
    const feats = detectFeats({
      words: { en: 'steal', es: 'perro', fr: 'pomme' },
      guessHistory: ['tales'],
    });
    expect(feats).toEqual([{ id: 'scrambled', guess: 1, lang: 'en' }]);
  });

  it('finds Underdog when the weakest language is solved first', () => {
    const game = {
      words: { fr: 'fleur', en: 'craps', es: 'dandi' } as const,
      guessHistory: ['think', 'spoil', 'fleur'],
    };
    expect(ids(detectFeats(game, { startLevels: { fr: -1, en: 3, es: 2 } }))).toContain('underdog');
    expect(ids(detectFeats(game))).not.toContain('underdog');
    expect(ids(detectFeats(game, { startLevels: { fr: 1, en: 2, es: 2 } }))).not.toContain(
      'underdog'
    );
    expect(ids(detectFeats(game, { startLevels: { fr: 0, en: 1, es: 1 } }))).not.toContain(
      'underdog'
    );
  });

  it('skips whole-game feats until the game is over', () => {
    const feats = detectFeats({
      words: { fr: 'fleur', en: 'craps', es: 'dandi' },
      guessHistory: ['think', 'spoil', 'dandi', 'fleur'],
    });
    expect(ids(feats)).toEqual(['outOfNowhere']);
  });
});
