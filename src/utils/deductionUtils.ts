import { Language } from '@/types/firestore';
import { DEFAULT_LANGUAGES, isLanguageCombo } from '@/utils/languages';
import { Dictionary, normalizeWord } from '@/utils/wordUtils';

export interface ColumnDeductionState {
  candidates: Record<number, Language[]>;
  isConfirmed: Record<number, boolean>;
}

/**
 * Calculates candidate languages for each board column based on submitted guesses.
 * Applies elimination rules and logical deduction.
 */
export const deduceColumnLanguages = (
  guesses: string[],
  shuffledLanguages: Language[],
  dictionaries: Partial<Record<Language, Dictionary>>
): ColumnDeductionState => {
  const boardLangs = isLanguageCombo(shuffledLanguages) ? shuffledLanguages : DEFAULT_LANGUAGES;
  const columns = boardLangs.map((_, index) => index);
  const candidateSets: Record<number, Set<Language>> = Object.fromEntries(
    columns.map((index) => [index, new Set(boardLangs)])
  );

  if (!guesses || guesses.length === 0 || !dictionaries) {
    return {
      candidates: Object.fromEntries(columns.map((index) => [index, [...candidateSets[index]]])),
      isConfirmed: Object.fromEntries(columns.map((index) => [index, false])),
    };
  }

  guesses.forEach((rawGuess) => {
    const norm = normalizeWord(rawGuess);

    const validInLangs: Language[] = boardLangs.filter((l) =>
      Boolean(dictionaries[l] && dictionaries[l]![norm])
    );

    columns.forEach((colIdx) => {
      const colTrueLang = boardLangs[colIdx];
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
          columns.forEach((otherCol) => {
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

    columns.forEach((colIdx) => {
      if (candidateSets[colIdx].size === 1) {
        const confirmedLang = Array.from(candidateSets[colIdx])[0];
        columns.forEach((otherCol) => {
          if (otherCol !== colIdx && candidateSets[otherCol].has(confirmedLang)) {
            candidateSets[otherCol].delete(confirmedLang);
            changed = true;
          }
        });
      }
    });

    boardLangs.forEach((lang) => {
      const colsWithLang = columns.filter((colIdx) => candidateSets[colIdx].has(lang));
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
    candidates: Object.fromEntries(columns.map((index) => [index, [...candidateSets[index]]])),
    isConfirmed: Object.fromEntries(
      columns.map((index) => [index, candidateSets[index].size === 1])
    ),
  };
};
