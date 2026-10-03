import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { ChallengeDoc, GameDoc, UserDoc } from '@/types/firestore';

/** One 1v1 challenge per opponent, so a game can be shared with any number of players. */
const challengeDocId = (challengerId: string, gameId: string, opponentId: string) =>
  `${challengerId}_${gameId}_${opponentId}`;

/** Pre-#61 id (one opponent per game). Existing docs keep it. */
const legacyChallengeDocId = (challengerId: string, gameId: string) => `${challengerId}_${gameId}`;

const emptyParticipant = (
  profile: Pick<UserDoc, 'displayName' | 'photoURL'>,
  rsvp: ChallengeDoc['participants'][string]['rsvp']
): ChallengeDoc['participants'][string] => ({
  displayName: profile.displayName || 'Player',
  photoURL: profile.photoURL || '',
  score: null,
  rsvp,
  completedAt: null,
  resultSeenAt: null,
});

/**
 * Upsert a share-based challenge when the opponent submits their first guess.
 * Idempotent for the deterministic doc id `${challengerId}_${gameId}_${opponentId}`.
 */
export const ensureShareChallengeOnFirstGuess = async (args: {
  challengerId: string;
  opponentId: string;
  gameId: string;
  opponentProfile: Pick<UserDoc, 'displayName' | 'photoURL'>;
}): Promise<void> => {
  const { challengerId, opponentId, gameId, opponentProfile } = args;
  if (!challengerId || !opponentId || challengerId === opponentId) {
    return;
  }

  const db = getFirestore();
  const legacyRef = doc(db, 'challenges', legacyChallengeDocId(challengerId, gameId));
  // A legacy doc owned by a different opponent is unreadable; treat that as "not mine".
  const legacy = await getDoc(legacyRef).catch(() => null);
  const legacyIsMine =
    !!legacy?.exists() && !!(legacy.data() as ChallengeDoc).participants[opponentId];
  const challengeRef = legacyIsMine
    ? legacyRef
    : doc(db, 'challenges', challengeDocId(challengerId, gameId, opponentId));
  const existing = legacyIsMine ? legacy : await getDoc(challengeRef);
  if (existing.exists()) {
    // Already tracked (e.g. refresh / retry) — ensure opponent is accepted.
    const data = existing.data() as ChallengeDoc;
    if (data.participants[opponentId]?.rsvp !== 'accepted') {
      await updateDoc(challengeRef, {
        [`participants.${opponentId}.rsvp`]: 'accepted',
        status: data.status === 'pending' ? 'active' : data.status,
      });
    }
    return;
  }

  const [challengerUserSnap, challengerGameSnap] = await Promise.all([
    getDoc(doc(db, 'users', challengerId)),
    getDoc(doc(db, 'games', `${challengerId}_${gameId}`)),
  ]);

  const challengerUser = challengerUserSnap.exists()
    ? (challengerUserSnap.data() as UserDoc)
    : null;
  const challengerGame = challengerGameSnap.exists()
    ? (challengerGameSnap.data() as GameDoc)
    : null;

  const challengerParticipant: ChallengeDoc['participants'][string] = {
    displayName: challengerUser?.displayName || 'Challenger',
    photoURL: challengerUser?.photoURL || '',
    score: challengerGame?.score ?? null,
    rsvp: 'accepted',
    completedAt: challengerGame?.completedAt ?? null,
    resultSeenAt: null,
  };

  const payload: ChallengeDoc = {
    gameId,
    createdAt: serverTimestamp() as Timestamp,
    createdBy: challengerId,
    source: 'share',
    type: 'direct',
    maxPlayers: 2,
    status: 'active',
    participants: {
      [challengerId]: challengerParticipant,
      [opponentId]: emptyParticipant(opponentProfile, 'accepted'),
    },
    participantIds: [challengerId, opponentId],
    winnerId: null,
  };

  await setDoc(challengeRef, payload);
};

export type FriendChallengeErrorCode = 'already_challenged' | 'not_allowed';

export class FriendChallengeError extends Error {
  constructor(public code: FriendChallengeErrorCode) {
    super(code);
    this.name = 'FriendChallengeError';
  }
}

/**
 * In-app challenge of an accepted friend on `gameId`.
 * If the challenger already has a game doc for `gameId` (post-game challenge), its saved
 * score is copied over; otherwise (new-game challenge) both players start fresh.
 * One challenge per friend per game (doc id `${challengerId}_${gameId}_${friendId}`).
 */
