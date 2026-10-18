import { useInfiniteQuery } from '@tanstack/react-query';
import {
  collection,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { GameDoc } from '@/types/firestore';

const PAGE_SIZE = 12;
type Cursor = QueryDocumentSnapshot<DocumentData> | undefined;

/** Paginated public game activity. Spoiler hiding is a UI courtesy, not a read-access boundary. */
export const useActivityFeed = () => {
  const { currentUser } = useAuth();
  return useInfiniteQuery({
    queryKey: ['activityFeed', currentUser?.uid],
    enabled: !!currentUser,
    initialPageParam: undefined as Cursor,
    queryFn: async ({ pageParam }) => {
      const base = query(
        collection(getFirestore(), 'games'),
        where('isLiveGame', '==', false),
        orderBy('completedAt', 'desc'),
        limit(PAGE_SIZE)
      );
      const snapshot = await getDocs(pageParam ? query(base, startAfter(pageParam)) : base);
      return {
        games: snapshot.docs
          .map((d) => ({ ...d.data(), id: d.id }) as GameDoc & { id: string })
          .filter((game) => game.completedAt),
        nextCursor: snapshot.size === PAGE_SIZE ? snapshot.docs.at(-1) : undefined,
      };
    },
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 30_000,
  });
};
