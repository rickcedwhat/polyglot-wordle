import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { GameDoc } from '@/types/firestore';

/** A started puzzle stays spoiler-free until the viewer finishes it. */
export const usePlayedGame = (game: GameDoc) => {
  const { currentUser } = useAuth();
  const own = currentUser?.uid === game.userId;
  const result = useQuery({
    queryKey: ['playedGame', currentUser?.uid, game.gameId],
    enabled: !!currentUser && !own,
    queryFn: async () => {
      const snap = await getDoc(doc(getFirestore(), 'games', `${currentUser!.uid}_${game.gameId}`));
      return snap.exists() ? (snap.data() as GameDoc) : null;
    },
    staleTime: 30_000,
    throwOnError: false,
  });
  const mine = own ? game : result.data;
  return {
    mine,
    canReveal: !!mine?.completedAt && !mine.isLiveGame,
    isPending: result.isPending,
    isError: result.isError,
    refetch: result.refetch,
  };
};
