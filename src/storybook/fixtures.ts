import type { Language } from '@/types/firestore';

export interface StoryGameFixture {
  label: string;
  /** Board order as it appears on screen (the game's shuffledLanguages). */
  languages: Language[];
  words: Partial<Record<Language, string>>;
  guesses: string[];
}

export const STORY_GAMES = {
  realGame: {
    label: 'Real game (PT/EN/IT, 6 guesses, IT unsolved)',
    languages: ['pt', 'en', 'it'],
    words: { pt: 'livro', en: 'apple', it: 'fiore' },
    guesses: ['trace', 'board', 'value', 'livro', 'piore', 'apple'],
  },
  quickWin: {
    label: 'Win (EN/ES/FR, 6 guesses)',
    languages: ['fr', 'en', 'es'],
    words: { en: 'apple', es: 'queso', fr: 'fruit' },
    guesses: ['crane', 'audio', 'plate', 'apple', 'fruit', 'queso'],
  },
  loss: {
    label: 'Loss (EN/IT/PT, 8 guesses, nothing solved)',
    languages: ['pt', 'en', 'it'],
    words: { en: 'apple', it: 'fiore', pt: 'livro' },
    guesses: ['radio', 'tempo', 'crane', 'board', 'value', 'music', 'pasta', 'trace'],
  },
  doubleSolve: {
    label: 'Double solve (ES/IT share "carta")',
    languages: ['it', 'es', 'pt'],
    words: { es: 'carta', it: 'carta', pt: 'porta' },
    guesses: ['audio', 'pasta', 'carta', 'porta'],
  },
} satisfies Record<string, StoryGameFixture>;

export type StoryGameKey = keyof typeof STORY_GAMES;
export const STORY_GAME_KEYS = Object.keys(STORY_GAMES) as StoryGameKey[];
