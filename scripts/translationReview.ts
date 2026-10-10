// Regenerates docs/translations/*.md from the locale files.
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildReviewDoc, buildReviewIndex, REVIEW_LANGUAGES } from '../src/i18n/reviewDoc';

const dir = 'docs/translations';
mkdirSync(dir, { recursive: true });
writeFileSync(`${dir}/README.md`, buildReviewIndex());
for (const lang of Object.keys(REVIEW_LANGUAGES) as (keyof typeof REVIEW_LANGUAGES)[]) {
  writeFileSync(`${dir}/${lang}.md`, buildReviewDoc(lang));
}
console.log(`Wrote ${dir}/`);
