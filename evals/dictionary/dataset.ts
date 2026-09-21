import fs from 'fs';
import path from 'path';
import { DictionaryEntry, Language, RawDictionary } from './types';

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
export const CALIBRATION_BENCHMARK: Array<{
  word: string;
  lang: Language;
  expectedFlag: boolean;
  notes: string;
}> = [
  // Known good foundational words
  { word: 'apple', lang: 'en', expectedFlag: false, notes: 'Elementary noun' },
  { word: 'chair', lang: 'en', expectedFlag: false, notes: 'Elementary noun' },
  { word: 'table', lang: 'en', expectedFlag: false, notes: 'Elementary noun' },
  { word: 'playa', lang: 'es', expectedFlag: false, notes: 'Elementary noun (beach)' },
  { word: 'queso', lang: 'es', expectedFlag: false, notes: 'Elementary noun (cheese)' },
  { word: 'arbre', lang: 'fr', expectedFlag: false, notes: 'Elementary noun (tree)' },
  { word: 'fruit', lang: 'fr', expectedFlag: false, notes: 'Elementary noun (fruit)' },

  // Known flaws in public/{lang}.json
  {
    word: 'aback',
    lang: 'en',
    expectedFlag: true,
    notes: 'Mislabeled POS (listed as noun, actually adverb)',
  },
  {
    word: 'abate',
    lang: 'en',
    expectedFlag: true,
    notes: 'Mislabeled POS (listed as noun, actually verb)',
  },
];

export function loadCalibrationBenchmark() {
  return CALIBRATION_BENCHMARK;
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

    // Group into 3 difficulty bands
    const basic = all.filter((e) => e.d <= 0.5);
    const intermediate = all.filter((e) => e.d > 0.5 && e.d <= 0.75);
    const advanced = all.filter((e) => e.d > 0.75);

    // Add calibration entries for this language first
    const calibWords = new Set(
      CALIBRATION_BENCHMARK.filter((c) => c.lang === lang).map((c) => c.word)
    );
    const calibEntries = all.filter((e) => calibWords.has(e.word));
    sample.push(...calibEntries);

    const remainingSlots = Math.max(0, perLang - calibEntries.length);
    const perBand = Math.floor(remainingSlots / 3);

    const pickRandom = (arr: DictionaryEntry[], count: number) => {
      const available = arr.filter((e) => !calibWords.has(e.word));
      return available.slice(0, count);
    };

    sample.push(...pickRandom(basic, perBand));
    sample.push(...pickRandom(intermediate, perBand));
    sample.push(...pickRandom(advanced, remainingSlots - 2 * perBand));
  }

  return sample;
}
