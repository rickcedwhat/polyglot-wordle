import { describe, expect, it, vi } from 'vitest';
import { buildGameId } from './languages';
import * as wordUtils from './wordUtils';

const { calculateScoreFromHistory } = wordUtils;

describe('getWordsFromUuid', () => {
  it('derives a word and difficulty for all five encoded languages', async () => {
    const languages = ['pt', 'it', 'fr', 'es', 'en'] as const;
    const id = buildGameId({
      entropyHex: '0000000100000000000000010000000000000001',
      languages: [...languages],
      difficulties: ['basic', 'intermediate', 'advanced', 'basic', 'intermediate'],
      seedNibble: '7',
    });
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        first: { d: 0.1 },
        second: { d: 0.1 },
      }),
    }));
    vi.stubGlobal('fetch', fetchMock);
    try {
      const result = await wordUtils.getWordsFromUuid(id);
      expect(result.words).toEqual({
        pt: 'second',
        it: 'first',
        fr: 'second',
        es: 'first',
        en: 'second',
      });
      expect(result.difficulties).toEqual({
        pt: 'basic',
        it: 'intermediate',
        fr: 'advanced',
        es: 'basic',
        en: 'intermediate',
      });
      expect(result.shuffledLanguages).toHaveLength(5);
      expect(new Set(result.shuffledLanguages)).toEqual(new Set(languages));
      expect(fetchMock).toHaveBeenCalledTimes(5);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('calculateScoreFromHistory (v1)', () => {
  const mockSolution = {
    en: 'apple',
    es: 'queso',
    fr: 'fruit',
  };

  it('calculates a perfect score for a quick win', () => {
    const guesses = ['apple', 'queso', 'fruit'];

    const score = calculateScoreFromHistory(guesses, mockSolution, 1);

    // Base Score: 250 + 5 + 0 + 225 + 5 + 200 = 685
    // Word Solved: 200 + 180 + 160 = 540
    // Game Won: 200
    // Total: 685 + 440 + 200 = 1325
    expect(score).toBe(1425);
  });

  // New Test 2: Penalties for Loss
  it('applies penalties for an unsolved game', () => {
    const guesses = [
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'xxxxx',
      'apple', // 10 guesses
    ];

    const score = calculateScoreFromHistory(guesses, mockSolution, 1);

    // Turns 1-9: 0 points
    // Turn 10 (apple):
    // Green Bonus: 5 letters * (5 * (11-10)) = 25
    // Yellow Bonus: 1 letter * 5 = 5
    // Word Solved Bonus: 20 * (11-10) = 20
    // Penalties for loss: -250 (ES) -250 (FR) = -500
    // Total: 25 + 5 + 20 - 500 = -450
    expect(score).toBe(-450);
  });

  it('never awards crack or hat-trick bonuses', () => {
    const events = [1, 2, 3].flatMap((n) =>
      wordUtils.getLatestTurnScoreEvents(['audit', 'apple', 'queso'].slice(0, n), mockSolution, 1)
    );
    expect(events.some((e) => e.kind === 'crack' || e.kind === 'hatTrick')).toBe(false);
  });
});

describe('calculateScoreFromHistory (v2)', () => {
  const mockSolution = { en: 'apple', es: 'queso', fr: 'fruit' };
  const turnEvents = (history: string[]) =>
    wordUtils.getLatestTurnScoreEvents(history, mockSolution, 2);

  it('is the default for new scoring', () => {
    const guesses = ['apple', 'queso', 'fruit'];
    expect(calculateScoreFromHistory(guesses, mockSolution)).toBe(
      calculateScoreFromHistory(guesses, mockSolution, 2)
    );
  });

  it('calculates a quick win', () => {
    // Guess 1 (m=10) apple: EN greens 250 + ES yellow "e" 2×10 + EN solved 200 + crack 300 = 770
    // Guess 2 (m=9) queso: ES greens 225 + ES solved 180 + FR yellow "u" 2×9 = 423
    // Guess 3 (m=8) fruit: FR greens 200 + FR solved 160 = 360
    // All solved on guess 3: 25×8 = 200
    expect(calculateScoreFromHistory(['apple', 'queso', 'fruit'], mockSolution, 2)).toBe(1753);
  });

  it('scores a yellow letter only the first time it appears on a board', () => {
    const enYellows = (history: string[]) =>
      turnEvents(history).filter((e) => e.lang === 'en' && e.kind === 'yellow');
    expect(enYellows(['plead'])).toHaveLength(4);
    expect(enYellows(['plead']).every((e) => e.points === 20)).toBe(true);
    expect(enYellows(['plead', 'leapt'])).toHaveLength(0);
  });

  it('awards the crack bonus once, on the first solve', () => {
    expect(turnEvents(['apple'])).toContainEqual({ kind: 'crack', points: 300 });
    expect(turnEvents(['apple', 'queso']).some((e) => e.kind === 'crack')).toBe(false);
  });

  it('awards a hat trick when one guess adds new greens on every open board', () => {
    expect(turnEvents(['audit'])).toContainEqual({ kind: 'hatTrick', points: 75 });
  });

  it('does not award a hat trick once any board is solved', () => {
    expect(turnEvents(['apple', 'audit']).some((e) => e.kind === 'hatTrick')).toBe(false);
  });

  it('does not award a hat trick when a board gets no new greens', () => {
    expect(turnEvents(['audit', 'auxit']).some((e) => e.kind === 'hatTrick')).toBe(false);
  });
});

describe('scoringVersionOf', () => {
  it('treats games without a version as v1', () => {
    expect(wordUtils.scoringVersionOf({})).toBe(1);
    expect(wordUtils.scoringVersionOf({ scoringVersion: 2 })).toBe(2);
  });
});

describe('getLatestTurnScoreEvents', () => {
  const mockSolution = {
    en: 'apple',
    es: 'queso',
    fr: 'fruit',
  };

  it('returns no events for an empty history', () => {
    expect(wordUtils.getLatestTurnScoreEvents([], mockSolution)).toEqual([]);
  });

  it.each([1, 2])('sums to the score delta of each guess under v%i', (version) => {
    const histories = [
      ['apple', 'queso', 'fruit'],
      ['xxxxx', 'xxxxx', 'xxxxx', 'xxxxx', 'xxxxx', 'xxxxx', 'xxxxx', 'apple'],
      ['plead', 'apply', 'quest', 'fruit'],
      ['audit', 'plead', 'apple', 'queso', 'fruit'],
    ];
    histories.forEach((history) => {
      history.forEach((_, index) => {
        const prefix = history.slice(0, index + 1);
        const delta =
          calculateScoreFromHistory(prefix, mockSolution, version) -
          calculateScoreFromHistory(prefix.slice(0, -1), mockSolution, version);
        const eventSum = wordUtils
          .getLatestTurnScoreEvents(prefix, mockSolution, version)
          .reduce((sum, event) => sum + event.points, 0);
        expect(eventSum).toBe(delta);
      });
    });
  });

  it('keeps a board open for its solving guess after every slot is already green', () => {
    // "sudan" then "dings" fill every slot of "sudas" before the word itself is typed.
    const solution = { en: 'dings', fr: 'douee', es: 'sudas' };
    const events = wordUtils.getLatestTurnScoreEvents(
      ['stray', 'music', 'sudan', 'fudge', 'dings', 'sudas'],
      solution,
      1
    );
    expect(events).toContainEqual({ kind: 'wordSolved', points: 100, lang: 'es' });
  });

  it('records the letter position of green and yellow events', () => {
    const enEvents = (guess: string) =>
      wordUtils.getLatestTurnScoreEvents([guess], mockSolution, 1).filter((e) => e.lang === 'en');
    expect(
      enEvents('apply')
        .filter((e) => e.kind === 'green')
        .map((e) => e.index)
    ).toEqual([0, 1, 2, 3]);
    expect(
      enEvents('plead')
        .filter((e) => e.kind === 'yellow')
        .map((e) => e.index)
    ).toEqual([0, 1, 2, 3]);
  });

  it('tags word-solved and game-solved events', () => {
    const events = wordUtils.getLatestTurnScoreEvents(['apple', 'queso', 'fruit'], mockSolution);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'wordSolved', lang: 'fr' }));
    expect(events.at(-1)?.kind).toBe('gameSolved');
  });

  it('emits a penalty per unsolved language on the final guess', () => {
    const history = Array(8).fill('xxxxx');
    const events = wordUtils.getLatestTurnScoreEvents(history, mockSolution);
    expect(events.filter((e) => e.kind === 'penalty').map((e) => e.lang)).toEqual([
      'en',
      'es',
      'fr',
    ]);
  });
});

