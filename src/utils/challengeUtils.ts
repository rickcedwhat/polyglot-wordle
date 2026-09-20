import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import type { ChallengeDoc, GameDoc, UserDoc } from '@/types/firestore';

export const challengeDocId = (challengerId: string, gameId: string) => `${challengerId}_${gameId}`;

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
 * Idempotent for the deterministic doc id `${challengerId}_${gameId}`.
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
  const challengeRef = doc(db, 'challenges', challengeDocId(challengerId, gameId));
  const existing = await getDoc(challengeRef);
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
    // User finished their own shared game — look up challenge by createdBy + gameId
    const db = getFirestore();
    const ownChallengeRef = doc(db, 'challenges', challengeDocId(userId, gameId));
    const ownSnap = await getDoc(ownChallengeRef);
    if (!ownSnap.exists()) {
      return; // No opponent has joined yet
    }
    await applyCompletion(ownChallengeRef.id, userId, score);
    return;
  }

  await applyCompletion(challengeDocId(challengerId, gameId), userId, score);
};

const applyCompletion = async (challengeId: string, userId: string, score: number) => {
  const db = getFirestore();
  const challengeRef = doc(db, 'challenges', challengeId);
  const snap = await getDoc(challengeRef);
  if (!snap.exists()) {
    return;
  }

  const data = snap.data() as ChallengeDoc;
  if (!data.participantIds.includes(userId)) {
    return;
  }

  const participants = {
    ...data.participants,
    [userId]: {
      ...data.participants[userId],
      score,
      completedAt: serverTimestamp() as Timestamp,
      // Finisher has seen their own result; clear for the other player
      resultSeenAt: serverTimestamp() as Timestamp,
    },
  };

  // Mark the other participant's result as unseen so they get a badge/toast
  data.participantIds.forEach((id) => {
    if (id !== userId && participants[id]) {
      participants[id] = {
        ...participants[id],
        resultSeenAt: null,
      };
    }
  });

  const winnerId = computeWinner(participants, data.participantIds);
  const bothDone = data.participantIds.every(
    (id) => participants[id]?.score !== null && participants[id]?.score !== undefined
  );

  await updateDoc(challengeRef, {
    participants,
    winnerId,
    status: bothDone ? 'completed' : data.status,
  });
};

export const markChallengeResultSeen = async (challengeId: string, userId: string) => {
  const db = getFirestore();
  const challengeRef = doc(db, 'challenges', challengeId);
  await updateDoc(challengeRef, {
    [`participants.${userId}.resultSeenAt`]: serverTimestamp(),
  });
};
