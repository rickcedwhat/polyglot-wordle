/**
 * Gemini tie-breaker for "maybe" words: Jev was unsure on a question that could change the
 * word's fate. Gemini answers that same question (without seeing Jev's pick), its answer
 * replaces Jev's, and the word is decided again.
 */
import { getLanguageName } from './lexicalValidity';
import { callGemini } from './meanings';
import { Language } from './types';
import {
  buildMeaningQuestions,
  buildWordQuestions,
  decide,
  meaningIndexFor,
  Outcome,
  ReviewResult,
} from './wordReview';

export const SETTLE_TASK = 'settle_v3';
const MAX_ROUNDS = 2;

/** Extra guidance for Gemini on questions where it drifts from the game's intent. */
const GUIDANCE: Record<string, string> = {
  realWord:
    'Plurals, feminine forms, conjugations, standard modern spellings and short forms that native speakers commonly use all count as real words.',
  censor:
    'Judge only the meaning given. Many words also have a crude slang meaning (like "cock" or "ass"); that does not make a clean meaning crude, because the game shows the word with this definition.',
  formUse:
    'Judge the inflection only, never the word: a rare, formal or literary noun like "zenith" in its dictionary form is everyday here. Forms used in normal conversation, such as the present subjunctive, are everyday; literary means verb tenses mostly limited to formal writing.',
};

/** The Jev question behind each unsure gate answer, and whether it is asked per meaning. */
const SOURCE: Record<string, { question: string; perMeaning: boolean }> = {
  realWord: { question: 'realWord', perMeaning: false },
  fused: { question: 'fused', perMeaning: false },
  variant: { question: 'spelling', perMeaning: false },
  block: { question: 'censor', perMeaning: true },
  crude: { question: 'censor', perMeaning: true },
  nonsense: { question: 'formSense', perMeaning: true },
  literary: { question: 'formUse', perMeaning: true },
  regional: { question: 'formUse', perMeaning: true },
  obscure: { question: 'obscure', perMeaning: true },
};

type Question = { instructions: string; criteria: Record<string, string> };

export interface Ruling {
  question: string;
  jev: string;
  jevProbability: number;
  gemini: string;
  reason: string;
}

export interface Settled {
  outcome: Outcome;
  rulings: Ruling[];
}

interface Ask {
  id: string;
  r: ReviewResult;
  question: string;
  perMeaning: boolean;
  q: Question;
}

/** Whether each tie-breakable question is asked about one meaning (see meaningIndexFor) rather than the word. */
export const PER_MEANING: Record<string, boolean> = Object.fromEntries(
  Object.values(SOURCE).map((s) => [s.question, s.perMeaning])
);

/** The unsure questions that kept the word a maybe; empty when Gemini cannot help (e.g. no meanings). */
export function asksFor(r: ReviewResult, outcome: Outcome): Omit<Ask, 'id'>[] {
  if (outcome.kind !== 'maybe') {
    return [];
  }
  const step = outcome.steps[outcome.steps.length - 1];
  const seen = new Set<string>();
  return step.unsure.flatMap((key) => {
    const source = SOURCE[key];
    if (!source || (source.perMeaning && !r.meanings.length) || seen.has(source.question)) {
      return [];
    }
    seen.add(source.question);
    const questions = source.perMeaning
      ? buildMeaningQuestions(r, r.meanings[meaningIndexFor(r, source.question)])
      : buildWordQuestions(r);
    const q = (questions as unknown as Record<string, Question>)[source.question];
    return [{ r, question: source.question, perMeaning: source.perMeaning, q }];
  });
}

async function askGemini(lang: Language, asks: Ask[], apiKey: string) {
  const langName = getLanguageName(lang);
  const items = asks.map((a) => ({
    id: a.id,
    word: a.r.display,
    ...(a.perMeaning ? {} : { meanings: a.r.meanings.map((m) => `(${m.pos}) ${m.def}`) }),
    question: a.q.instructions,
    ...(GUIDANCE[a.question] ? { guidance: GUIDANCE[a.question] } : {}),
    choices: a.q.criteria,
  }));
  const prompt = `You are helping build the ${langName} word list for a Wordle-style game. Each item below asks one question about a ${langName} word. Answer each question exactly as asked, picking one of its choice keys, and give a one-sentence reason. Judge as a typical adult native ${langName} speaker would. When a question names a meaning, judge only that meaning and ignore any other meanings the word has.

${JSON.stringify(items, null, 2)}
`;
  const schema = {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        choice: { type: 'string' },
        reason: { type: 'string' },
      },
      required: ['id', 'choice', 'reason'],
    },
  };
  return callGemini(prompt, schema, apiKey, 'gemini-2.5-flash', (raw) => {
    const rows = raw as { id: string; choice: string; reason: string }[];
    return asks.map((a) => {
      const row = rows.find((x) => x.id === a.id);
      if (!row || !(row.choice in a.q.criteria)) {
        throw new Error(`Gemini gave no valid choice for ${a.id}`);
      }
      return { ask: a, choice: row.choice, reason: row.reason };
    });
  });
}

/** Replaces Jev's answer to one question with a certain answer (Gemini's or a person's). */
export function withAnswer(r: ReviewResult, question: string, choice: string): ReviewResult {
  const answer = { choice, confidence: 1, probability: 1, probabilities: { [choice]: 1 } };
  if (!PER_MEANING[question]) {
    return { ...r, jev: { ...r.jev, [question]: answer } };
  }
  const target = meaningIndexFor(r, question);
  return {
    ...r,
    meanings: r.meanings.map((m, i) =>
      i === target ? { ...m, jev: { ...m.jev, [question]: answer } } : m
    ),
  };
}

/** Settles every maybe word in `results`, in batches; words that are not maybes pass through. */
export async function settleMaybes(
  lang: Language,
  results: ReviewResult[],
  apiKey: string,
  batchSize = 25
): Promise<Record<string, Settled>> {
  const state = new Map(results.map((r) => [r.word, { r, rulings: [] as Ruling[] }]));
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const asks: Ask[] = [];
    for (const { r } of state.values()) {
      asksFor(r, decide(r)).forEach((a, i) => asks.push({ ...a, id: `${r.word}#${i}` }));
    }
    if (!asks.length) {
      break;
    }
    for (let i = 0; i < asks.length; i += batchSize) {
      for (const { ask, choice, reason } of await askGemini(
        lang,
        asks.slice(i, i + batchSize),
        apiKey
      )) {
        const s = state.get(ask.r.word)!;
        const before = (ask.perMeaning
          ? s.r.meanings[meaningIndexFor(s.r, ask.question)].jev
          : s.r.jev) as unknown as Record<string, { choice: string; probability: number }>;
        s.rulings.push({
          question: ask.question,
          jev: before[ask.question].choice,
          jevProbability: before[ask.question].probability,
          gemini: choice,
          reason,
        });
        s.r = withAnswer(s.r, ask.question, choice);
      }
    }
  }
  return Object.fromEntries(
    [...state.entries()].map(([word, s]) => [word, { outcome: decide(s.r), rulings: s.rulings }])
  );
}
