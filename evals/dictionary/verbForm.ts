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

/** Citation form vs finite/inflected verb vs not a verb. */
export type VerbFormVerdict = 'infinitive' | 'finite' | 'not_a_verb';

/**
 * What the *current dictionary definition* primarily expresses.
 * Finite verb spellings may still be answer-eligible when defined as adj/noun/etc.
 */
export type DefSenseVerdict = 'non_verb_primary' | 'verb_primary' | 'unclear';

/**
 * Whether a conjugated spelling should be rewritten to a non-verb POS in the pipeline.
 */
export type AltPosVerdict =
  | 'rewrite_as_non_verb'
  | 'conjugation_only'
  | 'already_non_verb_def';

export interface VerbFormResult {
  word: string;
  lang: Language;
  display: string;
  pos: string;
  verdict: VerbFormVerdict;
  confidence: number;
  defSense: DefSenseVerdict;
  defSenseConfidence: number;
  altPos: AltPosVerdict;
  altPosConfidence: number;
  /**
   * If true, keep as guessable but exclude from puzzle answer pool.
   * Finite forms are blocked unless the definition is primarily a non-verb POS.
   */
  blockAsAnswer: boolean;
  /** Finite + verb-def but a common adj/noun reading exists — remediate should rewrite. */
  needsPosRewrite: boolean;
  latencyMs: number;
}

export function getLanguageName(lang: string): string {
  return LANGUAGE_NAMES[lang] || lang.toUpperCase();
}

export function buildVerbFormQuestion(entry: Pick<DictionaryEntry, 'lang' | 'display' | 'word' | 'pos'>) {
  const langName = getLanguageName(entry.lang);
  const shown = entry.display || entry.word;

  const infinitiveHint =
    entry.lang === 'en'
      ? 'dictionary citation / base form (to X without -s/-ed/-ing), e.g. speak, write, play'
      : entry.lang === 'es'
        ? 'infinitive ending in -ar/-er/-ir, e.g. hablar, comer, vivir'
        : entry.lang === 'fr'
          ? 'infinitive ending in -er/-ir/-re/-oir, e.g. parler, finir, vendre, voir'
          : entry.lang === 'pt'
            ? 'infinitive ending in -ar/-er/-ir, e.g. falar, comer, abrir'
            : 'dictionary citation / infinitive form';

  return {
    verbForm: choice(
      `Independent of the definition: for the 5-letter ${langName} token "${shown}" (tagged POS: ${entry.pos || 'unknown'}): which is true about the word-form?`,
      {
        infinitive: `Infinitive / citation verb form in ${langName} (${infinitiveHint})`,
        finite: `Finite or other inflected verb form in ${langName} (conjugated tense/person/mood, participle used as verb form, etc. — NOT the infinitive)`,
        not_a_verb: `Not a ${langName} verb (noun, adjective, name, foreign token, etc.)`,
      }
    ),
    defSense: choice(
      `Independent of the word-form question above: looking only at the dictionary definition in state for "${shown}", what does that definition primarily define?`,
      {
        non_verb_primary: `Primarily a noun, adjective, adverb, or other non-verb sense that can stand alone as a Wordle answer clue — even if this spelling is also a conjugated verb`,
        verb_primary: `Primarily the conjugated/inflected verb meaning (tense, person, mood, participle-as-verb, “past tense of X”, “3rd person of Y”, etc.)`,
        unclear: `Definition is empty, circular, mixed 50/50, or too vague to tell which POS it defines`,
      }
    ),
    altPos: choice(
      `Independent: for Wordle answer eligibility in ${langName}, should we rewrite "${shown}" to a non-verb POS + definition?`,
      {
        rewrite_as_non_verb: `Yes — this spelling also has a common everyday noun/adjective/adverb reading (e.g. participle used as adjective: tired/bored/known; plural noun that coincides with a verb form). Prefer that non-verb sense as the answer definition.`,
        conjugation_only: `No — keep it as conjugation-only (no solid everyday non-verb reading, or that reading is rare/obscure). Fine to exclude from the answer pool.`,
        already_non_verb_def: `N/A — the current definition already primarily defines a non-verb sense.`,
      }
    ),
  };
}

const ALLOWED_FORM: readonly VerbFormVerdict[] = ['infinitive', 'finite', 'not_a_verb'] as const;
const ALLOWED_DEF: readonly DefSenseVerdict[] = [
  'non_verb_primary',
  'verb_primary',
  'unclear',
] as const;
const ALLOWED_ALT: readonly AltPosVerdict[] = [
  'rewrite_as_non_verb',
  'conjugation_only',
  'already_non_verb_def',
] as const;

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
    throw new Error(`Invalid evaluation response: unknown ${label}.choice "${String(answerChoice)}"`);
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

/** Finite conjugations stay answer-eligible when defined as a non-verb POS. */
export function shouldBlockAsAnswer(
  verdict: VerbFormVerdict,
  formConfidence: number,
  defSense: DefSenseVerdict,
  defSenseConfidence: number,
  minConfidence = 0.5
): boolean {
  if (verdict !== 'finite' || formConfidence < minConfidence) return false;
  const definedAsNonVerb =
    defSense === 'non_verb_primary' && defSenseConfidence >= minConfidence;
  return !definedAsNonVerb;
}

/** Flag for remediate: rewrite POS+def to the non-verb reading. */
export function shouldRewritePos(
  verdict: VerbFormVerdict,
  formConfidence: number,
  altPos: AltPosVerdict,
  altPosConfidence: number,
  minConfidence = 0.5
): boolean {
  return (
    verdict === 'finite' &&
    formConfidence >= minConfidence &&
    altPos === 'rewrite_as_non_verb' &&
    altPosConfidence >= minConfidence
  );
}

export async function evaluateVerbFormWithJev(
  client: TypeSafeClient | { systemOne: TypeSafeClient['systemOne'] },
  entry: DictionaryEntry,
  model = 'jev-latest'
): Promise<VerbFormResult> {
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
      definition: entry.def || '(no definition)',
      task: 'verb_form_answer_eligibility',
    },
    questions: buildVerbFormQuestion(entry),
  });

  const verbForm = validateChoiceAnswer(
    response.answers?.verbForm,
    ALLOWED_FORM,
    'verbForm'
  );
  const defSense = validateChoiceAnswer(
    response.answers?.defSense,
    ALLOWED_DEF,
    'defSense'
  );
  const altPos = validateChoiceAnswer(response.answers?.altPos, ALLOWED_ALT, 'altPos');

  return {
    word: entry.word,
    lang: entry.lang,
    display: entry.display || entry.word,
    pos: entry.pos || '',
    verdict: verbForm.choice,
    confidence: verbForm.confidence,
    defSense: defSense.choice,
    defSenseConfidence: defSense.confidence,
    altPos: altPos.choice,
    altPosConfidence: altPos.confidence,
    blockAsAnswer: shouldBlockAsAnswer(
      verbForm.choice,
      verbForm.confidence,
      defSense.choice,
      defSense.confidence
    ),
    needsPosRewrite: shouldRewritePos(
      verbForm.choice,
      verbForm.confidence,
      altPos.choice,
      altPos.confidence
    ),
    latencyMs: Date.now() - startTime,
  };
}

/** Entries tagged as verbs (including slash tags like noun/verb). */
export function isVerbTagged(pos: string | undefined): boolean {
  if (!pos) return false;
  const parts = pos.toLowerCase().split(/[\/|,]/).map((p) => p.trim());
  return parts.includes('verb');
}
