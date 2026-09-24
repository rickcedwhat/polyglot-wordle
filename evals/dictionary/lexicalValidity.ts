import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import { DictionaryEntry, Language } from './types';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  it: 'Italian',
  de: 'German',
};

/** Verdicts for seed-list suitability (no definition required). */
export type LexicalVerdict =
  | 'valid'
  | 'proper_noun'
  | 'foreign_leak'
  | 'non_word'
  | 'multiword_or_clitic'
  | 'abbreviation'
  | 'offensive';

/**
 * Second signal: is this token a real word *form* in the target language?
 * Separates conjugations/plurals from gibberish when lexical alone says non_word.
 */
export type FormVerdict = 'lemma' | 'inflection' | 'not_a_word_form';

export const REJECT_VERDICTS: ReadonlySet<LexicalVerdict> = new Set([
  'proper_noun',
  'foreign_leak',
  'non_word',
  'multiword_or_clitic',
  'abbreviation',
  'offensive',
]);

/** Hard rejects that are not confused with conjugations. */
export const HARD_REJECT_VERDICTS: ReadonlySet<LexicalVerdict> = new Set([
  'proper_noun',
  'foreign_leak',
  'multiword_or_clitic',
  'abbreviation',
  'offensive',
]);

export interface PruneThresholds {
  /** Min confidence to prune hard rejects (names, English leaks, …). */
  hardRejectMin: number;
  /**
   * Softer hard-reject band: if lexical confidence is in
   * [hardRejectSoftMin, hardRejectMin) AND form=not_a_word_form at/above
   * hardRejectSoftFormMin, still prune. Keeps lemma/inflection forms
   * (e.g. índio, tenor) while dropping robin/maine-style names.
   */
  hardRejectSoftMin: number;
  hardRejectSoftFormMin: number;
  /**
   * If lexical=valid but form=not_a_word_form at/above this confidence,
   * treat as disagreement and prune (catches smoke/shark-style misses).
   */
  validDisagreeFormMin: number;
  /** Min lexical confidence to consider pruning non_word. */
  nonWordMin: number;
  /**
   * If form is lemma or inflection at/above this confidence, keep the token
   * even when lexical=non_word (protects real PT words Jev miscategorized).
   */
  formProtectMin: number;
  /**
   * When true, non_word is pruned only if form=not_a_word_form at/above
   * notAWordFormMin (stricter gate on gibberish).
   */
  requireNotAWordForm: boolean;
  notAWordFormMin: number;
}

export const DEFAULT_PRUNE_THRESHOLDS: PruneThresholds = {
  hardRejectMin: 0.55,
  hardRejectSoftMin: 0.35,
  hardRejectSoftFormMin: 0.5,
  validDisagreeFormMin: 0.65,
  nonWordMin: 0.5,
  formProtectMin: 0.5,
  requireNotAWordForm: true,
  notAWordFormMin: 0.5,
};

export interface LexicalValidityResult {
  word: string;
  lang: Language;
  display: string;
  verdict: LexicalVerdict;
  confidence: number;
  formVerdict: FormVerdict;
  formConfidence: number;
  shouldRemove: boolean;
  removeReason: string | null;
  latencyMs: number;
  enriched: boolean;
}

export function getLanguageName(lang: string): string {
  return LANGUAGE_NAMES[lang] || lang.toUpperCase();
}

export function buildLexicalValidityQuestion(
  entry: Pick<DictionaryEntry, 'lang' | 'display' | 'word'>
) {
  const langName = getLanguageName(entry.lang);
  const shown = entry.display || entry.word;

  return {
    lexical: choice(
      `Is the 5-letter token "${shown}" a real ${langName} word suitable for a general-audience Wordle puzzle in ${langName}?`,
      {
        valid: `Valid: Ordinary ${langName} content word that native speakers actually use (common dictionary headword / lemma — not merely a string that exists in some other language)`,
        proper_noun:
          'Reject: Personal given name, surname, brand/trademark, or specific place name with no common-noun sense',
        foreign_leak: `Reject: English or other foreign word that is NOT an established everyday ${langName} loanword — including identical English spellings (e.g. smoke, gross, drill) that are not normal ${langName} vocabulary`,
        non_word:
          'Reject: Typo, OCR/subtitle gibberish, nonsense letter string, or obsolete fragment — not a real word',
        multiword_or_clitic:
          'Reject: Verb+clitic / fused multi-word form unfair as a standalone puzzle answer (e.g. verlo, hazlo)',
        abbreviation:
          'Reject: Abbreviation, acronym, initialism, or clipped form (e.g. govt, dept)',
        offensive:
          'Reject: Explicit racial, ethnic, or sexual slur inappropriate for a general audience',
      }
    ),
    form: choice(`What kind of ${langName} word-form is the 5-letter token "${shown}"?`, {
      lemma: `Base dictionary lemma / headword in ${langName} (infinitive, singular noun, adjective base, etc.)`,
      inflection: `Standard ${langName} inflection — conjugated verb, plural, gender/number agreement, or other grammatical form of a real lemma`,
      not_a_word_form: `Not a real ${langName} word-form (gibberish, foreign token, name-only, or fragment)`,
    }),
  };
}

const ALLOWED_LEXICAL: readonly LexicalVerdict[] = [
  'valid',
  'proper_noun',
  'foreign_leak',
  'non_word',
  'multiword_or_clitic',
  'abbreviation',
  'offensive',
] as const;

