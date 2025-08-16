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
