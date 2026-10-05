import { describe, expect, it } from 'vitest';
import type { Language } from '@/types/firestore';
import type { Dictionary } from '@/utils/wordUtils';
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
    // SLATE also drops the M that SLIME had already turned green on English.
    expect(feats).toEqual([
      { id: 'dud', guess: 5 },
      { id: 'noInstructions', guess: 5, value: 3 },
    ]);
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

  it('finds the per-language First Try and Two Birds when two boards share an answer', () => {
    const feats = detectFeats({
      words: { es: 'radio', en: 'radio', fr: 'pomme' },
      guessHistory: ['radio'],
    });
    // Ten new greens at once also counts as a Jackpot.
    expect(ids(feats)).toEqual(['aLaPrimera', 'holeInOne', 'twoBirds', 'jackpot']);
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

  it('finds Chapeau for a French answer with a circumflex', () => {
    const feats = detectFeats({
      words: { fr: 'boîte', en: 'plant', es: 'perro' },
      guessHistory: ['boite'],
    });
    expect(feats).toEqual(
      expect.arrayContaining([
        { id: 'duPremierCoup', guess: 1, lang: 'fr' },
        { id: 'chapeau', guess: 1, lang: 'fr' },
      ])
    );
  });

  it('finds Piñata for a Spanish answer with an ñ', () => {
    const feats = detectFeats({
      words: { es: 'pañal', en: 'plant', fr: 'pomme' },
      guessHistory: ['stare', 'panal'],
    });
    expect(feats).toContainEqual({ id: 'pinata', guess: 2, lang: 'es' });
  });

  it('finds Bravery on the guess that plays the third of Q, W, X, Y, Z', () => {
    const feats = detectFeats({
      words: { en: 'plant', es: 'perro', fr: 'pomme' },
      guessHistory: ['waxes', 'stale', 'fuzzy', 'jazzy'],
    });
    expect(feats.filter((f) => f.id === 'bravery')).toEqual([
      { id: 'bravery', guess: 3, value: 4 },
    ]);
  });

  describe('language ambiguity', () => {
    const dict = (...words: string[]) =>
      Object.fromEntries(
        words.map((w) => [w, { display: w, d: 0.3, pos: 'noun', def: '' }])
      ) as Dictionary;
    // BALSA and TENUE are words in both Spanish and Portuguese, so those boards stay ambiguous.
    const dictionaries: Partial<Record<Language, Dictionary>> = {
      en: dict('plant'),
      es: dict('balsa', 'tenue'),
      pt: dict('balsa', 'tenue'),
    };
    const game = {
      words: { es: 'balsa', pt: 'tenue', en: 'plant' },
      shuffledLanguages: ['es', 'pt', 'en'] as Language[],
      guessHistory: ['plant', 'balsa', 'tenue'],
    };

    it('finds Lost in Translation and Je ne sais quoi', () => {
      const feats = detectFeats(game, { dictionaries });
      expect(feats).toEqual(
        expect.arrayContaining([
          { id: 'lostInTranslation', guess: 2, lang: 'es' },
          { id: 'lostInTranslation', guess: 3, lang: 'pt' },
          { id: 'jeNeSaisQuoi', guess: 3, value: 2 },
        ])
      );
      expect(feats.find((f) => f.id === 'lostInTranslation' && f.lang === 'en')).toBeUndefined();
    });

    it('skips them once a guess unique to one language confirms the boards', () => {
      const feats = detectFeats(
        { ...game, guessHistory: ['plant', 'llama', 'balsa', 'tenue'] },
        { dictionaries: { ...dictionaries, es: dict('balsa', 'tenue', 'llama') } }
      );
      expect(ids(feats)).not.toContain('lostInTranslation');
      expect(ids(feats)).not.toContain('jeNeSaisQuoi');
    });

    it('skips them without dictionaries', () => {
      expect(ids(detectFeats(game))).not.toContain('lostInTranslation');
    });
  });

  it('finds No Instructions For Me and WTF Are You Doing (real game)', () => {
    const feats = detectFeats({
      words: { pt: 'menti', en: 'emery', es: 'rubia' },
      guessHistory: ['water', 'hater', 'later', 'miner', 'menos', 'mente', 'menti', 'merge'],
    });
    // HATER and LATER keep T, E and R in spots already marked yellow; MINER reuses R after it
    // was ruled out on Portuguese; MERGE reuses M where English already marked it yellow.
    expect(feats.filter((f) => f.id === 'noInstructions' || f.id === 'wtf')).toEqual([
      { id: 'noInstructions', guess: 4, value: 3 },
      { id: 'wtf', guess: 8, value: 4 },
    ]);
  });

  it('does not count guesses that follow the tiles on at least one board', () => {
    const feats = detectFeats({
      words: { fr: 'fleur', en: 'craps', es: 'dandi' },
      guessHistory: ['think', 'spoil', 'dandi', 'fleur', 'craps'],
    });
    expect(ids(feats)).not.toContain('noInstructions');
  });
});
