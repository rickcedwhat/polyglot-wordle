import { Timestamp } from 'firebase/firestore';

// A helper for readability
export type Difficulty = 'basic' | 'intermediate' | 'advanced';
export type Language = 'en' | 'es' | 'fr';

/**
 * Represents the stats for a single language at a single difficulty.
 */
export interface LanguageDifficultyStats {
  boardsSolved: number;
  boardsFailed: number;
  averageGuesses: number;
  /**
   * An array of 9 numbers.
   * Index 0 = wins in 1 guess, ..., Index 7 = wins in 8 guesses.
   * Index 8 = losses (unsolved board).
   */
  guessDistribution: number[];
}

/**
 * Represents all stats for a single language, broken down by difficulty.
 */
export interface LanguageStats {
  basic: LanguageDifficultyStats;
  intermediate: LanguageDifficultyStats;
  advanced: LanguageDifficultyStats;
}

/**
 * The document stored in the top-level 'users' collection.
 * Document ID is the user's Firebase Auth UID.
 */
export interface UserDoc {
  displayName: string;
  email: string;
  photoURL: string;
  joinedAt: Timestamp;
  difficultyPrefs: {
    en: Difficulty;
    es: Difficulty;
    fr: Difficulty;
  } | null;
  // An array of game IDs (the UUIDs) that the user has pinned to their profile.
  pinnedGames: string[];
  isPrivate: boolean;
  stats: {
    // --- Overall Game Stats (across all difficulties) ---
    gamesPlayed: number;
    wins: number; // A "win" is solving all 3 words
    winPercentage: number;
    currentStreak: number; // Consecutive games won
    maxStreak: number;
    totalScore: number;
    highScore: number;
    // --- Language Stats (broken down by difficulty) ---
    languages: {
      en: LanguageStats;
      es: LanguageStats;
      fr: LanguageStats;
    };
  };
}

/**
 * A document within the 'friendships' subcollection of a user.
 * Path: /users/{userId}/friendships/{friendId}
 */
export interface FriendshipDoc {
  status: 'pending' | 'accepted';
  /** The direction of the pending request relative to the parent user document. */
  direction: 'incoming' | 'outgoing' | null;
  since: Timestamp;
}

/**
 * A document in the top-level 'games' collection.
 * Represents a single game played by a single user.
 */
export interface GameDoc {
  userId: string;
  gameId: string; // The UUID from the URL
  words: {
    en: string;
    es: string;
    fr: string;
  };
  difficulties: {
    en: Difficulty;
    es: Difficulty;
    fr: Difficulty;
  };
  shuffledLanguages: ('en' | 'es' | 'fr')[];
  isLiveGame: boolean;
  guessHistory: string[];
  isWin: boolean | null;
  score: number | null;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
}

/**
 * A document in the top-level 'challenges' collection.
 * Manages a match between two players for a specific gameId.
 */
export interface ChallengeDoc {
  gameId: string;
  createdAt: Timestamp;
  createdBy: string; // The UID of the user who created the challenge
  type: 'direct' | 'open';
  maxPlayers: number | null; // The limit for 'open' challenges
  participants: {
    [userId: string]: {
      displayName: string;
      photoURL: string;
      score: number | null;
      rsvp: 'pending' | 'accepted' | 'declined' | null;
      completedAt: Timestamp | null;
    };
  };
  participantIds: string[];
  winnerId: string | 'tie' | null;
}

/**
 * A document in the top-level 'invites' collection.
 * Holds a pending, anonymous challenge that can be claimed by a new user.
 */
export interface InviteDoc {
  challengerId: string;
  challengerName: string;
  gameId: string;
  createdAt: Timestamp;
  status: 'pending' | 'claimed';
}
