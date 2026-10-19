import { useIsMutating, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { reactionKey, type ReactionTarget } from '@/utils/activityTimeline';

export const REACTIONS = ['applause', 'fire', 'mindBlown', 'laugh', 'heart'] as const;
export type ReactionEmoji = (typeof REACTIONS)[number];
export const REACTION_EMOJI: Record<ReactionEmoji, string> = {
  applause: '👏',
  fire: '🔥',
  mindBlown: '🤯',
  laugh: '😂',
  heart: '❤️',
};
export interface ActivityReaction {
  userId: string;
  emoji: ReactionEmoji;
  targetKey: string;
}
export const saveActivityReaction = async (
  target: ReactionTarget,
  userId: string,
  emoji: ReactionEmoji,
  selected: boolean
) => {
  const db = getFirestore();
  const key = reactionKey(target);
  const ref = doc(db, 'reactions', `${key}__${userId}__${emoji}`);
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(ref);
    if (selected && !snapshot.exists()) {
      tx.set(ref, { ...target, targetKey: key, userId, emoji, createdAt: serverTimestamp() });
    } else if (!selected && snapshot.exists()) {
      tx.delete(ref);
    }
  });
};
export const useActivityReactions = (target: ReactionTarget) => {
  const { currentUser } = useAuth();
  const client = useQueryClient();
  const key = ['activityReactions', reactionKey(target), currentUser?.uid];
  const reactions = useQuery({
    queryKey: key,
    enabled: !!currentUser,
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(getFirestore(), 'reactions'),
          where('targetKey', '==', reactionKey(target))
        )
      );
      return snap.docs
        .map((doc) => doc.data() as ActivityReaction)
        .filter((item) => REACTIONS.includes(item.emoji));
    },
    staleTime: 15_000,
  });
  const mutationKey = ['activityReactionWrite', reactionKey(target)];
  const saving = useIsMutating({ mutationKey }) > 0;
  const mutation = useMutation({
    mutationKey,
    mutationFn: async ({ emoji, selected }: { emoji: ReactionEmoji; selected: boolean }) => {
      if (!currentUser) {
        throw new Error('Sign in to react');
      }
      await saveActivityReaction(target, currentUser.uid, emoji, selected);
    },
    onMutate: async ({ emoji, selected }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<ActivityReaction[]>(key);
      client.setQueryData<ActivityReaction[]>(key, (old = []) => [
        ...old.filter((item) => !(item.userId === currentUser?.uid && item.emoji === emoji)),
        ...(selected && currentUser
          ? [{ userId: currentUser.uid, emoji, targetKey: reactionKey(target) }]
          : []),
      ]);
      return { previous };
    },
    onError: (_error, variables, context) =>
      client.setQueryData<ActivityReaction[]>(key, (old = []) => [
        ...old.filter(
          (item) => !(item.userId === currentUser?.uid && item.emoji === variables.emoji)
        ),
        ...(context?.previous ?? []).filter(
          (item) => item.userId === currentUser?.uid && item.emoji === variables.emoji
        ),
      ]),
    onSettled: () => {
      if (client.isMutating({ mutationKey }) === 1) {
        return client.invalidateQueries({ queryKey: key });
      }
    },
  });
  return {
    ...reactions,
    toggle: mutation.mutateAsync,
    isSaving: saving,
    currentUserId: currentUser?.uid,
  };
};
