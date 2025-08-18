import { useMutation, useQueryClient } from '@tanstack/react-query';
import { arrayRemove, arrayUnion, doc, getFirestore, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';

export const usePinning = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const db = getFirestore();

  const pinGameMutation = useMutation({
    mutationFn: async (gameId: string) => {
      if (!currentUser) {
        throw new Error('User not authenticated.');
      }
      const userDocRef = doc(db, 'users', currentUser.uid);
      // Atomically add the gameId to the pinnedGames array
      return updateDoc(userDocRef, { pinnedGames: arrayUnion(gameId) });
    },
    onSuccess: () => {
      // Refetch the user's profile to get the updated pinned list
      queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser?.uid] });
    },
  });

  const unpinGameMutation = useMutation({
    mutationFn: async (gameId: string) => {
      if (!currentUser) {
        throw new Error('User not authenticated.');
      }
      const userDocRef = doc(db, 'users', currentUser.uid);
      // Atomically remove the gameId from the pinnedGames array
      return updateDoc(userDocRef, { pinnedGames: arrayRemove(gameId) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser?.uid] });
    },
  });

  return {
    pinGame: pinGameMutation.mutateAsync,
    unpinGame: unpinGameMutation.mutateAsync,
    isPending: pinGameMutation.isPending || unpinGameMutation.isPending,
  };
};