describe('splitDefinition', () => {
  it('correctly splits definitions with trailing parenthetical inflection notes', () => {
    const res = wordUtils.splitDefinition(
      'Slows down, stops, or applies the brakes to a vehicle or action (present tense of frenar).'
    );
    expect(res.main).toBe('Slows down, stops, or applies the brakes to a vehicle or action.');
    expect(res.note).toBe('present tense of frenar');
  });

  it('handles definitions without parentheticals', () => {
    const res = wordUtils.splitDefinition('The superior or head of an abbey or monastery.');
    expect(res.main).toBe('The superior or head of an abbey or monastery.');
    expect(res.note).toBeUndefined();
  });

  it('handles empty or blank input', () => {
    const res = wordUtils.splitDefinition('');
    expect(res.main).toBe('');
    expect(res.note).toBeUndefined();
  });
});

describe('validateGuess', () => {
  const masterPools = {
    en: ['apple', 'table', 'chair'],
    es: ['queso', 'playa', 'arbol'],
    fr: ['fruit', 'chien', 'monde'],
  };

  const solution = {
    en: 'apple',
    es: 'ghost', // 'ghost' is an inherited Spanish solution NOT in masterPools.es, en, or fr
    fr: 'fruit',
  };

  it('accepts valid words found in the master dictionary in solo mode', () => {
    const res = wordUtils.validateGuess({
      guess: 'table',
      masterPools,
      solution,
      isChallenge: false,
    });
    expect(res.isValid).toBe(true);
    expect(res.matchedLangs).toEqual(['en']);
    expect(res.solutionLangs).toEqual([]);
  });

  it('rejects words missing from the master dictionary in solo mode', () => {
    const res = wordUtils.validateGuess({
      guess: 'ghost',
      masterPools,
      solution,
      isChallenge: false,
    });
    expect(res.isValid).toBe(false);
    expect(res.matchedLangs).toEqual([]);
    expect(res.solutionLangs).toEqual([]);
  });

  it('accepts inherited challenge solution words even when missing from master dictionary', () => {
    const res = wordUtils.validateGuess({
      guess: 'ghost',
      masterPools,
      solution,
      isChallenge: true,
    });
    expect(res.isValid).toBe(true);
    expect(res.matchedLangs).toEqual(['es']);
    expect(res.solutionLangs).toEqual(['es']);
  });

  it('rejects duplicate guesses even if the word is an inherited solution', () => {
    const res = wordUtils.validateGuess({
      guess: 'ghost',
      masterPools,
      solution,
      isChallenge: true,
      previousGuesses: ['ghost'],
    });
    expect(res.isValid).toBe(false);
  });

  it('rejects guesses that are not 5 characters long', () => {
    expect(
      wordUtils.validateGuess({
        guess: 'cat',
        masterPools,
        solution,
        isChallenge: true,
      }).isValid
    ).toBe(false);

    expect(
      wordUtils.validateGuess({
        guess: 'bananas',
        masterPools,
        solution,
        isChallenge: true,
      }).isValid
    ).toBe(false);
  });

  it('handles accent normalization for inherited solution validation', () => {
    const accentedSolution = {
      en: 'apple',
      es: 'arbol', // in Spanish masterPools as 'arbol'
      fr: 'revee', // missing from fr masterPools
    };

    const res = wordUtils.validateGuess({
      guess: 'rêvée',
      masterPools,
      solution: accentedSolution,
      isChallenge: true,
    });
    expect(res.isValid).toBe(true);
    expect(res.matchedLangs).toEqual(['fr']);
    expect(res.solutionLangs).toEqual(['fr']);
  });
});
