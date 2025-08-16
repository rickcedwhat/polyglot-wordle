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

  const { words, difficulties } = await getWordsFromUuid(gameId);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const endGameMutation = useMutation({
    mutationFn: async ({ isWin }: { isWin: boolean }) => {
      if (!userId || !gameId) {
        throw new Error('Cannot end game without IDs.');
      }
      const gameDocRef = doc(db, 'games', `${userId}_${gameId}`);
      return updateDoc(gameDocRef, {
        isLiveGame: false,
        isWin,
        completedAt: serverTimestamp(),
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
