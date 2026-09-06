import fs from 'fs';
import path from 'path';

const normalizeWord = (word) => {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace('ñ', 'n')
    .replace('ç', 'c')
    .toLowerCase();
};

const BANNED_WORDS = new Set([
  'nègre', 'negre', 'négro', 'negro', 'bitch', 'whore', 'slut', 'cunt', 'fag', 'fagot',
  'puta', 'puto', 'maric', 'coño', 'mierd', 'salop', 'pd'
]);

// Build frequency map from 50k list
function loadFrequencies(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const lines = content.trim().split('\n');
  const freqMap = new Map();
  let rank = 1;
  for (const line of lines) {
    const parts = line.trim().split(' ');
    if (parts.length >= 2) {
      const word = parts[0].toLowerCase();
      const count = parseInt(parts[1], 10);
      if (!freqMap.has(word)) {
        freqMap.set(word, { count, rank });
        rank++;
      }
    }
  }
  return freqMap;
}

export { normalizeWord, BANNED_WORDS, loadFrequencies };