const ALLOWED_FORM: readonly FormVerdict[] = ['lemma', 'inflection', 'not_a_word_form'] as const;

function validateChoiceAnswer<T extends string>(
  answer: unknown,
  allowed: readonly T[],
  label: string
): { choice: T; confidence: number } {
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
    throw new Error(`Invalid evaluation response: ${label} answer must be an object`);
  }
  const { choice: answerChoice, confidence } = answer as {
    choice?: unknown;
    confidence?: unknown;
  };
  if (typeof answerChoice !== 'string' || !allowed.includes(answerChoice as T)) {
    throw new Error(
      `Invalid evaluation response: unknown ${label}.choice "${String(answerChoice)}"`
    );
  }
  if (
    typeof confidence !== 'number' ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    throw new Error(`Invalid evaluation response: ${label}.confidence must be between 0 and 1`);
  }
  return { choice: answerChoice as T, confidence };
}

/**
 * Dual-signal prune decision. Use for analysis sweeps and eventual --prune.
 */
export function decideShouldRemove(
  verdict: LexicalVerdict,
  confidence: number,
  formVerdict: FormVerdict,
  formConfidence: number,
  thresholds: PruneThresholds = DEFAULT_PRUNE_THRESHOLDS
): { shouldRemove: boolean; reason: string | null } {
  if (verdict === 'valid') {
    if (formVerdict === 'not_a_word_form' && formConfidence >= thresholds.validDisagreeFormMin) {
      return {
        shouldRemove: true,
        reason: `valid_disagree:form=not_a_word_form@${formConfidence.toFixed(2)}`,
      };
    }
    return { shouldRemove: false, reason: null };
  }

  if (HARD_REJECT_VERDICTS.has(verdict)) {
    if (confidence >= thresholds.hardRejectMin) {
      return {
        shouldRemove: true,
        reason: `hard_reject:${verdict}@${confidence.toFixed(2)}`,
      };
    }
    if (
      confidence >= thresholds.hardRejectSoftMin &&
      formVerdict === 'not_a_word_form' &&
      formConfidence >= thresholds.hardRejectSoftFormMin
    ) {
      return {
        shouldRemove: true,
        reason: `hard_reject_soft:${verdict}@${confidence.toFixed(2)}+not_a_word_form@${formConfidence.toFixed(2)}`,
      };
    }
    return { shouldRemove: false, reason: null };
  }

  // lexical === non_word
  if (verdict === 'non_word') {
    if (
      (formVerdict === 'inflection' || formVerdict === 'lemma') &&
      formConfidence >= thresholds.formProtectMin
    ) {
      return {
        shouldRemove: false,
        reason: `protected_${formVerdict}@${formConfidence.toFixed(2)}`,
      };
    }

    if (confidence < thresholds.nonWordMin) {
      return { shouldRemove: false, reason: null };
    }

    if (thresholds.requireNotAWordForm) {
      if (formVerdict === 'not_a_word_form' && formConfidence >= thresholds.notAWordFormMin) {
        return {
          shouldRemove: true,
          reason: `non_word@${confidence.toFixed(2)}+not_a_word_form@${formConfidence.toFixed(2)}`,
        };
      }
      return { shouldRemove: false, reason: null };
    }

    return {
      shouldRemove: true,
      reason: `non_word@${confidence.toFixed(2)} (form=${formVerdict}@${formConfidence.toFixed(2)})`,
    };
  }

  return { shouldRemove: false, reason: null };
}

/**
 * Ask Jev whether a seed token is a suitable Wordle word in the target language.
 * Does not require a definition — designed to run before Gemini enrich.
 */
export async function evaluateLexicalValidityWithJev(
  client: TypeSafeClient | { systemOne: TypeSafeClient['systemOne'] },
  entry: DictionaryEntry,
  model = 'jev-latest',
  thresholds: PruneThresholds = DEFAULT_PRUNE_THRESHOLDS
): Promise<LexicalValidityResult> {
  const startTime = Date.now();
  const langName = getLanguageName(entry.lang);

  const response = await client.systemOne({
    model,
    state: {
      word: entry.word,
      display: entry.display || entry.word,
      languageCode: entry.lang,
      language: langName,
      partOfSpeech: entry.pos || 'unknown',
      definition: entry.def || '(no definition yet — judge the token itself)',
      task: 'lexical_validity_seed_screen_v2',
    },
    questions: buildLexicalValidityQuestion(entry),
  });

  const lexical = validateChoiceAnswer(response.answers?.lexical, ALLOWED_LEXICAL, 'lexical');
  const form = validateChoiceAnswer(response.answers?.form, ALLOWED_FORM, 'form');
  const decision = decideShouldRemove(
    lexical.choice,
    lexical.confidence,
    form.choice,
    form.confidence,
    thresholds
  );

  return {
    word: entry.word,
    lang: entry.lang,
    display: entry.display || entry.word,
    verdict: lexical.choice,
    confidence: lexical.confidence,
    formVerdict: form.choice,
    formConfidence: form.confidence,
    shouldRemove: decision.shouldRemove,
    removeReason: decision.reason,
    latencyMs: Date.now() - startTime,
    enriched: Boolean(entry.reviewed && entry.def && entry.def.length >= 15),
  };
}
