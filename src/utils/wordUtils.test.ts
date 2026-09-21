import { describe, expect, it } from 'vitest';
import * as wordUtils from './wordUtils';

const { calculateScoreFromHistory } = wordUtils;

describe('calculateScoreFromHistory', () => {
  const mockSolution = {
    en: 'apple',
    es: 'queso',
    fr: 'fruit',
  };

  it('calculates a perfect score for a quick win', () => {
    const guesses = ['apple', 'queso', 'fruit'];

    const score = calculateScoreFromHistory(guesses, mockSolution);

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

    const score = calculateScoreFromHistory(guesses, mockSolution);

    // Turns 1-9: 0 points
    // Turn 10 (apple):
    // Green Bonus: 5 letters * (5 * (11-10)) = 25
    // Yellow Bonus: 1 letter * 5 = 5
    // Word Solved Bonus: 20 * (11-10) = 20
    // Penalties for loss: -250 (ES) -250 (FR) = -500
    // Total: 25 + 5 + 20 - 500 = -450
    expect(score).toBe(-450);
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
