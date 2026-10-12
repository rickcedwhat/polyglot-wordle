/**
 * Manual calls on single words, kept in overrides.json (edited by hand or from the word-trees
 * review page). They live in source so re-running the review never undoes them.
 *
 * Two kinds:
 * - answers: a person answers the questions Jev was unsure about, exactly like the Gemini
 *   tie-breaker does. Their answers beat Gemini's, and the rules decide the fate as usual.
 * - fate: a person sets the fate outright, for words where the rules themselves give the wrong
 *   result (e.g. a mild insult that should be an answer).
 */
import overrides from './overrides.json';
import { Settled, withAnswer } from './settle';
import { Language } from './types';
import {
  decide,
  Difficulty,
  difficultyOf,
  Fate,
  meaningIndexFor,
  Outcome,
  ReviewResult,
} from './wordReview';

export interface Override {
  /** Sets the fate outright; wins over `answers`. */
  fate?: Fate | 'answer';
  /** For a fate of answer; defaults to Jev's difficulty for the main meaning. */
  difficulty?: Difficulty;
  /** Answers to the questions Jev was unsure about, keyed by question (e.g. obscure). */
  answers?: Record<string, string>;
  reason?: string;
  date: string;
}

export const OVERRIDES = overrides as Partial<Record<Language, Record<string, Override>>>;

type FateOverride = Override & { fate: Fate | 'answer' };

export type FinalOutcome =
  | Outcome
  | { kind: Fate; manual: FateOverride; steps: Outcome['steps'] }
  | { kind: 'answer'; difficulty: Difficulty; manual: FateOverride; steps: Outcome['steps'] };

export type Source = 'jev' | 'gemini' | 'manual';

export interface Final {
  outcome: FinalOutcome;
  source: Source;
  /** What Jev and the tie-breaker decide without the override. */
  auto: Outcome;
  ruling?: Settled;
}

/** Jev's answers with Gemini's rulings and then a person's answers laid on top. */
export function withSettledAnswers(
  r: ReviewResult,
  ruling: Settled | undefined,
  answers: Record<string, string> = {}
): ReviewResult {
  let out = r;
  for (const x of ruling?.rulings ?? []) {
    out = withAnswer(out, x.question, x.gemini);
  }
  for (const [question, choice] of Object.entries(answers)) {
    out = withAnswer(out, question, choice);
  }
  return out;
}

/** The word's fate: a manual override, else the tie-breaker's ruling for a maybe, else Jev's. */
export function finalOutcome(r: ReviewResult, settled: Record<string, Settled> = {}): Final {
  const jev = decide(r);
  const ruling = jev.kind === 'maybe' ? settled[r.word] : undefined;
  const auto = ruling?.outcome ?? jev;
  const source: Source = ruling ? 'gemini' : 'jev';
  const manual = OVERRIDES[r.lang]?.[r.word];
  if (manual?.fate) {
    const m = manual as FateOverride;
    const outcome: FinalOutcome =
      m.fate === 'answer'
        ? {
            kind: 'answer',
            difficulty:
              m.difficulty ??
              (r.meanings.length
                ? difficultyOf(r.meanings[meaningIndexFor(r, 'obscure')].jev)
                : 'advanced'),
            manual: m,
            steps: jev.steps,
          }
        : { kind: m.fate, manual: m, steps: jev.steps };
    return { outcome, source: 'manual', auto, ruling };
  }
  if (manual?.answers && Object.keys(manual.answers).length) {
    const outcome = decide(withSettledAnswers(r, ruling, manual.answers));
    return { outcome, source: 'manual', auto, ruling };
  }
  return { outcome: auto, source, auto, ruling };
}

export function fateLabel(o: FinalOutcome): string {
  return o.kind === 'answer' ? `answer (${o.difficulty})` : o.kind.replace('_', '-');
}
