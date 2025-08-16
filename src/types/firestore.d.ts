import { Timestamp } from 'firebase/firestore';

/**
 * Describes the structure of a document in the top-level 'users' collection.
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
    en: 'basic' | 'intermediate' | 'advanced';
    es: 'basic' | 'intermediate' | 'advanced';
    fr: 'basic' | 'intermediate' | 'advanced';
  };
}

/**
 * Describes a document within the 'friendships' subcollection of a user.
 * Document Path: /users/{userId}/friendships/{friendId}
 * Document ID is the friend's UID.
 */
export interface FriendshipDoc {
  /** The status of the friendship. */
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  /** The direction of the pending request relative to the parent user document. */
  direction: 'incoming' | 'outgoing' | null;
  /** The date the friendship was initiated or accepted. */
  since: Timestamp;
}

/**
 * Describes the structure of a document in the top-level 'games' collection.
 * Represents a single game played by a single user.
 */
export interface GameDoc {
  userId: string;
  gameId: string; // The UUID from the URL that defines the words
  words: {
    en: string;
    es: string;
    fr: string;
  };
  difficulties: {
    en: 'basic' | 'intermediate' | 'advanced';
    es: 'basic' | 'intermediate' | 'advanced';
    fr: 'basic' | 'intermediate' | 'advanced';
  };
  isLiveGame: boolean;
  guessHistory: string[];
  isWin: boolean | null;
  startedAt: Timestamp;
  completedAt: Timestamp | null;
  score: number | null;
}

/**
 * Describes a document in the top-level 'challenges' collection.
 * Manages a head-to-head match between two players for a specific gameId.
 */
export interface ChallengeDoc {
  gameId: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  challengerId: string;
  recipientId: string;
  createdAt: Timestamp;
  // Stores the results for each player as they complete the game.
  // The key is the player's UID.
  results: {
    [key: string]: {
      score: number; // Number of guesses
      isWin: boolean;
      completedAt: Timestamp;
    };
  };
  winnerId: string | 'tie' | null; // The UID of the winner, 'tie', or null if not finished.
}
