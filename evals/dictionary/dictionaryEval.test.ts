import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { loadCalibrationBenchmark, loadPilotSample } from './dataset';
import {
  generateCsv,
  generateMarkdownSummary,
  loadReviewQueueEntries,
  MockTypeSafeClient,
} from './runEval';
import { evaluateEntryWithJev } from './scorers';
import { DictionaryEntry, EvalRunStats, ReviewQueueItem } from './types';

describe('Dictionary Dataset Loader', () => {
  it('loads the calibration benchmark with expected flags', () => {
    const calib = loadCalibrationBenchmark();
    expect(calib.length).toBeGreaterThan(0);

    const invalidChair = calib.find((c) => c.word === 'chair');
    expect(invalidChair).toBeDefined();
    expect(invalidChair?.expectedFlag).toBe(true);
    expect(invalidChair?.mockAnswers.definition).toBe('wrong_pos');

    const apple = calib.find((c) => c.word === 'apple');
    expect(apple).toBeDefined();
    expect(apple?.expectedFlag).toBe(false);
    expect(apple?.mockAnswers.definition).toBe('accurate');
  });

  it('uses a reproducible seeded selection within each difficulty band', () => {
    expect(loadPilotSample(10)).toEqual(loadPilotSample(10));
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

  it('marks calibration fixtures in the pilot sample', () => {
    const calibrationEntries = loadPilotSample(10).filter((entry) => entry.isCalibration);

    expect(calibrationEntries).toHaveLength(loadCalibrationBenchmark().length);
  });
});

describe('Dry-run Calibration Fixtures', () => {
  const client = new MockTypeSafeClient();
  const chairState = {
    word: 'chair',
    display: 'chair',
    languageCode: 'en' as const,
    partOfSpeech: 'noun',
    definition: 'A separate seat for one person, with a back and legs.',
    currentDifficultyTier: 'elementary',
  };

  it('does not apply calibration answers to an ordinary entry with different fixture data', async () => {
    const response = await client.systemOne({ state: chairState });

    expect(response.answers.definition.choice).toBe('accurate');
  });

  it('applies calibration answers when all fixture fields match', async () => {
    const response = await client.systemOne({
      state: { ...chairState, partOfSpeech: 'verb' },
    });

    expect(response.answers.definition.choice).toBe('wrong_pos');
  });

  it('applies calibration answers when the entry is explicitly marked', async () => {
    const response = await client.systemOne({
      state: { ...chairState, isCalibration: true },
    });

    expect(response.answers.definition.choice).toBe('wrong_pos');
  });
});

describe('Review Queue Loader', () => {
  const withQueueFile = (data: unknown, assertion: (file: string) => void) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dictionary-queue-'));
    const file = path.join(dir, 'queue.json');
    fs.writeFileSync(file, JSON.stringify(data));
    try {
      assertion(file);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };

  it('rejects a queue document without an array queue property', () => {
    withQueueFile({ queue: null }, (file) => {
      expect(() => loadReviewQueueEntries(file)).toThrow('"queue" must be an array');
    });
  });

  it.each([
    [{ lang: 'de', word: 'apple' }, 'Invalid review queue language'],
    [{ lang: 'en', word: 'zzzzz' }, 'does not resolve to a dictionary word'],
  ])('rejects unresolved queue reference %#', (item, message) => {
    withQueueFile({ queue: [item] }, (file) => {
      expect(() => loadReviewQueueEntries(file)).toThrow(message);
    });
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

  it('correctly maps Jev responses to evaluation result and flags wrong POS and difficulty mismatch', async () => {
    const mockClient = {
      systemOne: async () => ({
        answers: {
          difficulty: {
            choice: 'intermediate',
            confidence: 0.9,
          },
          definition: {
            choice: 'wrong_pos',
            confidence: 0.95,
          },
          format: {
            choice: 'clean_dictionary',
            confidence: 0.9,
          },
        },
      }),
    } as any;

    const res = await evaluateEntryWithJev(mockClient, mockEntry);

    expect(res.word).toBe('aback');
    expect(res.definitionVerdict).toBe('wrong_pos');
    expect(res.jevTier).toBe('intermediate');
    expect(res.ourTier).toBe('obscure');
    expect(res.difficultyMatches).toBe(false);
    expect(res.severity).toBe('medium');
    expect(res.reasons.some((r) => r.includes('Part-of-speech mismatch'))).toBe(true);
    expect(res.reasons.some((r) => r.includes('Difficulty mismatch'))).toBe(true);
  });

  it.each([
    ['missing answer object', null],
    ['empty choice', { choice: '', confidence: 0.9 }],
    ['unknown choice', { choice: 'maybe', confidence: 0.9 }],
    ['missing confidence', { choice: 'accurate' }],
    ['null confidence', { choice: 'accurate', confidence: null }],
  ])('rejects %s instead of applying a passing default', async (_label, definition) => {
    const mockClient = {
      systemOne: async () => ({
        answers: {
          definition,
          format: { choice: 'clean_dictionary', confidence: 0.9 },
          difficulty: { choice: 'intermediate', confidence: 0.9 },
        },
      }),
    } as any;

    await expect(evaluateEntryWithJev(mockClient, mockEntry)).rejects.toThrow(
      'Invalid evaluation response'
    );
  });

  it.each([-0.01, 1.01])('rejects confidence outside the unit interval: %s', async (confidence) => {
    const mockClient = {
      systemOne: async () => ({
        answers: {
          definition: { choice: 'accurate', confidence },
          format: { choice: 'clean_dictionary', confidence: 0.9 },
          difficulty: { choice: 'intermediate', confidence: 0.9 },
        },
      }),
    } as any;

    await expect(evaluateEntryWithJev(mockClient, mockEntry)).rejects.toThrow(
      'definition.confidence must be between 0 and 1'
    );
  });

  it.each([0, 1])('accepts confidence at the unit interval boundary: %s', async (confidence) => {
    const mockClient = {
      systemOne: async () => ({
        answers: {
          definition: { choice: 'accurate', confidence },
          format: { choice: 'clean_dictionary', confidence },
          difficulty: { choice: 'intermediate', confidence },
        },
      }),
    } as any;

    await expect(evaluateEntryWithJev(mockClient, mockEntry)).resolves.toMatchObject({
      definitionConfidence: confidence,
      formatConfidence: confidence,
      difficultyConfidence: confidence,
    });
  });
});

describe('Reporting & CSV Export', () => {
  it('correctly generates CSV from review queue items with tier comparison', () => {
    const items: ReviewQueueItem[] = [
      {
        word: 'aback',
        lang: 'en',
        display: 'aback',
        pos: 'noun',
        currentDef: 'Toward the back or rear; backward.',
        currentD: 0.95,
        ourTier: 'obscure',
        jevTier: 'intermediate',
        difficultyMatches: false,
        definitionVerdict: 'wrong_pos',
        formatVerdict: 'clean_dictionary',
        severity: 'medium',
        reasons: [
          'Part-of-speech mismatch (noun flagged)',
          'Difficulty mismatch: dictionary has [obscure], Jev assessed [intermediate]',
        ],
      },
    ];

    const csv = generateCsv(items, { totalProcessed: 10, failureCount: 0 });
    expect(csv).toContain('Total Processed,10');
    expect(csv).toContain('Failure Count,0');
    expect(csv).toContain('Language,Word,Display,POS,Our Tier,Jev Tier,Tier Match');
    expect(csv).toContain('"EN","aback","aback","noun","OBSCURE","INTERMEDIATE","MISMATCH"');
    expect(csv).toContain('Part-of-speech mismatch');
  });

  it('correctly generates markdown summary with difficulty mismatches section', () => {
    const stats: EvalRunStats = {
      totalProcessed: 10,
      failureCount: 0,
      flaggedCount: 1,
      difficultyMismatches: 1,
      byLanguage: {
        en: { total: 4, flagged: 1, bySeverity: { high: 0, medium: 1, low: 0 } },
        es: { total: 3, flagged: 0, bySeverity: { high: 0, medium: 0, low: 0 } },
        fr: { total: 3, flagged: 0, bySeverity: { high: 0, medium: 0, low: 0 } },
      },
      byDefinition: {
        accurate: 9,
        inflected_form: 0,
        wrong_pos: 1,
        wrong_meaning: 0,
        fabricated: 0,
      },
      byFormat: {
        clean_dictionary: 10,
        vague_circular: 0,
        robotic_filler: 0,
        malformed_syntax: 0,
      },
      byJevTier: { elementary: 3, intermediate: 4, advanced: 2, obscure: 1 },
      averageLatencyMs: 45,
      calibration: {
        total: 2,
        correct: 1,
        falsePositives: ['en:apple'],
        falseNegatives: [],
        accuracy: 0.5,
      },
    };

    const items: ReviewQueueItem[] = [
      {
        word: 'aback',
        lang: 'en',
        display: 'aback',
        pos: 'noun',
        currentDef: 'Toward the back or rear; backward.',
        currentD: 0.95,
        ourTier: 'obscure',
        jevTier: 'intermediate',
        difficultyMatches: false,
        definitionVerdict: 'wrong_pos',
        formatVerdict: 'clean_dictionary',
        severity: 'high',
        reasons: ['Part-of-speech mismatch'],
      },
    ];

    const md = generateMarkdownSummary(stats, items);
    expect(md).toContain('# 🔍 Jev + Braintrust Dictionary QA Audit Report');
    expect(md).toContain('**Difficulty Mismatches:** 1');
    expect(md).toContain('**Evaluation Failures:** 0');
    expect(md).toContain('**Accuracy:** 50.0% (1/2)');
    expect(md).toContain('**False Positives:** 1 (en:apple)');
    expect(md).toContain('## ⚖️ Difficulty Tier Mismatches (1)');
    expect(md).toContain('| **EN** | **aback** | `noun` | **obscure** | **intermediate** |');
  });
});
