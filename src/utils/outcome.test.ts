import { describe, expect, it } from 'vitest';
import { marginLabel, outcomeOf } from './outcome';

describe('outcome', () => {
  it('labels wins, losses and ties with the margin', () => {
    expect(marginLabel(1366, 17)).toBe('Won by 1,349');
    expect(marginLabel(17, 1366)).toBe('Lost by 1,349');
    expect(marginLabel(500, 500)).toBe('Tied');
  });

  it('classifies the outcome', () => {
    expect(outcomeOf(2, 1)).toBe('won');
    expect(outcomeOf(1, 2)).toBe('lost');
    expect(outcomeOf(1, 1)).toBe('tied');
  });
});
