import { describe, expect, it } from 'vitest';
import { Language } from '@/types/firestore';
import { deduceColumnLanguages } from './deductionUtils';
import { Dictionary } from './wordUtils';

describe('deduceColumnLanguages', () => {
  const mockDictionaries: Record<Language, Dictionary> = {
    en: {
      apple: { display: 'apple', d: 0.1, pos: 'noun', def: 'A fruit.' },
      fruit: { display: 'fruit', d: 0.1, pos: 'noun', def: 'Produce.' },
    },
    es: {
      queso: { display: 'queso', d: 0.1, pos: 'noun', def: 'Cheese.' },
      fruit: { display: 'fruit', d: 0.1, pos: 'noun', def: 'Fruta.' },
    },
    fr: {
      pomme: { display: 'pomme', d: 0.1, pos: 'noun', def: 'Apple.' },
      fruit: { display: 'fruit', d: 0.1, pos: 'noun', def: 'Fruit.' },
    },
  };

  const shuffledLangs: Language[] = ['fr', 'en', 'es'];

  it('starts with all 3 candidate languages for every column when no guesses are made', () => {
    const result = deduceColumnLanguages([], shuffledLangs, mockDictionaries);
    expect(result.candidates[0]).toEqual(['en', 'es', 'fr']);
    expect(result.candidates[1]).toEqual(['en', 'es', 'fr']);
    expect(result.candidates[2]).toEqual(['en', 'es', 'fr']);
    expect(result.isConfirmed[0]).toBe(false);
  });

  it('deduces column language uniquely when a unique word is submitted', () => {
    // "apple" is only in English
    const result = deduceColumnLanguages(['apple'], shuffledLangs, mockDictionaries);

    // Column 1 is English (shuffledLangs[1] === 'en')
    expect(result.candidates[1]).toEqual(['en']);
    expect(result.isConfirmed[1]).toBe(true);

    // English should be removed from Col 0 and Col 2
    expect(result.candidates[0]).not.toContain('en');
    expect(result.candidates[2]).not.toContain('en');
  });

  it('fully deduces all 3 columns when unique words for multiple languages are submitted', () => {
    // "apple" is EN, "queso" is ES
    const result = deduceColumnLanguages(['apple', 'queso'], shuffledLangs, mockDictionaries);

    expect(result.candidates[0]).toEqual(['fr']);
    expect(result.candidates[1]).toEqual(['en']);
    expect(result.candidates[2]).toEqual(['es']);
    expect(result.isConfirmed[0]).toBe(true);
    expect(result.isConfirmed[1]).toBe(true);
    expect(result.isConfirmed[2]).toBe(true);
  });
});
