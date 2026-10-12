/**
 * Manual calls on single words. They win over Jev and the Gemini tie-breaker, and live here in
 * source so re-running the review never undoes them. The summary lists every override next to
 * what the pipeline says today, so ones the pipeline now agrees with can be dropped.
 */
import { Settled } from './settle';
import { Language } from './types';
import { decide, Difficulty, difficultyOf, Fate, mainMeaningIndex, Outcome, ReviewResult } from './wordReview';

export interface Override {
  fate: Fate | 'answer';
  /** For answers; defaults to Jev's difficulty for the main meaning. */
  difficulty?: Difficulty;
  reason: string;
  date: string;
}

export const OVERRIDES: Partial<Record<Language, Record<string, Override>>> = {
  en: {
    idiot: { fate: 'answer', reason: 'A mild insult; fine as an answer.', date: '2026-10-12' },
    rapes: { fate: 'guess_only', reason: 'Too grim to be an answer.', date: '2026-10-12' },
  },
  es: {
    quite: {
      fate: 'answer',
      difficulty: 'intermediate',
      reason: 'Mainly a common form of "quitar"; Jev took the rare noun as the main meaning.',
      date: '2026-10-12',
    },
  },
};

export type FinalOutcome =
  | Outcome
  | { kind: Fate; manual: Override; steps: Outcome['steps'] }
  | { kind: 'answer'; difficulty: Difficulty; manual: Override; steps: Outcome['steps'] };

export type Source = 'jev' | 'gemini' | 'manual';

export interface Final {
  outcome: FinalOutcome;
  source: Source;
  /** What Jev and the tie-breaker decide without the override. */
  auto: Outcome;
  ruling?: Settled;
}

/** The word's fate: a manual override, else the tie-breaker's ruling for a maybe, else Jev's. */
export function finalOutcome(r: ReviewResult, settled: Record<string, Settled> = {}): Final {
  const jev = decide(r);
  const ruling = jev.kind === 'maybe' ? settled[r.word] : undefined;
  const auto = ruling?.outcome ?? jev;
  const source: Source = ruling ? 'gemini' : 'jev';
  const manual = OVERRIDES[r.lang]?.[r.word];
  if (!manual) {
    return { outcome: auto, source, auto, ruling };
  }
  const outcome: FinalOutcome =
    manual.fate === 'answer'
      ? {
          kind: 'answer',
          difficulty:
            manual.difficulty ??
            (r.meanings.length ? difficultyOf(r.meanings[mainMeaningIndex(r)].jev) : 'advanced'),
          manual,
          steps: jev.steps,
        }
      : { kind: manual.fate, manual, steps: jev.steps };
  return { outcome, source: 'manual', auto, ruling };
}

export function fateLabel(o: FinalOutcome): string {
  return o.kind === 'answer' ? `answer (${o.difficulty})` : o.kind.replace('_', '-');
}
