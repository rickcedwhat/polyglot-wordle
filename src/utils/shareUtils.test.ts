import { describe, expect, it } from 'vitest';
import { buildShareText, ShareTextOptions } from './shareUtils';

const URL = 'https://polyglot-wordle.web.app/game/en-es-fr/abc?challenger=user123';

const game = (
  overrides: Partial<ShareTextOptions['gameSession']> = {}
): ShareTextOptions['gameSession'] => ({
  words: { en: 'apple', es: 'queso', fr: 'fruit' },
  shuffledLanguages: ['fr', 'en', 'es'],
  guessHistory: ['arise', 'apple', 'queso', 'fruit'],
  score: 420,
  ...overrides,
});

const lines = (gameSession = game()) =>
  buildShareText({ gameSession, challengeUrl: URL }).split('\n');

describe('buildShareText', () => {
  it('has a header, alphabetical flags, 8 grid rows, then the prompt and link', () => {
    const out = lines();
    expect(out).toHaveLength(12);
    expect(out[0]).toBe('Polyglot Wordle • 420 pts');
    expect(out[1]).toBe('🇬🇧 🇪🇸 🇫🇷');
    expect(out[10]).toBe('Can you beat me?');
    expect(out[11]).toBe(URL);
  });

  it('lays boards out in board order with a gutter, padding every board to 8 rows', () => {
    const grid = lines().slice(2, 10);
    // Board order is fr, en, es; fr is solved last (turn 4), en on turn 2, es on turn 3.
    expect(grid[1]).toBe('⬜⬜⬜⬜⬜  🟩🟩🟩🟩🟩  ⬜⬜⬜⬜🟨');
    expect(grid[3]).toBe('🟩🟩🟩🟩🟩  ⬛⬛⬛⬛⬛  ⬛⬛⬛⬛⬛');
    for (const row of grid.slice(4)) {
      expect(row).toBe('⬛⬛⬛⬛⬛  ⬛⬛⬛⬛⬛  ⬛⬛⬛⬛⬛');
    }
  });

  it('never names a language next to a board', () => {
    const grid = lines().slice(2, 10).join('\n');
    expect(grid).not.toMatch(/🇬🇧|🇪🇸|🇫🇷|\ben\b|\bes\b|\bfr\b/i);
  });

  it('matches guesses case-insensitively against the solution', () => {
    const grid = lines(game({ words: { en: 'Apple', es: 'queso', fr: 'fruit' } })).slice(2, 10);
    expect(grid[1].split('  ')[1]).toBe('🟩🟩🟩🟩🟩');
    expect(grid[2].split('  ')[1]).toBe('⬛⬛⬛⬛⬛');
  });

  it('shows every guess on boards that were never solved', () => {
    const guessHistory = ['guess', 'arise', 'table', 'chair', 'plant', 'water', 'flame', 'earth'];
    const grid = lines(game({ guessHistory, score: 80 })).slice(2, 10);
    for (const row of grid) {
      expect(row).not.toContain('⬛');
    }
  });

  it('handles extended games with more boards', () => {
    const out = lines(
      game({
        words: { en: 'apple', es: 'queso', fr: 'fruit', it: 'pasta', pt: 'praia' },
        shuffledLanguages: ['pt', 'en', 'it', 'fr', 'es'],
      })
    );
    expect(out[1]).toBe('🇬🇧 🇪🇸 🇫🇷 🇮🇹 🇵🇹');
    expect(out[2].split('  ')).toHaveLength(5);
  });
});
