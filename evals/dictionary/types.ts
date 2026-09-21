export type Language = 'en' | 'es' | 'fr';

export interface RawDictionaryEntry {
  display: string;
  d: number;
  pos: string;
  def: string;
  reviewed?: boolean;
}

export type RawDictionary = Record<string, RawDictionaryEntry>;

export interface DictionaryEntry extends RawDictionaryEntry {
  word: string;
  lang: Language;
}

export type DefinitionVerdict =
  | 'accurate'
  | 'inflected_form'
  | 'wrong_pos'
  | 'wrong_meaning'
  | 'fabricated';

export type FormatVerdict =
  | 'clean_dictionary'
  | 'vague_circular'
  | 'robotic_filler'
  | 'malformed_syntax';

export function mapScoreToTier(d: number): DifficultyTier {
  if (d <= 0.5) {
    return 'elementary';
  }
  if (d <= 0.75) {
    return 'intermediate';
  }
  if (d <= 0.89) {
    return 'advanced';
  }
  return 'obscure';
}

export interface JevEvaluationResult {
  word: string;
  lang: Language;
  display: string;
  currentPos: string;
  currentDef: string;
  currentD: number;
  ourTier: DifficultyTier;

  // Jev assessment (pure multiple-choice decisions)
  definitionVerdict: DefinitionVerdict;
  definitionConfidence: number;

  formatVerdict: FormatVerdict;
  formatConfidence: number;

  jevTier: DifficultyTier;
  difficultyConfidence: number;

  difficultyMatches: boolean;

  // Derived triage
  reasons: string[];
  severity: 'high' | 'medium' | 'low' | 'none';
  latencyMs: number;
}

export interface ReviewQueueItem {
  word: string;
  lang: Language;
  display: string;
  pos: string;
  currentDef: string;
  currentD: number;
  ourTier: DifficultyTier;
  jevTier: DifficultyTier;
  difficultyMatches: boolean;
  definitionVerdict: DefinitionVerdict;
  formatVerdict: FormatVerdict;
  severity: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface EvalRunStats {
  totalProcessed: number;
  flaggedCount: number;
  difficultyMismatches: number;
  byLanguage: Record<
    Language,
    {
      total: number;
      flagged: number;
      bySeverity: { high: number; medium: number; low: number };
    }
  >;
  byDefinition: Record<DefinitionVerdict, number>;
  byFormat: Record<FormatVerdict, number>;
  byJevTier: Record<DifficultyTier, number>;
  averageLatencyMs: number;
}
