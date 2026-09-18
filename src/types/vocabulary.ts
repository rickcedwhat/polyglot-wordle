import { Language } from './firestore';

export interface DiscoveredWordRecord {
  timesGuessed: number;
  firstSeen: string; // ISO timestamp string
  lastSeen: string; // ISO timestamp string
  isSolved?: boolean; // true if this word was a winning target word
}

export interface LanguageVocabularyDoc {
  words: Record<string, DiscoveredWordRecord>;
  totalCount: number;
}

export type UserVocabularyMap = Record<Language, Record<string, DiscoveredWordRecord>>;

export interface DiscoveredWordEntry extends DiscoveredWordRecord {
  key: string;
  lang: Language;
  display: string;
  pos: string;
  d: number;
  def: string;
}
