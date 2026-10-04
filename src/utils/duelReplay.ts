import type { Language } from '@/types/firestore';
import { normalizeWord, scoreHistory, type ScoreEvent } from './wordUtils';

/** One player's standing after a turn of a head-to-head replay. */
export interface DuelTurn {
  /** The guess played this turn; null at the start or once the player had already finished. */
  guess: string | null;
  /** Events scored this turn. */
  events: ScoreEvent[];
  /** Running points per language from its greens and yellows. */
  langTotals: Record<string, number>;
  /** Running points from everything else: solves, penalties and game bonuses. */
  bonusTotal: number;
  total: number;
  /** 1-based turn each language was solved on, once solved. */
  solvedOn: Partial<Record<Language, number>>;
  /** Languages that took the unsolved penalty, once it lands. */
  unsolved: Language[];
}

/** Greens and yellows build a language's bar; bigger swings go straight to the total. */
export const isLetterEvent = (event: ScoreEvent) =>
  Boolean(event.lang) && (event.kind === 'green' || event.kind === 'yellow');

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
      unsolved: [],
    },
  ];
  for (let turn = 1; turn <= turns; turn += 1) {
    const prev = timeline[turn - 1];
    const guess = guesses[turn - 1] ?? null;
    const events = scored[turn - 1] ?? [];
    const langTotals = { ...prev.langTotals };
    let { bonusTotal } = prev;
    for (const event of events) {
      if (isLetterEvent(event)) {
        langTotals[event.lang!] = (langTotals[event.lang!] ?? 0) + event.points;
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
    const unsolved = [
      ...prev.unsolved,
      ...events.flatMap((e) => (e.kind === 'penalty' && e.lang ? [e.lang] : [])),
    ];
    const total = bonusTotal + Object.values(langTotals).reduce((sum, points) => sum + points, 0);
    timeline.push({ guess, events, langTotals, bonusTotal, total, solvedOn, unsolved });
  }
  return timeline;
}

/** Full language-bar length: the highest any language reached for either player. */
export const duelBarMax = (timelines: DuelTurn[][]): number =>
  Math.max(
    1,
    ...timelines.flatMap((timeline) => timeline.flatMap((turn) => Object.values(turn.langTotals)))
  );

/** Full score-bar length: the highest total either player reached. */
export const duelTotalMax = (timelines: DuelTurn[][]): number =>
  Math.max(1, ...timelines.flatMap((timeline) => timeline.map((turn) => turn.total)));
