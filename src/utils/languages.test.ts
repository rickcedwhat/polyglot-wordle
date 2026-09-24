import { describe, expect, it } from 'vitest';
import { buildGameId, decodeLanguagesFromUuid, difficultyFromHex, isV2GameId } from './languages';

describe('languages UUID helpers', () => {
  it('builds and decodes a v2 game id with it/pt', () => {
    const id = buildGameId({
      entropy24: 'a'.repeat(24),
      languages: ['en', 'it', 'pt'],
      difficulties: ['basic', 'intermediate', 'advanced'],
      seedNibble: '7',
    });
    expect(id).toHaveLength(32);
    expect(isV2GameId(id)).toBe(true);
    expect(decodeLanguagesFromUuid(id)).toEqual(['en', 'it', 'pt']);
    expect(difficultyFromHex(id[24])).toBe('basic');
    expect(difficultyFromHex(id[25])).toBe('intermediate');
    expect(difficultyFromHex(id[26])).toBe('advanced');
  });

  it('falls back to en/es/fr for legacy ids', () => {
    const legacy = `${'b'.repeat(24)}05a01234`;
    expect(isV2GameId(legacy)).toBe(false);
    expect(decodeLanguagesFromUuid(legacy)).toEqual(['en', 'es', 'fr']);
  });
});
