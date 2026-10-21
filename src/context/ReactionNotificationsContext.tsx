import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  collection,
  doc,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  where,
  type Timestamp,
} from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import {
  compareTimestamps,
  groupReactionNotifications,
  type IncomingReaction,
  type ReactionNotification,
} from '@/utils/reactionNotifications';

interface InboxState {
  items: ReactionNotification[];
  isLoading: boolean;
  isError: boolean;
  ready: boolean;
  retry: () => void;
  markRead: (items: ReactionNotification[]) => Promise<void>;
}
const Context = createContext<InboxState>({
  items: [],
  isLoading: false,
  isError: false,
  ready: false,
  retry: () => {},
  markRead: async () => {},
});
export const useReactionNotifications = () => useContext(Context);

/** Monotonic receipts prevent a slower tab from undoing a newer read marker. */
export const saveReactionReceipts = async (userId: string, items: ReactionNotification[]) => {
  if (!items.length) {
    return;
  }
  const db = getFirestore();
  await runTransaction(db, async (tx) => {
    const entries = await Promise.all(
      items.map(async (item) => {
        const ref = doc(db, 'users', userId, 'reactionReceipts', item.id);
        const snapshot = await tx.get(ref);
        return {
          ref,
          item,
          previous: snapshot.exists() ? (snapshot.data().seenAt as Timestamp) : undefined,
        };
      })
    );
    entries.forEach(({ ref, item, previous }) => {
      if (!previous || compareTimestamps(item.latestAt, previous) > 0) {
        tx.set(ref, { seenAt: item.latestAt });
      }
    });
  });
};
const PlayerInbox = ({ userId, children }: { userId: string; children: ReactNode }) => {
  const [reactions, setReactions] = useState<IncomingReaction[]>([]);
  const [receipts, setReceipts] = useState<Record<string, Timestamp>>({});
  const [loaded, setLoaded] = useState({ reactions: false, receipts: false });
  const [server, setServer] = useState({ reactions: false, receipts: false });
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setError(false);
    setServer({ reactions: false, receipts: false });
    const db = getFirestore();
    const fail = () => setError(true);
    const stopReactions = onSnapshot(
      query(
        collection(db, 'reactions'),
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(100)
      ),
      { includeMetadataChanges: true },
      (snapshot) => {
        setReactions(
          snapshot.docs.flatMap((row) => {
            const data = row.data();
            return data.createdAt?.toMillis ? [{ ...data, id: row.id } as IncomingReaction] : [];
          })
        );
        setLoaded((old) => ({ ...old, reactions: true }));
        setServer((old) => ({ ...old, reactions: !snapshot.metadata.fromCache }));
      },
      fail
    );
    const stopReceipts = onSnapshot(
      collection(db, 'users', userId, 'reactionReceipts'),
      { includeMetadataChanges: true },
      (snapshot) => {
        setReceipts(
          Object.fromEntries(snapshot.docs.map((row) => [row.id, row.data().seenAt as Timestamp]))
        );
        setLoaded((old) => ({ ...old, receipts: true }));
        setServer((old) => ({ ...old, receipts: !snapshot.metadata.fromCache }));
      },
      fail
    );
    return () => {
      stopReactions();
      stopReceipts();
    };
  }, [userId, revision]);
  const items = useMemo(
    () => groupReactionNotifications(reactions, receipts, userId),
    [reactions, receipts, userId]
  );
  return (
    <Context.Provider
      value={{
        items,
        isLoading: !loaded.reactions || !loaded.receipts,
        isError: error,
        ready: !error && server.reactions && server.receipts,
        retry: () => setRevision((old) => old + 1),
        markRead: (selected) => saveReactionReceipts(userId, selected),
      }}
    >
      {children}
    </Context.Provider>
  );
};
export const ReactionNotificationsProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  return currentUser ? (
    <PlayerInbox key={currentUser.uid} userId={currentUser.uid}>
      {children}
    </PlayerInbox>
  ) : (
    children
  );
};
