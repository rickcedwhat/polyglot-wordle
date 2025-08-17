import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, getFirestore, query, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { FriendshipDoc } from '@/types/firestore.d.ts';

export const useFriendships = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['friendships', currentUser?.uid];

  // Query to fetch all of the current user's friendship documents
  const friendshipsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentUser) {
        return [];
      }
      const db = getFirestore();
      const friendshipsRef = collection(db, 'users', currentUser.uid, 'friendships');
      const q = query(friendshipsRef);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as (FriendshipDoc & {
        id: string;
      })[];
    },
    enabled: !!currentUser,
  });

  // --- Mutations ---
  const db = getFirestore();

  // Mutation to send a friend request
  const sendRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      if (!currentUser) {
        throw new Error('User not logged in.');
      }
      const batch = writeBatch(db);

      // Add a pending request to your own friendships subcollection
      const myFriendshipRef = doc(db, 'users', currentUser.uid, 'friendships', friendId);
      batch.set(myFriendshipRef, { status: 'pending', direction: 'outgoing', since: new Date() });

      // Add a pending request to the other user's subcollection
      const theirFriendshipRef = doc(db, 'users', friendId, 'friendships', currentUser.uid);
      batch.set(theirFriendshipRef, {
        status: 'pending',
        direction: 'incoming',
        since: new Date(),
      });

      return batch.commit();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Mutation to accept a friend request
  const acceptRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      if (!currentUser) {
        throw new Error('User not logged in.');
      }
      const batch = writeBatch(db);

      const myFriendshipRef = doc(db, 'users', currentUser.uid, 'friendships', friendId);
      batch.update(myFriendshipRef, { status: 'accepted', direction: null });

      const theirFriendshipRef = doc(db, 'users', friendId, 'friendships', currentUser.uid);
      batch.update(theirFriendshipRef, { status: 'accepted', direction: null });

      return batch.commit();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  // Mutation for declining, canceling, or unfriending
  const removeFriendshipMutation = useMutation({
    mutationFn: async (friendId: string) => {
      if (!currentUser) {
        throw new Error('User not logged in.');
      }
      const batch = writeBatch(db);

      const myFriendshipRef = doc(db, 'users', currentUser.uid, 'friendships', friendId);
      batch.delete(myFriendshipRef);

      const theirFriendshipRef = doc(db, 'users', friendId, 'friendships', currentUser.uid);
      batch.delete(theirFriendshipRef);

      return batch.commit();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    ...friendshipsQuery,
    sendRequest: sendRequestMutation.mutateAsync,
    acceptRequest: acceptRequestMutation.mutateAsync,
    removeFriendship: removeFriendshipMutation.mutateAsync,
  };
};
