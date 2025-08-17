import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { ChallengeDoc } from '@/types/firestore.d.ts';

export const useChallenges = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['challenges', currentUser?.uid];

  // Query to fetch all challenges involving the current user
  const challengesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentUser) {
        return [];
      }
      const db = getFirestore();
      const challengesRef = collection(db, 'challenges');

      // Firestore requires two separate queries for an 'OR' on different fields
      const challengesAsChallenger = query(
        challengesRef,
        where('challengerId', '==', currentUser.uid)
      );
      const challengesAsRecipient = query(
        challengesRef,
        where('recipientId', '==', currentUser.uid)
      );

      const [challengerSnapshot, recipientSnapshot] = await Promise.all([
        getDocs(challengesAsChallenger),
        getDocs(challengesAsRecipient),
      ]);

      const challenges = new Map<string, ChallengeDoc & { id: string }>();
      challengerSnapshot.docs.forEach((d) =>
        challenges.set(d.id, { id: d.id, ...(d.data() as ChallengeDoc) })
      );
      recipientSnapshot.docs.forEach((d) =>
        challenges.set(d.id, { id: d.id, ...(d.data() as ChallengeDoc) })
      );

      return Array.from(challenges.values());
    },
    enabled: !!currentUser,
  });

  // --- Mutations ---
  const db = getFirestore();

  // Mutation to create a challenge
  const createChallengeMutation = useMutation({
    mutationFn: async ({ recipientId, gameId }: { recipientId: string; gameId: string }) => {
      if (!currentUser) {
        throw new Error('User not logged in.');
      }
      const challengesRef = collection(db, 'challenges');
      return addDoc(challengesRef, {
        gameId,
        challengerId: currentUser.uid,
        recipientId,
        status: 'pending',
        createdAt: serverTimestamp(),
        results: {},
        winnerId: null,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Mutation to accept, decline, or cancel a challenge
  const updateChallengeMutation = useMutation({
    mutationFn: async ({
      challengeId,
      action,
    }: {
      challengeId: string;
      action: 'accept' | 'decline' | 'cancel';
    }) => {
      if (!currentUser) {
        throw new Error('User not logged in.');
      }
      const challengeRef = doc(db, 'challenges', challengeId);

      if (action === 'cancel') {
        // TODO: Add security rule to ensure only the challenger can cancel
        return deleteDoc(challengeRef);
      }

      const newStatus = action === 'accept' ? 'accepted' : 'declined';
      // TODO: Add auto-complete logic here on 'accept'
      return updateDoc(challengeRef, { status: newStatus });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...challengesQuery,
    createChallenge: createChallengeMutation.mutateAsync,
    updateChallenge: updateChallengeMutation.mutateAsync,
  };
};
