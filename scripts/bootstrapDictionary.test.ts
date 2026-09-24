import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyRewriteAttemptOutcomes,
  extractFiveLetterSeeds,
  frequencyWordsUrl,
  isExhaustedRewriteAttempts,
  isValidDisplay,
  isValidPos,
  needsGeminiRewrite,
  normalizeKey,
  parseOptions,
  resolvePipelinePaths,
  validateGeminiBatch,
} from './bootstrapDictionary.mjs';

describe('bootstrap dictionary option validation', () => {
  it('accepts supported options including seed controls', () => {
    expect(
      parseOptions([
        '--lang=pt',
        '--step=filter',
        '--batch-size=20',
        '--max-passes=2',
        '--limit=200',
        '--freq-lang=pt_br',
        '--refresh-source',
        '--skip-filter',
        '--min-confidence=0.7',
        '--filter-concurrency=12',
        '--rewrite-limit=40',
        '--max-rewrite-attempts=2',
      ])
    ).toMatchObject({
      lang: 'pt',
      step: 'filter',
      batchSize: 20,
      maxRemediatePasses: 2,
      limit: 200,
      freqLang: 'pt_br',
      refreshSource: true,
      skipFilter: true,
      minConfidence: 0.7,
      filterConcurrency: 12,
      rewriteLimit: 40,
      maxRewriteAttempts: 2,
    });
  });

  it('defaults rewriteLimit to 80, maxRemediatePasses to 1, maxRewriteAttempts to 2', () => {
    expect(parseOptions(['--lang=it', '--step=remediate']).rewriteLimit).toBe(80);
    expect(parseOptions(['--lang=it', '--step=remediate']).maxRemediatePasses).toBe(1);
    expect(parseOptions(['--lang=it', '--step=remediate']).maxRewriteAttempts).toBe(2);
    expect(parseOptions(['--lang=it', '--step=remediate', '--rewrite-limit=0']).rewriteLimit).toBe(
      0
    );
    expect(parseOptions(['--lang=it', '--step=wave']).waveSize).toBe(80);
    expect(parseOptions(['--lang=it', '--step=wave', '--wave-size=40']).waveSize).toBe(40);
  });

  it('defaults freqLang to lang', () => {
    expect(parseOptions(['--lang=pt', '--step=seed']).freqLang).toBe('pt');
  });

  it.each(['PT', '../pt', 'p/t', 'p', 'por'])('rejects unsafe language code %s', (lang) => {
    expect(() => parseOptions([`--lang=${lang}`])).toThrow(/two lowercase letters/);
  });

  it('rejects unsupported pipeline steps', () => {
    expect(() => parseOptions(['--lang=pt', '--step=unknown'])).toThrow(/--step must be one of/);
  });

  it.each([
    ['--batch-size', '0'],
    ['--batch-size', '1.5'],
    ['--batch-size', '2items'],
    ['--max-passes', '-1'],
    ['--max-passes', '0'],
    ['--limit', '0'],
  ])('rejects invalid %s value %s', (option, value) => {
    expect(() => parseOptions(['--lang=pt', `${option}=${value}`])).toThrow(/positive integer/);
  });

  it('keeps generated paths inside their allowed directories', () => {
    const root = path.resolve('/tmp/bootstrap-test');
    const paths = resolvePipelinePaths(root, 'pt');

    expect(paths.dictPath).toBe(path.join(root, 'public', 'pt.json'));
    expect(paths.queuePath).toBe(path.join(root, 'evals', 'artifacts', 'review_queue_pt.json'));
    expect(paths.manualQueuePath).toBe(
      path.join(root, 'evals', 'artifacts', 'manual_review_pt.json')
    );
    expect(paths.wordsPath).toBe(path.join(root, 'data', 'pt_words.txt'));
    expect(() => resolvePipelinePaths(root, '../../escape')).toThrow(/escapes/);
  });
});

