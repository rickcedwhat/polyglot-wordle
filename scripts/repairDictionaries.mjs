import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

const LANGS = ['en', 'es', 'fr'];

// Generic corrupted definition patterns introduced by recursive replacement in 8bed450
const CORRUPTED_PATTERNS = [
  'Of a size that is less than normal or usual; little.',
  'Measuring a great distance from end to end in space or duration in time.',
  'Solid, firm, and resistant to pressure; not easily broken or pierced.',
  'Containing or holding as much or as many as possible; complete.',
  'Easy to mold, cut, compress, or fold; not hard or firm.',
  'Having or showing a friendly, generous, and considerate nature.',
  'Measuring a small distance from end to end; not long or tall.',
  'Vibrations that travel through the air or another medium and can be heard.',
  'With opposite sides or surfaces that are a great distance apart; not thin.',
  'A particular position or point in space, or an area with definite boundaries.',
  'A flat surface on which a straight line joining any two points would lie.',
  'A short distance away or having strong affection and intimacy.',
  'The front surface of a person body between neck and stomach.',
  'The arrangement or disposition of people or things according to a particular sequence.',
  'A portion of an object or of material, produced by cutting, tearing, or breaking.',
  'first/third-person singular present indicative/subjunctive.',
];

function isCorrupted(def) {
  if (!def) return true;
  const trimmed = def.trim();
  return CORRUPTED_PATTERNS.some((p) => trimmed === p || trimmed.startsWith(p));
}

function mapTierToDifficulty(currentD, jevTier) {
  switch (jevTier) {
    case 'elementary':
      return currentD <= 0.5 ? currentD : 0.35;
    case 'intermediate':
      return currentD > 0.5 && currentD <= 0.75 ? currentD : 0.65;
    case 'advanced':
      return currentD > 0.75 && currentD <= 0.89 ? currentD : 0.82;
    case 'obscure':
      return currentD >= 0.9 ? currentD : 0.95;
    default:
      return currentD;
  }
}

console.log('🛠️ Repairing dictionaries using Jev difficulty tiers & git pre-corruption history...\n');

for (const lang of LANGS) {
  const dictPath = path.resolve(`public/${lang}.json`);
  const queuePath = path.resolve(`evals/artifacts/review_queue_${lang}.json`);

  if (!fs.existsSync(dictPath)) {
    console.warn(`Dictionary not found: ${dictPath}`);
    continue;
  }

  const currentDict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

  // Load previous uncorrupted dictionary from git history (commit 8bed450~1)
  let prevDict = {};
  try {
    const rawPrev = execSync(`git show 8bed450~1:public/${lang}.json`, {
      maxBuffer: 50 * 1024 * 1024,
      encoding: 'utf8',
    });
    prevDict = JSON.parse(rawPrev);
  } catch (err) {
    console.warn(`Could not load git history for ${lang}:`, err.message);
  }

  // Load review queue
  let queueItems = [];
  if (fs.existsSync(queuePath)) {
    const qData = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    queueItems = qData.queue || [];
  }

  const jevTierMap = new Map();
  const flaggedDefMap = new Map();

  for (const item of queueItems) {
    if (item.jevTier) {
      jevTierMap.set(item.word, item.jevTier);
    }
    if (item.definitionVerdict !== 'accurate' || item.formatVerdict !== 'clean_dictionary') {
      flaggedDefMap.set(item.word, item);
    }
  }

  let difficultyUpdated = 0;
  let definitionsRestored = 0;

  for (const [word, entry] of Object.entries(currentDict)) {
    // 1. Calibrate difficulty to Jev tier
    const assessedTier = jevTierMap.get(word);
    if (assessedTier) {
      const newD = mapTierToDifficulty(entry.d, assessedTier);
      if (newD !== entry.d) {
        entry.d = newD;
        difficultyUpdated++;
      }
    }

    // 2. Restore corrupted definitions if available in prevDict
    const isFlagged = flaggedDefMap.has(word);
    const looksCorrupted = isCorrupted(entry.def);

    if ((isFlagged || looksCorrupted) && prevDict[word] && prevDict[word].def) {
      const prevDef = prevDict[word].def.trim();
      // Ensure the previous definition is valid and not itself a corrupted placeholder
      if (prevDef.length >= 15 && !isCorrupted(prevDef) && prevDef !== entry.def) {
        entry.def = prevDef;
        if (prevDict[word].pos) {
          entry.pos = prevDict[word].pos;
        }
        definitionsRestored++;
      }
    }
  }

  // Save back cleanly formatted
  fs.writeFileSync(dictPath, JSON.stringify(currentDict, null, 2) + '\n', 'utf8');

  console.log(`[${lang.toUpperCase()}]:`);
  console.log(`  - Total words: ${Object.keys(currentDict).length}`);
  console.log(`  - Difficulty scores updated to Jev tier: ${difficultyUpdated}`);
  console.log(`  - Corrupted definitions restored from history: ${definitionsRestored}\n`);
}

console.log('✅ Dictionary repair complete!\n');
