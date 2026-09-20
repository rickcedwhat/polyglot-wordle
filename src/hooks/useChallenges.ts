import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { ChallengeDoc } from '@/types/firestore';
import { markChallengeResultSeen } from '@/utils/challengeUtils';

export type ChallengeInboxItem = ChallengeDoc & { id: string };

export const useChallenges = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const queryClient = useQueryClient();

  const challengesQuery = useQuery({
    queryKey: ['challenges', userId],
    queryFn: async (): Promise<ChallengeInboxItem[]> => {
      if (!userId) {
        return [];
      }
      const db = getFirestore();
      const q = query(
        collection(db, 'challenges'),
        where('participantIds', 'array-contains', userId)
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as ChallengeDoc) }));
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const challenges = challengesQuery.data ?? [];

  const categorized = useMemo(() => {
    if (!userId) {
      return { needsYou: [] as ChallengeInboxItem[], waiting: [], archive: [], unreadCount: 0 };
    }

    const needsYou: ChallengeInboxItem[] = [];
    const waiting: ChallengeInboxItem[] = [];
    const archive: ChallengeInboxItem[] = [];
    let unreadCount = 0;

    challenges.forEach((c) => {
      const me = c.participants[userId];
      const otherId = c.participantIds.find((id) => id !== userId);
      const other = otherId ? c.participants[otherId] : undefined;

      const iAmChallenger = c.createdBy === userId;
      const myScore = me?.score;
      const theirScore = other?.score;
      const unreadResult =
        c.status === 'completed' && me && !me.resultSeenAt && theirScore !== null;

      if (unreadResult) {
        unreadCount += 1;
      }

      // Needs you: received challenge you haven't finished, OR completed unread result
      if (
        !iAmChallenger &&
        (myScore === null || myScore === undefined) &&
        c.status !== 'completed'
      ) {
        needsYou.push(c);
        return;
      }
      if (unreadResult) {
        needsYou.push(c);
        return;
      }

      // Waiting: you challenged them and they haven't finished
      if (
        iAmChallenger &&
        (theirScore === null || theirScore === undefined) &&
        c.status !== 'completed'
      ) {
        waiting.push(c);
        return;
      }

      // Future friend_invite pending (you invited, they haven't accepted/started)
      if (c.source === 'friend_invite' && c.status === 'pending' && iAmChallenger) {
        waiting.push(c);
        return;
      }

      archive.push(c);
    });

    return { needsYou, waiting, archive, unreadCount };
  }, [challenges, userId]);

  const markSeenMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!userId) {
        return;
      }
      await markChallengeResultSeen(challengeId, userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges', userId] });
    },
  });

  return {
    ...challengesQuery,
    challenges,
    ...categorized,
    markResultSeen: markSeenMutation.mutateAsync,
  };
};

const TOAST_SEEN_KEY = 'polyglot_challenge_toasts_seen_v1';

const readSeenToasts = (): Set<string> => {
  try {
    const raw = localStorage.getItem(TOAST_SEEN_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

const writeSeenToasts = (ids: Set<string>) => {
  try {
    localStorage.setItem(TOAST_SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
};

/**
 * Fires a callback once per unread completed challenge (persisted in localStorage).
 */
export const useChallengeResultToasts = (
  onToast: (item: { challengeId: string; message: string }) => void
) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const { challenges } = useChallenges();
  const seenRef = useRef(readSeenToasts());

  useEffect(() => {
    if (!userId) {
      return;
    }

    challenges.forEach((c) => {
      const me = c.participants[userId];
      if (c.status !== 'completed' || !me || me.resultSeenAt) {
        return;
      }
      const toastId = `${c.id}:${userId}`;
      if (seenRef.current.has(toastId)) {
        return;
      }

      const otherId = c.participantIds.find((id) => id !== userId);
      const other = otherId ? c.participants[otherId] : undefined;
      const myScore = me.score ?? 0;
      const theirScore = other?.score ?? 0;
      const name = other?.displayName || 'Your friend';
      let outcome = 'tied';
      if (myScore > theirScore) {
        outcome = 'you won';
      } else if (myScore < theirScore) {
        outcome = 'you lost';
      }

      seenRef.current.add(toastId);
      writeSeenToasts(seenRef.current);
      onToast({
        challengeId: c.id,
        message: `${name} finished — ${outcome} ${myScore}–${theirScore}`,
      });
    });
  }, [challenges, userId, onToast]);
};
