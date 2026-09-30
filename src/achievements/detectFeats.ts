import { MAX_GUESSES, SCORING_VERSION } from '@/config';
import type { Language } from '@/types/firestore';
import { getGuessStatuses, normalizeWord, scoreHistory } from '@/utils/wordUtils';
import { FEAT_RULES, type EarnedFeat } from './config';

export interface FeatGame {
  words: Partial<Record<Language, string>>;
  guessHistory: string[];
}

export interface FeatContext {
  /** Certification level index (-1 for none) per language when the game started. Needed for Underdog. */
  startLevels?: Partial<Record<Language, number>>;
}

const activeLanguages = (words: FeatGame['words']) =>
  (Object.keys(words) as Language[]).filter((lang) => Boolean(words[lang]));

const underdogLang = (
  langs: Language[],
  solvedFirst: Language[],
  startLevels: Partial<Record<Language, number>>
): Language | undefined => {
  if (solvedFirst.length !== 1) {
    return undefined;
  }
  const levels = langs.map((lang) => startLevels[lang] ?? -1);
  const weakest = Math.min(...levels);
  const strongest = Math.max(...levels);
  const weakestLangs = langs.filter((lang) => (startLevels[lang] ?? -1) === weakest);
  const qualifies =
    weakestLangs.length === 1 &&
    strongest >= FEAT_RULES.underdogStrongestMinLevel &&
    strongest - weakest >= FEAT_RULES.underdogMinLevelGap;
  return qualifies && solvedFirst[0] === weakestLangs[0] ? weakestLangs[0] : undefined;
};

/** Every feat earned in a game so far, in the order they happened. */
export const detectFeats = (game: FeatGame, context: FeatContext = {}): EarnedFeat[] => {
  const langs = activeLanguages(game.words);
  const solutions = Object.fromEntries(
    langs.map((lang) => [lang, normalizeWord(game.words[lang]!)])
  ) as Record<Language, string>;
  const guesses = game.guessHistory.map(normalizeWord);
  const scoreTurns = scoreHistory(game.guessHistory, game.words, SCORING_VERSION);

  const feats: EarnedFeat[] = [];
  const solvedAt: Partial<Record<Language, number>> = {};
  const knownLetters = Object.fromEntries(langs.map((lang) => [lang, new Set<string>()]));
  const greenSlots = Object.fromEntries(langs.map((lang) => [lang, new Set<number>()]));
  const seenResults = Object.fromEntries(langs.map((lang) => [lang, new Set<string>()]));
  const playedLetters = new Set<string>();

  guesses.forEach((guess, index) => {
    const turn = index + 1;
    const open = langs.filter((lang) => solvedAt[lang] === undefined);
    const statuses = Object.fromEntries(
      open.map((lang) => [lang, getGuessStatuses(guess, solutions[lang])])
    );
    const solvedNow = open.filter((lang) => solutions[lang] === guess);

    solvedNow.forEach((lang) => {
      const known = knownLetters[lang].size;
      if (turn === 1) {
        feats.push({ id: 'firstTry', guess: turn, lang });
      } else if (known === 0) {
        feats.push({ id: 'hailMary', guess: turn, lang, value: 0 });
      } else if (known <= FEAT_RULES.outOfNowhereMaxKnown) {
        feats.push({ id: 'outOfNowhere', guess: turn, lang, value: known });
      }
    });

    if (solvedNow.length >= 2) {
      feats.push({ id: 'twoBirds', guess: turn });
    }

    if (open.length === langs.length && solvedNow.length > 0 && context.startLevels) {
      const lang = underdogLang(langs, solvedNow, context.startLevels);
      if (lang) {
        feats.push({ id: 'underdog', guess: turn, lang });
      }
    }

    const newTiles = (scoreTurns[index] ?? []).filter(
      (event) => event.kind === 'green' || event.kind === 'yellow'
    ).length;
    if (newTiles >= FEAT_RULES.jackpotMinTiles) {
      feats.push({ id: 'jackpot', guess: turn, value: newTiles });
    }

    open.forEach((lang) => {
      if (statuses[lang].every((status) => status === 'present')) {
        feats.push({ id: 'scrambled', guess: turn, lang });
      }
    });

    // A guess is informative if it tries a new letter, or shows any board a letter/position
    // result it hasn't seen (repeats of a letter already ruled out on that board don't count).
    let informative = [...guess].some((letter) => !playedLetters.has(letter));
    open.forEach((lang) => {
      statuses[lang].forEach((status, position) => {
        const letter = guess[position];
        if (status === 'absent' && !solutions[lang].includes(letter)) {
          return;
        }
        const key = `${position}${letter}${status}`;
        informative ||= !seenResults[lang].has(key);
        seenResults[lang].add(key);
      });
    });
    if (turn > 1 && !informative && solvedNow.length === 0 && open.length === langs.length) {
      feats.push({ id: 'dud', guess: turn });
    }

    [...guess].forEach((letter) => playedLetters.add(letter));
    open.forEach((lang) => {
      statuses[lang].forEach((status, position) => {
        if (status !== 'absent') {
          knownLetters[lang].add(guess[position]);
        }
        if (status === 'correct') {
          greenSlots[lang].add(position);
        }
      });
    });
    solvedNow.forEach((lang) => {
      solvedAt[lang] = turn;
    });
  });

  const lastTurn = guesses.length;
  const isWin = langs.length > 0 && langs.every((lang) => solvedAt[lang] !== undefined);
  const isOver = isWin || lastTurn >= MAX_GUESSES;
  if (!isOver) {
    return feats;
  }

  if (isWin) {
    const finalSolve = Math.max(...langs.map((lang) => solvedAt[lang]!));
    const lettersUsed = new Set(guesses.slice(0, finalSolve).join('')).size;
    if (lettersUsed <= FEAT_RULES.minimalistMaxLetters) {
      feats.push({ id: 'minimalist', guess: finalSolve, value: lettersUsed });
    }
    if (finalSolve <= FEAT_RULES.speedrunMaxGuesses) {
      feats.push({ id: 'speedrun', guess: finalSolve, value: finalSolve });
    }
  } else {
    const closeLang = langs.find(
      (lang) => solvedAt[lang] === undefined && greenSlots[lang].size >= FEAT_RULES.soCloseGreens
    );
    if (closeLang) {
      feats.push({ id: 'soClose', guess: lastTurn, lang: closeLang });
    }
  }

  return feats;
};

/** Stable key for one feat occurrence, used to spot feats that are new since the last guess. */
export const featKey = (feat: EarnedFeat) => `${feat.id}:${feat.guess}:${feat.lang ?? ''}`;
