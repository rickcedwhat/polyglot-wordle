import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  writeBatch,
  type DocumentReference,
  type WriteBatch,
} from 'firebase/firestore';
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

  /** Writes both sides of a friendship (mine and theirs) in one batch. */
  const commitPair = (
    friendId: string,
    write: (batch: WriteBatch, mine: DocumentReference, theirs: DocumentReference) => void
  ) => {
    if (!currentUser) {
      throw new Error('User not logged in.');
    }
    const batch = writeBatch(db);
    write(
      batch,
      doc(db, 'users', currentUser.uid, 'friendships', friendId),
      doc(db, 'users', friendId, 'friendships', currentUser.uid)
    );
    return batch.commit();
  };
  const onSuccess = () => queryClient.invalidateQueries({ queryKey });

  const sendRequestMutation = useMutation({
    mutationFn: async (friendId: string) =>
      commitPair(friendId, (batch, mine, theirs) => {
        batch.set(mine, { status: 'pending', direction: 'outgoing', since: new Date() });
        batch.set(theirs, { status: 'pending', direction: 'incoming', since: new Date() });
      }),
    onSuccess,
  });

  const acceptRequestMutation = useMutation({
    mutationFn: async (friendId: string) =>
      commitPair(friendId, (batch, mine, theirs) => {
        batch.update(mine, { status: 'accepted', direction: null });
        batch.update(theirs, { status: 'accepted', direction: null });
      }),
    onSuccess,
  });

  // Declining, canceling, or unfriending
  const removeFriendshipMutation = useMutation({
    mutationFn: async (friendId: string) =>
      commitPair(friendId, (batch, mine, theirs) => {
        batch.delete(mine);
        batch.delete(theirs);
      }),
    onSuccess,
  });

  return {
    ...friendshipsQuery,
    getFriendshipStatus, // Expose the new helper function
    sendRequest: sendRequestMutation.mutateAsync,
    acceptRequest: acceptRequestMutation.mutateAsync,
    removeFriendship: removeFriendshipMutation.mutateAsync,
  };
};
