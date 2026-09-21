import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  isValidDisplay,
  isValidPos,
  parseOptions,
  resolvePipelinePaths,
  validateGeminiBatch,
} from './bootstrapDictionary.mjs';

describe('bootstrap dictionary option validation', () => {
  it('accepts supported options', () => {
    expect(
      parseOptions(['--lang=pt', '--step=eval', '--batch-size=20', '--max-passes=2'])
    ).toMatchObject({
      lang: 'pt',
      step: 'eval',
      batchSize: 20,
      maxRemediatePasses: 2,
    });
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
  ])('rejects invalid %s value %s', (option, value) => {
    expect(() => parseOptions(['--lang=pt', `${option}=${value}`])).toThrow(/positive integer/);
  });

  it('keeps generated paths inside their allowed directories', () => {
    const root = path.resolve('/tmp/bootstrap-test');
    const paths = resolvePipelinePaths(root, 'pt');

    expect(paths.dictPath).toBe(path.join(root, 'public', 'pt.json'));
    expect(paths.queuePath).toBe(path.join(root, 'evals', 'artifacts', 'review_queue_pt.json'));
    expect(() => resolvePipelinePaths(root, '../../escape')).toThrow(/escapes/);
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

  it('allows only the documented POS enum', () => {
    for (const pos of ['noun', 'verb', 'adj', 'adv', 'pron', 'intj', 'num']) {
      expect(isValidPos(pos)).toBe(true);
    }
    expect(isValidPos('compound')).toBe(false);
    expect(isValidPos('noun/verb')).toBe(false);
  });
});
