import { useMutation, useQueryClient } from '@tanstack/react-query';
import { arrayRemove, arrayUnion, doc, getFirestore, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export const usePinning = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const db = getFirestore();

  /** Atomically adds or removes `gameId` in the user's pinnedGames array. */
  const setPinned = async (gameId: string, pinned: boolean) => {
    if (!currentUser) {
      throw new Error('User not authenticated.');
    }
    return updateDoc(doc(db, 'users', currentUser.uid), {
      pinnedGames: pinned ? arrayUnion(gameId) : arrayRemove(gameId),
    });
  };
  // Refetch the user's profile to get the updated pinned list
  const onSuccess = () =>
    queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser?.uid] });

  const pinGameMutation = useMutation({
    mutationFn: (gameId: string) => setPinned(gameId, true),
    onSuccess,
  });

  const unpinGameMutation = useMutation({
    mutationFn: (gameId: string) => setPinned(gameId, false),
    onSuccess,
  });

  return {
    pinGame: pinGameMutation.mutateAsync,
    unpinGame: unpinGameMutation.mutateAsync,
    isPending: pinGameMutation.isPending || unpinGameMutation.isPending,
  };
};
