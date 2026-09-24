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
  dictionaries: Partial<Record<Language, Dictionary>>
): ColumnDeductionState => {
  const boardLangs =
    shuffledLanguages.length === 3 ? shuffledLanguages : (['en', 'es', 'fr'] as Language[]);
  const candidateSets: Record<number, Set<Language>> = {
    0: new Set(boardLangs),
    1: new Set(boardLangs),
    2: new Set(boardLangs),
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

  guesses.forEach((rawGuess) => {
    const norm = normalizeWord(rawGuess);

    const validInLangs: Language[] = boardLangs.filter((l) =>
      Boolean(dictionaries[l] && dictionaries[l]![norm])
    );

    [0, 1, 2].forEach((colIdx) => {
      const colTrueLang = shuffledLanguages[colIdx];
      const isMatchInCol = Boolean(dictionaries[colTrueLang] && dictionaries[colTrueLang]![norm]);

      if (isMatchInCol) {
        candidateSets[colIdx].forEach((cand) => {
          if (!validInLangs.includes(cand)) {
            candidateSets[colIdx].delete(cand);
          }
        });

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
        validInLangs.forEach((l) => {
          candidateSets[colIdx].delete(l);
        });
      }
    });
  });

  let changed = true;
  while (changed) {
    changed = false;

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

    boardLangs.forEach((lang) => {
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
