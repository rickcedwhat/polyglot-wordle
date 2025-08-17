import { Timestamp } from 'firebase/firestore';

// A helper for readability
export type Difficulty = 'basic' | 'intermediate' | 'advanced';
export type Language = 'en' | 'es' | 'fr';

/**
 * The document stored in the top-level 'users' collection.
 * Document ID is the user's Firebase Auth UID.
 */
export interface UserDoc {
  displayName: string;
  email: string;
  photoURL: string;
  joinedAt: Timestamp;
  stats: {
    gamesPlayed: number;
    wins: number;
    currentStreak: number;
    maxStreak: number;
  };
  difficultyPrefs: {
    en: Difficulty;
    es: Difficulty;
    fr: Difficulty;
  };
  // An array of game IDs (the UUIDs) that the user has pinned to their profile.
  pinnedGames: string[];
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
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  challengerId: string;
  recipientId: string;
  createdAt: Timestamp;
  results: {
    [userId: string]: {
      score: number;
      isWin: boolean;
      completedAt: Timestamp;
    };
  };
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
