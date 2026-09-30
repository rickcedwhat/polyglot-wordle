import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import type { GameDoc } from '@/types/firestore';

/** Every game a user has played (unpaginated), for totals like feat counts. */
export const useAllGames = (userId: string | undefined) =>
  useQuery({
    queryKey: ['allGames', userId],
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(getFirestore(), 'games'), where('userId', '==', userId))
      );
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as GameDoc) }));
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
