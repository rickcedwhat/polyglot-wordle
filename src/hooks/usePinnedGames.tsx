import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import type { GameDoc } from '@/types/firestore';

/**
 * Fetches multiple game documents for a specific user from a list of game IDs.
 */
const fetchGamesByIds = async (userId: string, gameIds: string[]) => {
  if (!userId || !gameIds || gameIds.length === 0) {
    return [];
  }

  const db = getFirestore();
  const gamesRef = collection(db, 'games');

  const q = query(
    gamesRef,
    where('userId', '==', userId), // 1. ADD THIS LINE to filter by the user
    where('gameId', 'in', gameIds) // 2. And match the pinned game IDs
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as (GameDoc & {
    id: string;
  })[];
};

// 3. Update the hook to accept the userId
export const usePinnedGames = (userId: string | undefined, gameIds: string[] | undefined) => {
  return useQuery({
    queryKey: ['pinnedGames', userId, gameIds], // Add userId to the key
    queryFn: () => fetchGamesByIds(userId!, gameIds!),
    enabled: !!userId && !!gameIds && gameIds.length > 0,
    staleTime: Infinity,
  });
};
