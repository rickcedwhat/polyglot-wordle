import fs from 'fs';
import path from 'path';
import {
  DefinitionVerdict,
  DictionaryEntry,
  DifficultyTier,
  FormatVerdict,
  Language,
  RawDictionary,
} from './types';

const DICT_DIR = path.resolve(process.cwd(), 'public');

/**
 * Loads a full language dictionary JSON from public/{lang}.json
 */
export function loadDictionary(lang: Language): DictionaryEntry[] {
  const filePath = path.join(DICT_DIR, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dictionary file not found: ${filePath}`);
  }

  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RawDictionary;
  return Object.entries(raw).map(([word, entry]) => ({
    ...entry,
    word,
    lang,
  }));
}

/**
 * Loads all dictionary entries across English, Spanish, and French.
 */
export function loadAllDictionaries(): DictionaryEntry[] {
  return [...loadDictionary('en'), ...loadDictionary('es'), ...loadDictionary('fr')];
}

/**
 * Curated calibration set with known-good and known-bad / edge cases
 * to calibrate Jev's thresholds and verify prompt fidelity.
 */
export interface CalibrationFixture extends DictionaryEntry {
  expectedFlag: boolean;
  notes: string;
  mockAnswers: {
    definition: DefinitionVerdict;
    format: FormatVerdict;
    difficulty: DifficultyTier;
  };
}

export const CALIBRATION_BENCHMARK: CalibrationFixture[] = [
  {
    word: 'apple',
    display: 'apple',
    lang: 'en',
    pos: 'noun',
    d: 0.3,
    def: 'A common round fruit with red, yellow, or green skin and crisp flesh.',
    reviewed: true,
    expectedFlag: false,
    notes: 'Controlled known-good elementary noun',
    mockAnswers: {
      definition: 'accurate',
      format: 'clean_dictionary',
      difficulty: 'elementary',
    },
  },
  {
    word: 'chair',
    display: 'chair',
    lang: 'en',
    pos: 'verb',
    d: 0.21,
    def: 'A separate seat for one person, with a back and legs.',
    reviewed: false,
    expectedFlag: true,
    notes: 'Controlled wrong-part-of-speech fixture',
    mockAnswers: {
      definition: 'wrong_pos',
      format: 'clean_dictionary',
      difficulty: 'elementary',
    },
  },
  {
    word: 'table',
    display: 'table',
    lang: 'en',
    pos: 'noun',
    d: 0.13,
    def: 'A large domesticated animal raised for milk and beef.',
    reviewed: false,
    expectedFlag: true,
    notes: 'Controlled wrong-definition fixture',
    mockAnswers: {
      definition: 'wrong_meaning',
      format: 'clean_dictionary',
      difficulty: 'elementary',
    },
  },
  {
    word: 'playa',
    display: 'playa',
    lang: 'es',
    pos: 'noun',
    d: 0.21,
    def: 'A sandy or pebbly shore by the ocean or lake.',
    reviewed: true,
    expectedFlag: false,
    notes: 'Controlled known-good Spanish noun',
    mockAnswers: {
      definition: 'accurate',
      format: 'clean_dictionary',
      difficulty: 'elementary',
    },
  },
  {
    word: 'arbre',
    display: 'arbre',
    lang: 'fr',
    pos: 'noun',
    d: 0.22,
    def: 'A woody perennial plant characterized by a trunk and spreading canopy; tree.',
    reviewed: true,
    expectedFlag: false,
    notes: 'Controlled known-good French noun',
    mockAnswers: {
      definition: 'accurate',
      format: 'clean_dictionary',
      difficulty: 'elementary',
    },
  },
];

export function loadCalibrationBenchmark() {
  return CALIBRATION_BENCHMARK;
}

function seededShuffle(entries: DictionaryEntry[], seed: string): DictionaryEntry[] {
  let state = 2166136261;
  for (const char of seed) {
    state ^= char.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  const shuffled = [...entries];
  for (let i = shuffled.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Returns a pilot sample of words per language (default 25 per language),
 * stratified across basic, intermediate, and advanced bands, plus calibration words.
 */
export function loadPilotSample(perLang = 25): DictionaryEntry[] {
  const languages: Language[] = ['en', 'es', 'fr'];
  const sample: DictionaryEntry[] = [];

  for (const lang of languages) {
    const all = loadDictionary(lang);
    const calibrationFixtures = CALIBRATION_BENCHMARK.filter((fixture) => fixture.lang === lang);

    // Group into 3 difficulty bands
    const basic = all.filter((e) => e.d <= 0.5);
    const intermediate = all.filter((e) => e.d > 0.5 && e.d <= 0.75);
    const advanced = all.filter((e) => e.d > 0.75);

    // Add calibration entries for this language first
    const calibWords = new Set(calibrationFixtures.map((fixture) => fixture.word));
    const calibEntries = calibrationFixtures.map(
      ({ expectedFlag: _expectedFlag, notes: _notes, mockAnswers: _mockAnswers, ...entry }) => entry
    );
    sample.push(...calibEntries);

    const remainingSlots = Math.max(0, perLang - calibEntries.length);
    const perBand = Math.floor(remainingSlots / 3);

    const pickRandom = (arr: DictionaryEntry[], count: number, band: string) => {
      const available = arr.filter((e) => !calibWords.has(e.word));
      return seededShuffle(available, `dictionary-pilot-v1:${lang}:${band}`).slice(0, count);
    };

    sample.push(...pickRandom(basic, perBand, 'basic'));
    sample.push(...pickRandom(intermediate, perBand, 'intermediate'));
    sample.push(...pickRandom(advanced, remainingSlots - 2 * perBand, 'advanced'));
  }

  return sample;
}
