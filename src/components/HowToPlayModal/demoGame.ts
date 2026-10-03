import type { GameBoardWordPools } from '@/components/Gameboard/Gameboard';
import type { Language } from '@/types/firestore';
import type { Dictionary } from '@/utils/wordUtils';

/** A small scripted game used to render the real boards in How to Play. */
export const DEMO_SOLUTION = { en: 'plant', es: 'playa', fr: 'plage' };

/** Board order is shuffled in a real game too, so the first board isn't always English. */
export const DEMO_BOARDS: Language[] = ['es', 'en', 'fr'];

/** Which demo languages each word is real in (drives underlines and flags). */
const WORDS: Record<string, Language[]> = {
  plate: ['en', 'fr'],
  crane: ['en'],
  playa: ['es'],
  plant: ['en', 'fr'],
  plage: ['fr'],
  audio: ['en', 'es', 'fr'],
  pilot: ['en'],
  melon: ['en', 'es', 'fr'],
  radio: ['en', 'es', 'fr'],
};

/** PLATE narrows the flags, CRANE settles them, then each board is solved. */
export const DEMO_WIN = ['plate', 'crane', 'playa', 'plant', 'plage'];

/** Runs out of guesses with the French board unsolved. */
export const DEMO_LOSS = ['plate', 'crane', 'playa', 'plant', 'audio', 'pilot', 'melon', 'radio'];

const dictionaryFor = (lang: Language): Dictionary =>
  Object.fromEntries(
    Object.entries(WORDS)
      .filter(([, langs]) => langs.includes(lang))
      .map(([word]) => [word, { display: word, d: 0.2, pos: 'noun', def: '', reviewed: true }])
  );

const dictionaries = Object.fromEntries(
  DEMO_BOARDS.map((lang) => [lang, dictionaryFor(lang)])
) as Record<Language, Dictionary>;

export const DEMO_POOLS: GameBoardWordPools = {
  dictionaries,
  master: Object.fromEntries(DEMO_BOARDS.map((lang) => [lang, Object.keys(dictionaries[lang])])),
};
