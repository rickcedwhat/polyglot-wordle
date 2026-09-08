import { describe, expect, it } from 'vitest';
import enDict from '../../public/en.json';
import esDict from '../../public/es.json';
import frDict from '../../public/fr.json';

describe('Dictionary validation test suite', () => {
  const dictionaries = [
    { lang: 'en', data: enDict },
    { lang: 'es', data: esDict },
    { lang: 'fr', data: frDict },
  ];

  dictionaries.forEach(({ lang, data }) => {
    describe(`Language: ${lang}`, () => {
      it(`has a healthy volume of 5-letter words (> 2,000 entries)`, () => {
        const count = Object.keys(data).length;
        expect(count).toBeGreaterThan(2000);
      });

      it(`validates that 100% of entries meet strict dictionary criteria`, () => {
        for (const [key, entry] of Object.entries(data)) {
          // Key must be exactly 5 ASCII lowercase letters
          expect(key).toHaveLength(5);
          expect(key).toMatch(/^[a-z]{5}$/);

          // Entry must have display
          expect(entry.display).toBeDefined();
          expect(typeof entry.display).toBe('string');
          expect(entry.display.length).toBeGreaterThanOrEqual(5);

          // Entry must have valid difficulty between 0.05 and 0.95
          expect(entry.d).toBeGreaterThanOrEqual(0.05);
          expect(entry.d).toBeLessThanOrEqual(0.95);

          // Entry must have part of speech
          expect(entry.pos).toBeDefined();
          expect(typeof entry.pos).toBe('string');
          expect(entry.pos.length).toBeGreaterThan(0);

          // Definition must have at least 4 words
          expect(entry.def).toBeDefined();
          const wordCount = entry.def.trim().split(/\s+/).length;
          expect(wordCount).toBeGreaterThanOrEqual(4);

          // Zero placeholder or boilerplate phrases allowed
          const lowerDef = entry.def.toLowerCase();
          expect(lowerDef).not.toContain('vocabulary term denoting');
          expect(lowerDef).not.toContain('recognized english term');
          expect(lowerDef).not.toContain('established english word');
          expect(lowerDef).not.toContain('five letter');
          expect(lowerDef).not.toContain('common parlance');
          expect(lowerDef).not.toContain('standard usage');
          expect(lowerDef).not.toContain('not found in this dictionary');

          // Must be reviewed and verified
          expect((entry as any).reviewed).toBe(true);
        }
      });
    });
  });
});
