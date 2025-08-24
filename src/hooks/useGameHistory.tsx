import {
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import {
  collection,
  DocumentData,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  where,
} from 'firebase/firestore';
import type { GameDoc } from '@/types/firestore';

const GAMES_PER_PAGE = 10;

type PageParam = QueryDocumentSnapshot<DocumentData> | undefined;
type FetchResponse = {
  games: (GameDoc & { id: string })[];
  nextPageCursor: PageParam;
  count: number; // We'll add the count of fetched games
};

const fetchGameHistory = async ({
  pageParam,
  userId,
}: {
  pageParam: PageParam;
  userId: string;
}): Promise<FetchResponse> => {
  const db = getFirestore();
  const gamesRef = collection(db, 'games');

  let q = query(
    gamesRef,
    where('userId', '==', userId),
    orderBy('startedAt', 'desc'),
    limit(GAMES_PER_PAGE)
  );

  if (pageParam) {
    q = query(q, startAfter(pageParam));
  }

  const querySnapshot = await getDocs(q);
  const games = querySnapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as GameDoc & { id: string }
  );
  const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

  return { games, nextPageCursor: lastVisible, count: games.length };
};

export const useGameHistory = (userId: string) => {
  const options: UseInfiniteQueryOptions<
    FetchResponse,
    Error,
    InfiniteData<FetchResponse>,
    ['gameHistory', string],
    PageParam
  > = {
    queryKey: ['gameHistory', userId],
    queryFn: ({ pageParam }) => fetchGameHistory({ pageParam, userId }),
    initialPageParam: undefined,
    // This is the "smarter" part:
    getNextPageParam: (lastPage) => {
      // If the last page fetched less than the page limit, there are no more pages.
      if (lastPage.count < GAMES_PER_PAGE) {
        return undefined;
      }
      // Otherwise, use the cursor for the next page.
      return lastPage.nextPageCursor;
    },
  };

  return useInfiniteQuery(options);
};
