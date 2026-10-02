import { describe, expect, it } from 'vitest';
import { buildShareText } from './shareUtils';

const URL = 'https://polyglot-wordle.web.app/game/en-es-fr/abc?challenger=user123';

describe('buildShareText', () => {
  it('is alphabetical flags with the score, the prompt, then the link', () => {
    const text = buildShareText({
      gameSession: {
        words: { en: 'apple', es: 'queso', fr: 'fruit' },
        shuffledLanguages: ['fr', 'en', 'es'],
        score: 420,
      },
      challengeUrl: URL,
    });
    expect(text).toBe(`🇬🇧 🇪🇸 🇫🇷 • 420 pts\nCan you beat me?\n${URL}`);
  });

  it('lists every language in extended games', () => {
    const text = buildShareText({
      gameSession: {
        words: { en: 'apple', es: 'queso', fr: 'fruit', it: 'pasta', pt: 'praia' },
        shuffledLanguages: ['pt', 'en', 'it', 'fr', 'es'],
        score: 0,
      },
      challengeUrl: URL,
    });
    expect(text.split('\n')[0]).toBe('🇬🇧 🇪🇸 🇫🇷 🇮🇹 🇵🇹 • 0 pts');
  });
});
