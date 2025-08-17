import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { GameDoc } from '@/types/firestore.d.ts';

const fetchGameHistory = async (userId: string) => {
  try {
    const db = getFirestore();
    const gamesCollectionRef = collection(db, 'games');

    const q = query(
      gamesCollectionRef,
      where('userId', '==', userId),
      orderBy('startedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as (GameDoc & {
      id: string;
    })[];
  } catch (error) {
    // 2. Log the full error object to the console
    console.error(
      'Firestore query failed. This is likely due to a missing index. Look for a link in the error details below to create it:',
      error
    );
    // 3. Re-throw the error so TanStack Query knows the fetch failed
    throw error;
  }
};

export const useGameHistory = () => {
  const { currentUser } = useAuth();
  return useQuery({
    queryKey: ['gameHistory', currentUser?.uid],
    queryFn: () => fetchGameHistory(currentUser!.uid),
    enabled: !!currentUser,
  });
};
