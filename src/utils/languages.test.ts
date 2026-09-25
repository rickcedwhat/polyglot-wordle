import { describe, expect, it } from 'vitest';
import {
  buildGameId,
  decodeLanguagesFromUuid,
  difficultyFromHex,
  formatLangCombo,
  gamePath,
  isGameId,
  isLangComboSegment,
  isV2GameId,
  parseLangCombo,
} from './languages';

describe('languages UUID helpers', () => {
  it('builds and decodes a v2 game id with it/pt', () => {
    const id = buildGameId({
      entropy24: 'a'.repeat(24),
      languages: ['en', 'it', 'pt'],
      difficulties: ['basic', 'intermediate', 'advanced'],
      seedNibble: '7',
    });
    expect(id).toHaveLength(32);
    expect(id.endsWith('v')).toBe(true);
    expect(isV2GameId(id)).toBe(true);
    expect(isGameId(id)).toBe(true);
    expect(decodeLanguagesFromUuid(id)).toEqual(['en', 'it', 'pt']);
    expect(difficultyFromHex(id[24])).toBe('basic');
    expect(difficultyFromHex(id[25])).toBe('intermediate');
    expect(difficultyFromHex(id[26])).toBe('advanced');
  });

  it('falls back to en/es/fr for legacy ids', () => {
    const legacy = `${'b'.repeat(24)}05a7012a`;
    expect(isV2GameId(legacy)).toBe(false);
    expect(isGameId(legacy)).toBe(true);
    expect(decodeLanguagesFromUuid(legacy)).toEqual(['en', 'es', 'fr']);
  });
});

describe('language path helpers', () => {
  it('formats and parses language combo segments', () => {
    expect(formatLangCombo(['en', 'it', 'pt'])).toBe('en-it-pt');
    expect(parseLangCombo('en-it-pt')).toEqual(['en', 'it', 'pt']);
    expect(parseLangCombo('EN-IT-PT')).toEqual(['en', 'it', 'pt']);
    expect(parseLangCombo('en-it')).toBeNull();
    expect(parseLangCombo('en-en-it')).toBeNull();
    expect(parseLangCombo('en-it-de')).toBeNull();
    expect(isLangComboSegment('en-es-fr')).toBe(true);
    expect(isLangComboSegment('not-a-combo')).toBe(false);
  });

  it('builds path URLs with optional challenger query', () => {
    const id = buildGameId({
      entropy24: 'c'.repeat(24),
      languages: ['es', 'fr', 'it'],
      difficulties: ['basic', 'basic', 'basic'],
      seedNibble: '1',
    });
    expect(gamePath(id, ['es', 'fr', 'it'])).toBe(`/game/es-fr-it/${id}`);
    expect(gamePath(id)).toBe(`/game/es-fr-it/${id}`);
    expect(gamePath(id, ['es', 'fr', 'it'], { challenger: 'uid1' })).toBe(
      `/game/es-fr-it/${id}?challenger=uid1`
    );
    const legacy = `${'d'.repeat(24)}05a01234`;
    expect(gamePath(legacy)).toBe(`/game/${legacy}`);
  });
});
