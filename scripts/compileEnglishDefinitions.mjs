import fs from 'fs';
import { normalizeWord, BANNED_WORDS, loadFrequencies } from './dictUtils.mjs';

const enFreq = loadFrequencies('scripts/en_50k.txt');
const esFreq = loadFrequencies('scripts/es_50k.txt');
const frFreq = loadFrequencies('scripts/fr_50k.txt');

const webster = fs.existsSync('scripts/webster.json')
  ? JSON.parse(fs.readFileSync('scripts/webster.json', 'utf8'))
  : {};

function cleanWebsterDef(raw, word) {
  if (!raw) return `A recognized English term used in common parlance.`;
  let clean = raw.replace(/^[0-9]+\.\s*/, '');
  clean = clean.replace(/\([a-zA-Z\.\s,;0-9\-]+\)/g, '');
  clean = clean.replace(/--\s+[a-zA-Z\s\(\)]+/g, '');
  clean = clean.replace(/\b(See\s+[A-Z][a-z]+)\b/g, '');
  const sentences = clean.split(/\.\s+/);
  let first = sentences[0]?.trim() || '';
  if (first.length < 25 && sentences[1]) {
    first += '; ' + sentences[1].trim();
  }
  first = first.replace(/\s+/g, ' ').trim();
  if (!first.endsWith('.')) first += '.';
  const words = first.split(/\s+/);
  if (words.length < 4) {
    first = `An established English word denoting ${word} in standard usage.`;
  }
  return first;
}

function getDifficulty(rank, maxRank = 15000) {
  if (!rank) return 0.85;
  const clamped = Math.min(rank, maxRank);
  const normalized = clamped / maxRank;
  return Math.min(0.95, Math.max(0.05, Math.round(Math.pow(normalized, 0.7) * 100) / 100));
}

// Build English
function buildEnglish() {
  const dictionary = {};
  const candidateKeys = new Set();
  
  for (const [w] of enFreq) {
    if (w.length === 5 && /^[a-z]+$/.test(w) && !BANNED_WORDS.has(w)) {
      candidateKeys.add(w);
    }
    if (candidateKeys.size >= 3300) break;
  }

  for (const word of candidateKeys) {
    const freq = enFreq.get(word);
    const rank = freq ? freq.rank : 18000;
    const diff = getDifficulty(rank);

    let pos = 'noun';
    if (word.endsWith('ed') || word.endsWith('ing')) pos = 'verb';
    else if (word.endsWith('ly')) pos = 'adv';
    else if (word.endsWith('al') || word.endsWith('ic') || word.endsWith('ive') || word.endsWith('ful')) pos = 'adj';

    const rawDef = webster[word] || webster[word.toUpperCase()] || '';
    const def = cleanWebsterDef(rawDef, word);

    dictionary[word] = {
      display: word,
      d: diff,
      pos,
      def
    };
  }

  return dictionary;
}

console.log('Compiling English definitions...');
const en = buildEnglish();
fs.writeFileSync('public/en.json', JSON.stringify(en, null, 2));
console.log('Saved en.json with', Object.keys(en).length, 'entries');
