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
import {
  recordKey,
  recordTime,
  type ActivityRecord,
  type FeedCertification,
  type FeedGame,
} from '@/utils/activityTimeline';

const PAGE_SIZE = 12;
type Cursor = QueryDocumentSnapshot<DocumentData> | undefined;
interface Stream {
  cursor?: Cursor;
  exhausted: boolean;
  buffer: ActivityRecord[];
}
interface PageCursor {
  games: Stream;
  certifications: Stream;
}
const initial = (): PageCursor => ({
  games: { exhausted: false, buffer: [] },
  certifications: { exhausted: false, buffer: [] },
});

/** Merge two independently paginated streams without emitting older items before buffered newer ones. */
export const fetchActivityPage = async (cursor: PageCursor = initial()) => {
  const fill = async (type: 'games' | 'certifications', stream: Stream): Promise<Stream> => {
    if (stream.exhausted || stream.buffer.length >= PAGE_SIZE) {
      return stream;
    }
    const db = getFirestore();
    const base =
      type === 'games'
        ? query(
            collection(db, 'games'),
            where('isLiveGame', '==', false),
            orderBy('completedAt', 'desc'),
            limit(PAGE_SIZE)
          )
        : query(collection(db, 'activityEvents'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
    const snapshot = await getDocs(stream.cursor ? query(base, startAfter(stream.cursor)) : base);
    const records = snapshot.docs.flatMap((doc): ActivityRecord[] => {
      if (type === 'games') {
        const game = { ...doc.data(), id: doc.id } as FeedGame;
        return game.completedAt ? [{ type: 'game', game }] : [];
      }
      const certification = { ...doc.data(), id: doc.id } as FeedCertification;
      return certification.createdAt ? [{ type: 'certification', certification }] : [];
    });
    return {
      cursor: snapshot.docs.at(-1) ?? stream.cursor,
      exhausted: snapshot.size < PAGE_SIZE,
      buffer: [...stream.buffer, ...records],
    };
  };
  const [games, certifications] = await Promise.all([
    fill('games', cursor.games),
    fill('certifications', cursor.certifications),
  ]);
  const merged = [...games.buffer, ...certifications.buffer].sort(
    (a, b) => recordTime(b) - recordTime(a) || recordKey(a).localeCompare(recordKey(b))
  );
  const records = merged.slice(0, PAGE_SIZE);
  const consumed = new Set(records.map(recordKey));
  const remaining: PageCursor = {
    games: { ...games, buffer: games.buffer.filter((record) => !consumed.has(recordKey(record))) },
    certifications: {
      ...certifications,
      buffer: certifications.buffer.filter((record) => !consumed.has(recordKey(record))),
    },
  };
  const done = Object.values(remaining).every(
    (stream) => stream.exhausted && stream.buffer.length === 0
  );
  return { records, nextCursor: done ? undefined : remaining };
};
export const useActivityTimeline = () => {
  const { currentUser } = useAuth();
  return useInfiniteQuery({
    queryKey: ['activityTimeline', currentUser?.uid],
    enabled: !!currentUser,
    initialPageParam: undefined as PageCursor | undefined,
    queryFn: ({ pageParam }) => fetchActivityPage(pageParam),
    getNextPageParam: (page) => page.nextCursor,
    staleTime: 30_000,
  });
};