export const createFriendChallenge = async (args: {
  challengerId: string;
  challengerProfile: Pick<UserDoc, 'displayName' | 'photoURL'>;
  friend: { id: string; displayName: string; photoURL: string };
  gameId: string;
}): Promise<string> => {
  const { challengerId, challengerProfile, friend, gameId } = args;
  const db = getFirestore();
  const challengeId = challengeDocId(challengerId, gameId, friend.id);
  const challengeRef = doc(db, 'challenges', challengeId);

  const [existing, challengerGameSnap] = await Promise.all([
    getDoc(challengeRef).catch(() => null),
    getDoc(doc(db, 'games', `${challengerId}_${gameId}`)),
  ]);
  if (existing?.exists()) {
    throw new FriendChallengeError('already_challenged');
  }
  const challengerGame = challengerGameSnap.exists()
    ? (challengerGameSnap.data() as GameDoc)
    : null;

  const payload: ChallengeDoc = {
    gameId,
    createdAt: serverTimestamp() as Timestamp,
    createdBy: challengerId,
    source: 'friend_invite',
    type: 'direct',
    maxPlayers: 2,
    status: 'pending',
    participants: {
      [challengerId]: {
        ...emptyParticipant(challengerProfile, 'accepted'),
        score: challengerGame?.score ?? null,
        completedAt: challengerGame?.completedAt ?? null,
      },
      [friend.id]: emptyParticipant(friend, 'pending'),
    },
    participantIds: [challengerId, friend.id],
    winnerId: null,
  };

  try {
    await setDoc(challengeRef, payload);
  } catch {
    // Rules reject non-friends and friends who already played this game.
    throw new FriendChallengeError('not_allowed');
  }
  return challengeId;
};

/** Challenger withdraws an in-app challenge the friend hasn't started. */
export const cancelFriendChallenge = async (challengeId: string) => {
  await deleteDoc(doc(getFirestore(), 'challenges', challengeId));
};

const computeWinner = (
  participants: ChallengeDoc['participants'],
  ids: string[]
): ChallengeDoc['winnerId'] => {
  if (ids.length < 2) {
    return null;
  }
  const [a, b] = ids;
  const scoreA = participants[a]?.score;
  const scoreB = participants[b]?.score;
  if (scoreA === null || scoreA === undefined || scoreB === null || scoreB === undefined) {
    return null;
  }
  if (scoreA === scoreB) {
    return 'tie';
  }
  return scoreA > scoreB ? a : b;
};

/**
 * When a player finishes a challenge game, update their participant row and
 * complete the challenge once both scores are present.
 */
export const recordChallengeGameCompletion = async (args: {
  userId: string;
  gameId: string;
  challengerId: string | null;
  score: number;
}): Promise<void> => {
  const { userId, gameId, challengerId, score } = args;
  if (!challengerId) {
    // User finished their own game — update every challenge they sent on it.
    const db = getFirestore();
    const own = await getDocs(
      query(
        collection(db, 'challenges'),
        where('createdBy', '==', userId),
        where('gameId', '==', gameId)
      )
    );
    await Promise.all(own.docs.map((d) => applyCompletion(d.id, userId, score)));
    return;
  }

  if (await applyCompletion(challengeDocId(challengerId, gameId, userId), userId, score)) {
    return;
  }
  // Legacy doc may belong to another opponent, in which case the read is denied.
  await applyCompletion(legacyChallengeDocId(challengerId, gameId), userId, score).catch(
    () => false
  );
};

/** Returns whether a challenge containing `userId` was found and updated. */
const applyCompletion = async (
  challengeId: string,
  userId: string,
  score: number
): Promise<boolean> => {
  const db = getFirestore();
  const challengeRef = doc(db, 'challenges', challengeId);
  return runTransaction(db, async (transaction) => {
    const snap = await transaction.get(challengeRef);
    if (!snap.exists()) {
      return false;
    }

    const data = snap.data() as ChallengeDoc;
    if (!data.participantIds.includes(userId) || !data.participants[userId]) {
      return false;
    }

    const completedAt = serverTimestamp() as Timestamp;
    const participants = {
      ...data.participants,
      [userId]: {
        ...data.participants[userId],
        score,
        completedAt,
        resultSeenAt: null,
      },
    };
    const bothDone = data.participantIds.every(
      (id) => participants[id]?.score !== null && participants[id]?.score !== undefined
    );

    if (bothDone) {
      participants[userId] = {
        ...participants[userId],
        resultSeenAt: completedAt,
      };
    }

    transaction.update(challengeRef, {
      participants,
      winnerId: computeWinner(participants, data.participantIds),
      status: bothDone ? 'completed' : data.status,
    });
    return true;
  });
};

export const markChallengeResultSeen = async (challengeId: string, userId: string) => {
  const db = getFirestore();
  const challengeRef = doc(db, 'challenges', challengeId);
  await updateDoc(challengeRef, {
    [`participants.${userId}.resultSeenAt`]: serverTimestamp(),
  });
};
