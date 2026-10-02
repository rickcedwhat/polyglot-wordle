export type TileStatus = 'correct' | 'present' | 'absent' | 'empty';

export const MAX_GUESSES = 8;
const WORD_LENGTH = 5;

export interface GameData {
  words: Record<string, string>;
  guessHistory: string[];
  shuffledLanguages?: string[];
  score?: number;
}

/** Must match `normalizeWord` in src/utils/wordUtils.ts. */
export const normalizeWord = (word: string): string =>
  word
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace('ñ', 'n')
    .replace('ç', 'c');

/** Must match `getGuessStatuses` in src/utils/wordUtils.ts. */
export const guessStatuses = (guess: string, solution: string): TileStatus[] => {
  const sol = normalizeWord(solution).split('');
  const g = normalizeWord(guess).split('');
  const statuses: TileStatus[] = Array(sol.length).fill('absent');
  const counts: Record<string, number> = {};
  for (const letter of sol) {
    counts[letter] = (counts[letter] ?? 0) + 1;
  }
  for (let i = 0; i < g.length; i++) {
    if (g[i] === sol[i]) {
      statuses[i] = 'correct';
      counts[g[i]]--;
    }
  }
  for (let i = 0; i < g.length; i++) {
    if (statuses[i] !== 'correct' && (counts[g[i]] ?? 0) > 0) {
      statuses[i] = 'present';
      counts[g[i]]--;
    }
  }
  return statuses;
};

/** Board languages in on-screen order. */
export const boardLanguages = (game: GameData): string[] =>
  game.shuffledLanguages?.length ? game.shuffledLanguages : Object.keys(game.words).sort();

/** One 8×5 grid per board, in board order. Rows after a board is solved are empty. */
export const buildBoards = (game: GameData): TileStatus[][][] => {
  const guesses = game.guessHistory.map(normalizeWord);
  return boardLanguages(game).map((lang) => {
    const solution = game.words[lang] ?? '';
    const solvedTurn = guesses.indexOf(normalizeWord(solution));
    return Array.from({ length: MAX_GUESSES }, (_, row) => {
      const guess = game.guessHistory[row];
      if (!guess || !solution || (solvedTurn !== -1 && row > solvedTurn)) {
        return Array(WORD_LENGTH).fill('empty');
      }
      return guessStatuses(guess, solution);
    });
  });
};
