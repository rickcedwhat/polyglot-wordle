import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import type { UserDoc } from '@/types/firestore.d.ts';

const fetchUserProfile = async (userId: string) => {
  const db = getFirestore();
  const userDocRef = doc(db, 'users', userId);
  const docSnap = await getDoc(userDocRef);

  if (!docSnap.exists()) {
    throw new Error('User profile not found');
  }
  return docSnap.data() as UserDoc;
};

export const useUserProfile = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId, // Only run the query if a userId is provided
  });
};
