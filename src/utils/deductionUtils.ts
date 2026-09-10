import { Language } from '@/types/firestore';
import { Dictionary, normalizeWord } from '@/utils/wordUtils';

export interface ColumnDeductionState {
  candidates: Record<number, Language[]>;
  isConfirmed: Record<number, boolean>;
}

/**
 * Calculates candidate languages for each column (0, 1, 2) based on submitted guesses.
 * Applies elimination rules and logical deduction.
 */
export const deduceColumnLanguages = (
  guesses: string[],
  shuffledLanguages: Language[],
  dictionaries: Record<Language, Dictionary>
): ColumnDeductionState => {
  const candidateSets: Record<number, Set<Language>> = {
    0: new Set(['en', 'es', 'fr']),
    1: new Set(['en', 'es', 'fr']),
    2: new Set(['en', 'es', 'fr']),
  };

  if (!guesses || guesses.length === 0 || !dictionaries) {
    return {
      candidates: {
        0: Array.from(candidateSets[0]),
        1: Array.from(candidateSets[1]),
        2: Array.from(candidateSets[2]),
      },
      isConfirmed: { 0: false, 1: false, 2: false },
    };
  }

  // Iterate over every submitted guess
  guesses.forEach((rawGuess) => {
    const norm = normalizeWord(rawGuess);

    // Which master dictionaries contain this word?
    const validInLangs: Language[] = (['en', 'es', 'fr'] as Language[]).filter((l) =>
      Boolean(dictionaries[l] && dictionaries[l][norm])
    );

    // Evaluate each column
    [0, 1, 2].forEach((colIdx) => {
      const colTrueLang = shuffledLanguages[colIdx];
      const isMatchInCol = Boolean(dictionaries[colTrueLang] && dictionaries[colTrueLang][norm]);

      if (isMatchInCol) {
        // If guess matched in this column, that column's true language MUST be in validInLangs
        candidateSets[colIdx].forEach((cand) => {
          if (!validInLangs.includes(cand)) {
            candidateSets[colIdx].delete(cand);
          }
        });

        // Rule of Unique Match:
        if (validInLangs.length === 1) {
          const uniqueLang = validInLangs[0];
          candidateSets[colIdx] = new Set([uniqueLang]);
          [0, 1, 2].forEach((otherCol) => {
            if (otherCol !== colIdx) {
              candidateSets[otherCol].delete(uniqueLang);
            }
          });
        }
      } else {
        // If guess did NOT match in this column, any language in which this guess IS valid cannot be this column's language
        validInLangs.forEach((l) => {
          candidateSets[colIdx].delete(l);
        });
      }
    });
  });

  // Logical Propagation Loop (Naked Singles / Unique Remaining Candidate)
  let changed = true;
  while (changed) {
    changed = false;

    // Pass A: If any column has 1 candidate, eliminate that candidate from all other columns
    [0, 1, 2].forEach((colIdx) => {
      if (candidateSets[colIdx].size === 1) {
        const confirmedLang = Array.from(candidateSets[colIdx])[0];
        [0, 1, 2].forEach((otherCol) => {
          if (otherCol !== colIdx && candidateSets[otherCol].has(confirmedLang)) {
            candidateSets[otherCol].delete(confirmedLang);
            changed = true;
          }
        });
      }
    });

    // Pass B: If any language appears as candidate in ONLY ONE column, constrain that column to that language
    (['en', 'es', 'fr'] as Language[]).forEach((lang) => {
      const colsWithLang = [0, 1, 2].filter((colIdx) => candidateSets[colIdx].has(lang));
      if (colsWithLang.length === 1) {
        const singleCol = colsWithLang[0];
        if (candidateSets[singleCol].size > 1) {
          candidateSets[singleCol] = new Set([lang]);
          changed = true;
        }
      }
    });
  }

  return {
    candidates: {
      0: Array.from(candidateSets[0]),
      1: Array.from(candidateSets[1]),
      2: Array.from(candidateSets[2]),
    },
    isConfirmed: {
      0: candidateSets[0].size === 1,
      1: candidateSets[1].size === 1,
      2: candidateSets[2].size === 1,
    },
  };
};
