import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, deleteDoc, doc, getDocs, getFirestore } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { SharedInviteDoc } from '@/types/firestore';

export const useSharedInvites = () => {
  const { currentUser } = useAuth();
  const userId = currentUser?.uid;
  const client = useQueryClient();
  const queryKey = ['sharedInvites', userId];
  const result = useQuery({
    queryKey,
    enabled: !!userId,
    staleTime: 0,
    refetchInterval: 60_000,
    queryFn: async () => {
      const snapshot = await getDocs(collection(getFirestore(), 'users', userId!, 'sharedInvites'));
      return snapshot.docs
        .map((d) => d.data() as SharedInviteDoc)
        .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    },
  });
  const remove = useMutation({
    mutationFn: async (gameId: string) => {
      if (!userId) {
        throw new Error('Not signed in');
      }
      await deleteDoc(doc(getFirestore(), 'users', userId, 'sharedInvites', gameId));
    },
    onSuccess: () => client.invalidateQueries({ queryKey }),
  });
  return {
    invites: result.data ?? [],
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: result.refetch,
    remove: remove.mutateAsync,
  };
};
