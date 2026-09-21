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

export type DifficultyTier =
  | 'Elementary / Everyday'
  | 'Intermediate / Common'
  | 'Advanced / Sophisticated'
  | 'Obscure / Archaic / Specialist';

export type AccuracyClassification = 'accurate' | 'wrong_pos' | 'wrong_meaning' | 'fabricated';

export type QualityClassification =
  | 'high_quality'
  | 'vague_or_circular'
  | 'robotic_filler'
  | 'grammatical_glitch';

export interface JevEvaluationResult {
  word: string;
  lang: Language;
  display: string;
  currentPos: string;
  currentDef: string;
  currentD: number;

  // Jev assessment
  difficultyTier: DifficultyTier;
  assessedD: number; // mapped difficulty score (0.15, 0.50, 0.75, 0.95)
  difficultyConfidence: number;

  accuracy: AccuracyClassification;
  accuracyConfidence: number;

  quality: QualityClassification;
  qualityConfidence: number;

  needsReexamine: boolean;
  needsReexamineProb: number;

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
  assessedD: number;
  difficultyTier: DifficultyTier;
  accuracy: AccuracyClassification;
  quality: QualityClassification;
  needsReexamineProb: number;
  severity: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface EvalRunStats {
  totalProcessed: number;
  flaggedCount: number;
  byLanguage: Record<
    Language,
    {
      total: number;
      flagged: number;
      bySeverity: { high: number; medium: number; low: number };
    }
  >;
  byAccuracy: Record<AccuracyClassification, number>;
  byQuality: Record<QualityClassification, number>;
  averageLatencyMs: number;
}
