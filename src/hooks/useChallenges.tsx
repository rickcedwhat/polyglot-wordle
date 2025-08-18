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
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { ChallengeDoc, InviteDoc } from '@/types/firestore.d.ts';

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

  // Mutation to create a shareable invite link
  const createInviteMutation = useMutation({
    mutationFn: async ({ gameId }: { gameId: string }) => {
      if (!currentUser) {
        throw new Error('User not logged in.');
      }
      const invitesRef = collection(db, 'invites');

      const newInvite = {
        gameId,
        challengerId: currentUser.uid,
        challengerName: currentUser.displayName || 'A Player',
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(invitesRef, newInvite);
      return docRef.id; // Return the new invite ID
    },
    onSuccess: () => {
      // You could invalidate general challenge queries here if needed
    },
  });

  // Mutation to accept an invite, creating the real challenge
  const acceptInviteMutation = useMutation({
    mutationFn: async (invite: InviteDoc & { id: string }) => {
      if (!currentUser) {
        throw new Error('User not logged in.');
      }
      const batch = writeBatch(db);

      // 1. Create the new challenge document
      const challengesRef = collection(db, 'challenges');
      const newChallenge: Omit<ChallengeDoc, 'createdAt'> = {
        gameId: invite.gameId,
        challengerId: invite.challengerId,
        recipientId: currentUser.uid,
        status: 'accepted',
        results: {},
        winnerId: null,
      };
      const newChallengeRef = doc(challengesRef); // Create a ref with a new auto-generated ID
      batch.set(newChallengeRef, { ...newChallenge, createdAt: serverTimestamp() });

      // 2. Mark the invite as 'claimed' so it can't be reused
      const inviteRef = doc(db, 'invites', invite.id);
      batch.update(inviteRef, { status: 'claimed' });

      return batch.commit();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    ...challengesQuery,
    createChallenge: createChallengeMutation.mutateAsync,
    updateChallenge: updateChallengeMutation.mutateAsync,
    createInvite: createInviteMutation.mutateAsync,
    acceptInvite: acceptInviteMutation.mutateAsync,
  };
};
