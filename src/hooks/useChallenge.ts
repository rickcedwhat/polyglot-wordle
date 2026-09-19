import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { GameDoc, UserDoc } from '@/types/firestore';

export interface ChallengeData {
  challengerId: string;
  user: UserDoc | null;
  game: GameDoc | null;
}

export const useChallenge = (gameId: string | undefined) => {
  const [searchParams] = useSearchParams();
  const challengerId = searchParams.get('challenger');
  const { currentUser } = useAuth();

  // If user is opening their own link, don't treat as an external challenge
  const isSelf = !!currentUser && currentUser.uid === challengerId;
  const activeChallengerId = isSelf || !challengerId ? null : challengerId;

  const { data, isLoading } = useQuery({
    queryKey: ['challenge', activeChallengerId, gameId],
    queryFn: async (): Promise<ChallengeData | null> => {
      if (!activeChallengerId || !gameId) {
        return null;
      }

      const db = getFirestore();

      // Fetch user profile & match doc concurrently
      const [userSnap, gameSnap] = await Promise.all([
        getDoc(doc(db, 'users', activeChallengerId)).catch(() => null),
        getDoc(doc(db, 'games', `${activeChallengerId}_${gameId}`)).catch(() => null),
      ]);

      const user = userSnap && userSnap.exists() ? (userSnap.data() as UserDoc) : null;
      const game = gameSnap && gameSnap.exists() ? (gameSnap.data() as GameDoc) : null;

      return {
        challengerId: activeChallengerId,
        user,
        game,
      };
    },
    enabled: !!activeChallengerId && !!gameId,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return {
    challengerId: activeChallengerId,
    challengerUser: data?.user || null,
    challengerGame: data?.game || null,
    isChallenge: !!activeChallengerId && !!data?.game,
    isLoading,
  };
};