describe('anti-thrash rewrite attempts', () => {
  const flagged = {
    word: 'casa',
    definitionVerdict: 'wrong_meaning',
    formatVerdict: 'clean_dictionary',
    geminiRewriteAttempts: 0,
  };

  it('needsGeminiRewrite ignores difficulty-only and eval failures', () => {
    expect(needsGeminiRewrite(flagged)).toBe(true);
    expect(
      needsGeminiRewrite({
        ...flagged,
        definitionVerdict: 'accurate',
        formatVerdict: 'clean_dictionary',
      })
    ).toBe(false);
    expect(
      needsGeminiRewrite({
        ...flagged,
        definitionVerdict: 'inflected_form',
        formatVerdict: 'vague_circular',
      })
    ).toBe(true);
    expect(needsGeminiRewrite({ ...flagged, evaluationFailed: true })).toBe(false);
  });

  it('promotes after max failed rewrite cycles', () => {
    const { kept, promoted } = applyRewriteAttemptOutcomes({
      priorItems: [{ ...flagged, geminiRewriteAttempts: 1 }],
      remainingItems: [{ ...flagged, geminiRewriteAttempts: 1 }],
      rewrittenWords: ['casa'],
      maxAttempts: 2,
      now: '2026-01-01T00:00:00.000Z',
    });
    expect(kept).toHaveLength(0);
    expect(promoted).toHaveLength(1);
    expect(promoted[0].geminiRewriteAttempts).toBe(2);
    expect(promoted[0].manualReview).toBe(true);
    expect(isExhaustedRewriteAttempts(promoted[0], 2)).toBe(true);
  });

  it('keeps words under the attempt budget', () => {
    const { kept, promoted } = applyRewriteAttemptOutcomes({
      priorItems: [{ ...flagged, geminiRewriteAttempts: 0 }],
      remainingItems: [flagged],
      rewrittenWords: ['casa'],
      maxAttempts: 2,
    });
    expect(promoted).toHaveLength(0);
    expect(kept).toHaveLength(1);
    expect(kept[0].geminiRewriteAttempts).toBe(1);
  });
});

describe('FrequencyWords seed extraction', () => {
  const sample = `
muito 760484
estou 686473
fazer 686159
então 525000
você 495201
ação 100
nègre 1
muito 50
`.trim();

  it('builds the HermitDave OpenSubtitles URL', () => {
    expect(frequencyWordsUrl('pt')).toBe(
      'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/pt/pt_50k.txt'
    );
  });

  it('keeps 5-letter displays with 5-letter ASCII keys, in frequency order', () => {
    expect(extractFiveLetterSeeds(sample)).toEqual(['muito', 'estou', 'fazer', 'então']);
  });

  it('drops words whose accent-stripped key is not length 5', () => {
    expect(normalizeKey('você')).toBe('voce');
    expect(normalizeKey('ação')).toBe('acao');
    expect(extractFiveLetterSeeds(sample)).not.toContain('você');
    expect(extractFiveLetterSeeds(sample)).not.toContain('ação');
  });

  it('honors --limit and skips banned tokens', () => {
    expect(extractFiveLetterSeeds(sample, { limit: 2 })).toEqual(['muito', 'estou']);
    expect(extractFiveLetterSeeds(sample, { banned: new Set(['fazer']) })).not.toContain('fazer');
  });
});

describe('Gemini batch validation', () => {
  const chunk = [{ key: 'canto' }, { key: 'livro' }];

  it('accepts exactly one result for each requested key', () => {
    expect(() => validateGeminiBatch([{ key: 'livro' }, { key: 'canto' }], chunk)).not.toThrow();
  });

  it.each([
    [[{ key: 'canto' }], /missing: livro/],
    [[{ key: 'canto' }, { key: 'canto' }], /duplicate: canto/],
    [[{ key: 'canto' }, { key: 'livro' }, { key: 'extra' }], /unexpected: extra/],
  ])('rejects incomplete or mismatched results', (results, expectedError) => {
    expect(() => validateGeminiBatch(results, chunk)).toThrow(expectedError);
  });
});

describe('strict dictionary entry fields', () => {
  it('requires display strings with exactly five UTF-16 code units', () => {
    expect(isValidDisplay('óvulo')).toBe(true);
    expect(isValidDisplay('abcd')).toBe(false);
    expect(isValidDisplay('abcd😀')).toBe(false);
    expect(isValidDisplay(12345)).toBe(false);
  });

  it('allows documented POS tags including prep/contraction and legacy compounds', () => {
    for (const pos of [
      'noun',
      'verb',
      'adj',
      'adv',
      'pron',
      'intj',
      'num',
      'prep',
      'contraction',
      'noun/verb',
    ]) {
      expect(isValidPos(pos)).toBe(true);
    }
    expect(isValidPos('compound')).toBe(false);
    expect(isValidPos('garbage')).toBe(false);
  });
});
