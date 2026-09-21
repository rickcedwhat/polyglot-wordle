import { describe, expect, it } from 'vitest';
import { loadCalibrationBenchmark, loadPilotSample } from './dataset';
import { generateCsv, generateMarkdownSummary } from './runEval';
import { evaluateEntryWithJev } from './scorers';
import { DictionaryEntry, ReviewQueueItem } from './types';

describe('Dictionary Dataset Loader', () => {
  it('loads the calibration benchmark with expected flags', () => {
    const calib = loadCalibrationBenchmark();
    expect(calib.length).toBeGreaterThan(0);

    const aback = calib.find((c) => c.word === 'aback');
    expect(aback).toBeDefined();
    expect(aback?.expectedFlag).toBe(true);

    const apple = calib.find((c) => c.word === 'apple');
    expect(apple).toBeDefined();
    expect(apple?.expectedFlag).toBe(false);
  });

  it('loads a stratified pilot sample with items for en, es, and fr', () => {
    const sample = loadPilotSample(10);
    expect(sample.length).toBeGreaterThanOrEqual(30);

    const en = sample.filter((e) => e.lang === 'en');
    const es = sample.filter((e) => e.lang === 'es');
    const fr = sample.filter((e) => e.lang === 'fr');

    expect(en.length).toBeGreaterThanOrEqual(10);
    expect(es.length).toBeGreaterThanOrEqual(10);
    expect(fr.length).toBeGreaterThanOrEqual(10);
  });
});

describe('Jev Evaluation Logic', () => {
  const mockEntry: DictionaryEntry = {
    word: 'aback',
    display: 'aback',
    lang: 'en',
    pos: 'noun',
    def: 'Toward the back or rear; backward.',
    d: 0.95,
  };

  it('correctly maps Jev responses to evaluation result and flags wrong POS', async () => {
    const mockClient = {
      systemOne: async () => ({
        answers: {
          difficulty: {
            choice: 'Obscure / Archaic / Specialist',
            confidence: 0.9,
          },
          accuracy: {
            choice: 'wrong_pos',
            confidence: 0.95,
          },
          quality: {
            choice: 'high_quality',
            confidence: 0.9,
          },
          needsReexamine: {
            answer: true,
            probability: 0.95,
            confidence: 0.95,
          },
        },
      }),
    } as any;

    const res = await evaluateEntryWithJev(mockClient, mockEntry);

    expect(res.word).toBe('aback');
    expect(res.accuracy).toBe('wrong_pos');
    expect(res.severity).toBe('medium');
    expect(res.needsReexamine).toBe(true);
    expect(res.reasons.some((r) => r.includes('Part-of-speech mismatch'))).toBe(true);
  });
});

describe('Reporting & CSV Export', () => {
  it('correctly generates CSV from review queue items', () => {
    const items: ReviewQueueItem[] = [
      {
        word: 'aback',
        lang: 'en',
        display: 'aback',
        pos: 'noun',
        currentDef: 'Toward the back or rear; backward.',
        currentD: 0.95,
        assessedD: 0.95,
        difficultyTier: 'Obscure / Archaic / Specialist',
        accuracy: 'wrong_pos',
        quality: 'high_quality',
        needsReexamineProb: 0.95,
        severity: 'medium',
        reasons: ['Part-of-speech mismatch'],
      },
    ];

    const csv = generateCsv(items);
    expect(csv).toContain('Language,Word,Display,POS');
    expect(csv).toContain('"EN","aback","aback","noun"');
    expect(csv).toContain('"Part-of-speech mismatch"');
  });

  it('correctly generates markdown summary', () => {
    const stats = {
      totalProcessed: 10,
      flaggedCount: 1,
      byLanguage: {
        en: { total: 4, flagged: 1, bySeverity: { high: 0, medium: 1, low: 0 } },
        es: { total: 3, flagged: 0, bySeverity: { high: 0, medium: 0, low: 0 } },
        fr: { total: 3, flagged: 0, bySeverity: { high: 0, medium: 0, low: 0 } },
      },
      byAccuracy: { accurate: 9, wrong_pos: 1, wrong_meaning: 0, fabricated: 0 },
      byQuality: {
        high_quality: 10,
        vague_or_circular: 0,
        robotic_filler: 0,
        grammatical_glitch: 0,
      },
      averageLatencyMs: 45,
    };

    const items: ReviewQueueItem[] = [
      {
        word: 'aback',
        lang: 'en',
        display: 'aback',
        pos: 'noun',
        currentDef: 'Toward the back or rear; backward.',
        currentD: 0.95,
        assessedD: 0.95,
        difficultyTier: 'Obscure / Archaic / Specialist',
        accuracy: 'wrong_pos',
        quality: 'high_quality',
        needsReexamineProb: 0.95,
        severity: 'high',
        reasons: ['Part-of-speech mismatch'],
      },
    ];

    const md = generateMarkdownSummary(stats, items);
    expect(md).toContain('# 🔍 Jev + Braintrust Dictionary QA Audit Report');
    expect(md).toContain('| **EN** | 4 | 1 | 0 | 1 | 0 |');
    expect(md).toContain('| **EN** | **aback** | `noun` |');
  });
});
