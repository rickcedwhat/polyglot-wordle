import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  arrayUnion,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // 1. Import useAuth
import type { GameDoc } from '@/types/firestore.d.ts';
import { getWordsFromUuid } from '@/utils/wordUtils';

// The fetchOrCreateGame function remains the same.
const fetchOrCreateGame = async (gameId: string, userId: string): Promise<GameDoc> => {
  const db = getFirestore();
  const gameDocRef = doc(db, 'games', `${userId}_${gameId}`);
  const gameDocSnap = await getDoc(gameDocRef);

  if (gameDocSnap.exists()) {
    return gameDocSnap.data() as GameDoc;
  }

  const { words, difficulties, shuffledLanguages } = await getWordsFromUuid(gameId);

  const newGame = {
    userId,
    gameId,
    words,
    difficulties,
    isLiveGame: true,
    guessHistory: [],
    isWin: null,
    startedAt: serverTimestamp() as Timestamp,
    completedAt: null,
    score: null,
    shuffledLanguages,
  };

  await setDoc(gameDocRef, newGame);

  return newGame as GameDoc;
};

// A simple helper to validate the UUID format
const isValidUuid = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{32}$/i;
  return uuidRegex.test(uuid);
};

export const useGameSession = () => {
  const { currentUser: user } = useAuth();
  const queryClient = useQueryClient();
  const { uuid: gameId } = useParams<{ uuid: string }>();
  const userId = user?.uid;

  const queryKey = ['gameSession', gameId, userId];

  const gameQuery = useQuery({
    queryKey,
    queryFn: () => {
      if (!userId || !gameId || !isValidUuid(gameId)) {
        throw new Error('User or Game ID is missing!');
      }
      return fetchOrCreateGame(gameId, userId);
    },
    enabled: !!user && !!gameId,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // --- Mutations ---
  const db = getFirestore(); // Get db instance for mutations

  const updateGuessHistoryMutation = useMutation({
    mutationFn: async (guess: string) => {
      if (!userId || !gameId) {
        throw new Error('Cannot update game without IDs.');
      }
      const gameDocRef = doc(db, 'games', `${userId}_${gameId}`);
      return updateDoc(gameDocRef, {
        guessHistory: arrayUnion(guess),
      });
    },
    // This logic runs BEFORE the mutation
    onMutate: async (newGuess: string) => {
      // 1. Cancel any ongoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey });

      // 2. Get a snapshot of the current data in the cache
      const previousGameSession = queryClient.getQueryData<GameDoc>(queryKey);

      // 3. Optimistically update the cache with the new guess
      if (previousGameSession) {
        queryClient.setQueryData<GameDoc>(queryKey, {
          ...previousGameSession,
          guessHistory: [...previousGameSession.guessHistory, newGuess],
        });
      }

      // 4. Return the snapshot so we can roll back on error
      return { previousGameSession };
    },
    // If the mutation fails, roll back to the previous state
    onError: (_err, _newGuess, context) => {
      if (context?.previousGameSession) {
        queryClient.setQueryData(queryKey, context.previousGameSession);
      }
    },
    // After the mutation succeeds or fails, always refetch to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const endGameMutation = useMutation({
    mutationFn: async ({ isWin, score }: { isWin: boolean; score: number }) => {
      if (!userId || !gameId) {
        throw new Error('Cannot end game without IDs.');
      }
      const gameDocRef = doc(db, 'games', `${userId}_${gameId}`);
      return updateDoc(gameDocRef, {
        isLiveGame: false,
        isWin,
        completedAt: serverTimestamp(),
        score,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    ...gameQuery,
    updateGuessHistory: updateGuessHistoryMutation.mutateAsync,
    endGame: endGameMutation.mutateAsync,
  };
};
