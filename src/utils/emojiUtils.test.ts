import { describe, expect, it } from 'vitest';
import { extractSingleEmoji, isValidEmoji } from './emojiUtils';

describe('emojiUtils', () => {
  it('extracts single flag emojis correctly', () => {
    expect(extractSingleEmoji('🇬🇧')).toBe('🇬🇧');
    expect(extractSingleEmoji('🇪🇸')).toBe('🇪🇸');
    expect(extractSingleEmoji('🇫🇷')).toBe('🇫🇷');
    expect(extractSingleEmoji('🇨🇦')).toBe('🇨🇦');
  });

  it('extracts single general emojis correctly', () => {
    expect(extractSingleEmoji('🌮')).toBe('🌮');
    expect(extractSingleEmoji('🦁')).toBe('🦁');
    expect(extractSingleEmoji('👑')).toBe('👑');
    expect(extractSingleEmoji('🔥')).toBe('🔥');
  });

  it('returns null for non-emoji text', () => {
    expect(extractSingleEmoji('hello')).toBe(null);
    expect(extractSingleEmoji('abc')).toBe(null);
    expect(extractSingleEmoji('123')).toBe(null);
    expect(extractSingleEmoji('')).toBe(null);
  });

  it('restricts input to a single emoji when multiple emojis are provided', () => {
    expect(extractSingleEmoji('🇬🇧🇺🇸')).toBe('🇺🇸');
    expect(extractSingleEmoji('🌮🔥')).toBe('🔥');
  });

  it('validates single emojis correctly', () => {
    expect(isValidEmoji('🇬🇧')).toBe(true);
    expect(isValidEmoji('🌮')).toBe(true);
    expect(isValidEmoji('abc')).toBe(false);
    expect(isValidEmoji('')).toBe(false);
  });
});
