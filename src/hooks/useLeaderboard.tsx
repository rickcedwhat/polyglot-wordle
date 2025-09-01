import { useQuery } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { GameDoc } from '@/types/firestore';
import { useFriendships } from './useFriendships';

const fetchLeaderboardData = async (
  gameId: string,
  // If friendUids is provided, this will be a friends-only query
  friendUids?: string[]
) => {
  const db = getFirestore();
  const gamesRef = collection(db, 'games');

  const constraints = [
    where('gameId', '==', gameId),
    where('isLiveGame', '==', false),
    orderBy('score', 'desc'),
    limit(10),
  ];

  // If a list of friend IDs is passed, add it to the query
  if (friendUids && friendUids.length > 0) {
    constraints.push(where('userId', 'in', friendUids));
  }

  const q = query(gamesRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data() as GameDoc);
};

export const useLeaderboard = (gameId: string) => {
  const { currentUser } = useAuth();
  // Get the list of your friends to use in the friends query
  const { data: friendships } = useFriendships(currentUser?.uid);

  const friendUids = friendships
    ?.filter((f) => f.status === 'accepted')
    .map((f) => f.id)
    .concat(currentUser?.uid || []); // Include your own ID

  // // Fetch the global leaderboard
  // const globalQuery = useQuery({
  //   queryKey: ['leaderboard', gameId, 'global'],
  //   queryFn: () => fetchLeaderboardData(gameId),
  //   enabled: !!gameId,
  // });

  // Fetch the friends leaderboard
  const friendsQuery = useQuery({
    queryKey: ['leaderboard', gameId, 'friends', friendUids],
    queryFn: () => fetchLeaderboardData(gameId, friendUids),
    enabled: !!gameId && !!friendUids,
  });

  return { friendsQuery };
};
