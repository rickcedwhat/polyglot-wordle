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
type HistoryGame = GameDoc & { id: string };
type FetchResponse = {
  games: HistoryGame[];
  nextPageCursor: PageParam;
  count: number; // We'll add the count of fetched games
};

const toGames = (docs: QueryDocumentSnapshot<DocumentData>[]) =>
  docs.map((doc) => ({ id: doc.id, ...doc.data() }) as HistoryGame);

/** Unfinished games, newest first. Equality filters only, so no composite index is needed. */
const fetchInProgress = async (userId: string): Promise<HistoryGame[]> => {
  const snapshot = await getDocs(
    query(
      collection(getFirestore(), 'games'),
      where('userId', '==', userId),
      where('isLiveGame', '==', true)
    )
  );
  return toGames(snapshot.docs).sort(
    (a, b) => (b.startedAt?.toMillis() ?? 0) - (a.startedAt?.toMillis() ?? 0)
  );
};

/**
 * Unfinished games first, then finished games by when they were finished: a game left open for
 * days belongs with the games finished around the same time, not where it was started.
 */
const fetchGameHistory = async ({
  pageParam,
  userId,
}: {
  pageParam: PageParam;
  userId: string;
}): Promise<FetchResponse> => {
  let q = query(
    collection(getFirestore(), 'games'),
    where('userId', '==', userId),
    orderBy('completedAt', 'desc'),
    limit(GAMES_PER_PAGE)
  );

  if (pageParam) {
    q = query(q, startAfter(pageParam));
  }

  const [inProgress, querySnapshot] = await Promise.all([
    pageParam ? [] : fetchInProgress(userId),
    getDocs(q),
  ]);
  // Unfinished games have no completedAt yet and sort last here; they are listed up front instead.
  const finished = toGames(querySnapshot.docs).filter((game) => game.completedAt);
  const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];

  return {
    games: [...inProgress, ...finished],
    nextPageCursor: lastVisible,
    count: querySnapshot.docs.length,
  };
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
