import { describe, expect, it } from 'vitest';
import { buildGameLines } from './ScorePopups';

describe('buildGameLines', () => {
  it('shows crack and hat-trick bonuses as game-level lines', () => {
    const lines = buildGameLines([
      { kind: 'green', points: 50, lang: 'en', index: 0 },
      { kind: 'crack', points: 300 },
      { kind: 'hatTrick', points: 75 },
    ]);
    expect(lines).toEqual([
      { id: 'crack', points: 300, label: 'First word cracked!', tone: 'solved' },
      { id: 'hatTrick', points: 75, label: 'Hat trick!', tone: 'green' },
    ]);
  });

  it("labels an unsolved-board penalty with the player's flag", () => {
    const lines = buildGameLines([{ kind: 'penalty', points: -100, lang: 'fr' }], () => '🥐');
    expect(lines).toEqual([
      { id: 'penalty-fr', points: -100, label: '🥐 French unsolved', tone: 'penalty' },
    ]);
  });
});
