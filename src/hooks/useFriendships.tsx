import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, doc, getDocs, getFirestore, query, writeBatch } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { FriendshipDoc } from '@/types/firestore';

// The hook now accepts the ID of the user whose friend list we want to view
export const useFriendships = (userId: string | undefined) => {
  const { currentUser } = useAuth(); // We still need the logged-in user for mutations
  const queryClient = useQueryClient();
  const queryKey = ['friendships', userId];

  const friendshipsQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) {
        return [];
      }
      const db = getFirestore();
      const friendshipsRef = collection(db, 'users', userId, 'friendships');
      const q = query(friendshipsRef);
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as FriendshipDoc) }));
    },
    enabled: !!userId,
  });

  // New helper function to interpret the friendship status
  const getFriendshipStatus = (friendId?: string) => {
    if (!friendId) {
      return 'none';
    }
    const friendship = friendshipsQuery.data?.find((f) => f.id === friendId);
    if (!friendship) {
      return 'none';
    }
    if (friendship.status === 'accepted') {
      return 'friends';
    }
    if (friendship.status === 'pending' && friendship.direction === 'outgoing') {
      return 'pending_sent';
    }
    if (friendship.status === 'pending' && friendship.direction === 'incoming') {
      return 'pending_received';
    }
    return 'none';
  };

  // --- Mutations (these always act on behalf of the `currentUser`) ---
  const db = getFirestore();

  //   Mutation to send a friend request
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
    getFriendshipStatus, // Expose the new helper function
    sendRequest: sendRequestMutation.mutateAsync,
    acceptRequest: acceptRequestMutation.mutateAsync,
    removeFriendship: removeFriendshipMutation.mutateAsync,
  };
};
