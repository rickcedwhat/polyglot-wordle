import type { Language } from '@/types/firestore';
import { normalizeWord, scoreHistory, type ScoreEvent } from './wordUtils';

/** One player's standing after a turn of a head-to-head replay. */
export interface DuelTurn {
  /** The guess played this turn; null at the start or once the player had already finished. */
  guess: string | null;
  /** Events scored this turn. */
  events: ScoreEvent[];
  /** Running points per language (penalties included, so they can go negative). */
  langTotals: Record<string, number>;
  /** Running points not tied to a language (crack, hat trick, all-solved bonus). */
  bonusTotal: number;
  total: number;
  /** 1-based turn each language was solved on, once solved. */
  solvedOn: Partial<Record<Language, number>>;
}

/** Standing after every turn: index 0 is the start, index `t` is after turn `t`. */
export function buildDuelTimeline(
  guesses: string[],
  words: Partial<Record<Language, string>>,
  languages: Language[],
  scoringVersion: number,
  turns: number
): DuelTurn[] {
  const scored = scoreHistory(guesses, words, scoringVersion);
  const timeline: DuelTurn[] = [
    {
      guess: null,
      events: [],
      langTotals: Object.fromEntries(languages.map((lang) => [lang, 0])),
      bonusTotal: 0,
      total: 0,
      solvedOn: {},
    },
  ];
  for (let turn = 1; turn <= turns; turn += 1) {
    const prev = timeline[turn - 1];
    const guess = guesses[turn - 1] ?? null;
    const events = scored[turn - 1] ?? [];
    const langTotals = { ...prev.langTotals };
    let { bonusTotal } = prev;
    for (const event of events) {
      if (event.lang) {
        langTotals[event.lang] = (langTotals[event.lang] ?? 0) + event.points;
      } else {
        bonusTotal += event.points;
      }
    }
    const solvedOn = { ...prev.solvedOn };
    if (guess) {
      for (const lang of languages) {
        if (!solvedOn[lang] && normalizeWord(guess) === normalizeWord(words[lang] ?? '')) {
          solvedOn[lang] = turn;
        }
      }
    }
    const total = bonusTotal + Object.values(langTotals).reduce((sum, points) => sum + points, 0);
    timeline.push({ guess, events, langTotals, bonusTotal, total, solvedOn });
  }
  return timeline;
}

/** Full bar length: the highest any language reached for either player during the replay. */
export const duelBarMax = (timelines: DuelTurn[][]): number =>
  Math.max(
    1,
    ...timelines.flatMap((timeline) => timeline.flatMap((turn) => Object.values(turn.langTotals)))
  );
