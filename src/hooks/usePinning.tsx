import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getFirestore, runTransaction } from 'firebase/firestore';
import { MAX_PINNED_GAMES } from '@/config';
import { useAuth } from '@/context/AuthContext';
import i18n from '@/i18n';
import { showToast } from '@/utils/toast';

export class PinLimitError extends Error {
  constructor() {
    super('Pinned game limit reached');
    this.name = 'PinLimitError';
  }
}

/** Check the saved list atomically so concurrent tabs share the same six-game limit. */
export const setGamePinned = async (userId: string, gameId: string, pinned: boolean) => {
  const db = getFirestore();
  const ref = doc(db, 'users', userId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) {
      throw new Error('User profile not found');
    }
    const saved = snapshot.data().pinnedGames;
    const pins: string[] = Array.isArray(saved)
      ? Array.from(new Set(saved.filter((id): id is string => typeof id === 'string')))
      : [];
    if (pinned && !pins.includes(gameId)) {
      if (pins.length >= MAX_PINNED_GAMES) {
        throw new PinLimitError();
      }
      transaction.update(ref, { pinnedGames: [...pins, gameId] });
    } else if (!pinned && pins.includes(gameId)) {
      transaction.update(ref, { pinnedGames: pins.filter((id) => id !== gameId) });
    }
  });
  return userId;
};

export const usePinning = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const setPinned = async (gameId: string, pinned: boolean) => {
    if (!currentUser) {
      throw new Error('User not authenticated.');
    }
    return setGamePinned(currentUser.uid, gameId, pinned);
  };
  const onSuccess = (userId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] }),
      queryClient.invalidateQueries({ queryKey: ['pinnedGames', userId] }),
    ]);
  const onError = (error: Error) =>
    showToast(
      {
        color: error instanceof PinLimitError ? 'blue' : 'red',
        message:
          error instanceof PinLimitError
            ? i18n.t('history.pinLimit', { count: MAX_PINNED_GAMES })
            : i18n.t('history.pinFailed'),
      },
      { immediate: true }
    );
  const pinGameMutation = useMutation({
    mutationFn: (gameId: string) => setPinned(gameId, true),
    onSuccess,
    onError,
  });
  const unpinGameMutation = useMutation({
    mutationFn: (gameId: string) => setPinned(gameId, false),
    onSuccess,
    onError,
  });
  return {
    pinGame: pinGameMutation.mutateAsync,
    unpinGame: unpinGameMutation.mutateAsync,
    isPending: pinGameMutation.isPending || unpinGameMutation.isPending,
  };
};
