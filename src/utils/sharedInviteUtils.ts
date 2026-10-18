import { doc, getFirestore, runTransaction, serverTimestamp } from 'firebase/firestore';
import type { Language } from '@/types/firestore';

/** One owner-only open invitation per puzzle, regardless of how often its link is shared. */
export const rememberSharedInvite = async (
  userId: string,
  gameId: string,
  languages: Language[]
) => {
  const db = getFirestore();
  const ref = doc(db, 'users', userId, 'sharedInvites', gameId);
  await runTransaction(db, async (transaction) => {
    if ((await transaction.get(ref)).exists()) {
      return;
    }
    transaction.set(ref, {
      gameId,
      languages: [...languages].sort(),
      createdAt: serverTimestamp(),
    });
  });
};
