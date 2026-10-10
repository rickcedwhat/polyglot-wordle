import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import i18n from '@/i18n';
import type { ChallengeDoc } from '@/types/firestore';
import { markChallengeResultSeen } from '@/utils/challengeUtils';

export type ChallengeInboxItem = ChallengeDoc & { id: string };

const isNewInvite = (c: ChallengeDoc, userId: string) =>
  c.source === 'friend_invite' &&
  c.createdBy !== userId &&
  c.participants[userId]?.rsvp === 'pending';

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
    // Picks up new invites and results while the app stays open.
    refetchInterval: 60_000,
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

      if (unreadResult || isNewInvite(c, userId)) {
        unreadCount += 1;
      }

      // Needs you: a challenge you haven't finished (received, or a new-game challenge you sent),
      // OR a completed result you haven't seen
      if ((myScore === null || myScore === undefined) && c.status !== 'completed') {
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

interface ChallengeToast {
  toastId: string;
  challengeId: string;
  message: string;
  occurredAt: number;
}

/** One toast per new in-app invite and per unread completed challenge. */
const challengeToasts = (challenges: ChallengeInboxItem[], userId: string): ChallengeToast[] =>
  challenges.flatMap((c): ChallengeToast[] => {
    const me = c.participants[userId];
    if (isNewInvite(c, userId)) {
      const name = c.participants[c.createdBy]?.displayName || i18n.t('game.challenge.aFriend');
      return [
        {
          toastId: `${c.id}:${userId}:invite`,
          challengeId: c.id,
          message: i18n.t('challenges.toastInvite', { name }),
          occurredAt: c.createdAt.toMillis(),
        },
      ];
    }
    if (c.status !== 'completed' || !me || me.resultSeenAt) {
      return [];
    }
    const otherId = c.participantIds.find((id) => id !== userId);
    const other = otherId ? c.participants[otherId] : undefined;
    const myScore = me.score ?? 0;
    const theirScore = other?.score ?? 0;
    const name = other?.displayName || i18n.t('challenges.yourFriend');
    const outcome =
      myScore > theirScore ? 'toastWon' : myScore < theirScore ? 'toastLost' : 'toastTied';
    return [
      {
        toastId: `${c.id}:${userId}`,
        challengeId: c.id,
        message: i18n.t(`challenges.${outcome}`, { name, mine: myScore, theirs: theirScore }),
        occurredAt: Math.max(me.completedAt?.toMillis() ?? 0, other?.completedAt?.toMillis() ?? 0),
      },
    ];
  });

/**
 * Toasts invites and results that arrive mid-game, once each (persisted in localStorage).
 * Whatever is already waiting at sign-in, or arrives while not playing, is marked seen
 * silently and left to the Challenges badge.
 */
export const useChallengeResultToasts = (
  onToast: (item: { challengeId: string; message: string }) => void,
  { isPlaying }: { isPlaying: boolean }
) => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const { challenges, isSuccess } = useChallenges();
  const seenRef = useRef(readSeenToasts());
  const loadedForRef = useRef<string | null>(null);
  const gameplayEnteredAtRef = useRef<number | null>(null);

  useEffect(() => {
    gameplayEnteredAtRef.current = isPlaying ? Date.now() : null;
  }, [isPlaying]);

  useEffect(() => {
    if (!userId || !isSuccess) {
      return;
    }
    const fresh = challengeToasts(challenges, userId).filter(
      ({ toastId }) => !seenRef.current.has(toastId)
    );
    if (fresh.length > 0) {
      fresh.forEach(({ toastId }) => seenRef.current.add(toastId));
      writeSeenToasts(seenRef.current);
    }
    const arrivedLive = loadedForRef.current === userId;
    loadedForRef.current = userId;
    const gameplayEnteredAt = gameplayEnteredAtRef.current;
    if (arrivedLive && isPlaying && gameplayEnteredAt !== null) {
      fresh
        .filter(({ occurredAt }) => occurredAt >= gameplayEnteredAt)
        .forEach(({ challengeId, message }) => onToast({ challengeId, message }));
    }
  }, [challenges, userId, isSuccess, isPlaying, onToast]);
};
