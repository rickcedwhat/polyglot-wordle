import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildReviewDoc, buildReviewIndex, REVIEW_LANGUAGES } from './reviewDoc';

describe('translation review pages', () => {
  it.each(Object.keys(REVIEW_LANGUAGES) as (keyof typeof REVIEW_LANGUAGES)[])(
    'docs/translations/%s.md is up to date (run npm run i18n:review)',
    (lang) => {
      expect(readFileSync(`docs/translations/${lang}.md`, 'utf8')).toBe(buildReviewDoc(lang));
    }
  );

  it('docs/translations/README.md is up to date (run npm run i18n:review)', () => {
    expect(readFileSync('docs/translations/README.md', 'utf8')).toBe(buildReviewIndex());
  });
});
