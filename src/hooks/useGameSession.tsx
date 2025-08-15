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
import { useAuth } from '@/context/AuthContext'; // 1. Import useAuth
import type { GameDoc } from '@/types/firestore.d.ts';
import { getWordsFromUuid } from '@/utils/wordUtils';

// The fetchOrCreateGame function remains the same.
const fetchOrCreateGame = async (gameId: string, userId: string): Promise<GameDoc> => {
  console.log('1');
  const db = getFirestore();
  console.log('2');
  const gameDocRef = doc(db, 'games', `${userId}_${gameId}`);
  console.log('3');
  const gameDocSnap = await getDoc(gameDocRef);
  console.log('4');

  if (gameDocSnap.exists()) {
    console.log('[fetchOrCreateGame] Document already exists. Returning existing game data.', {
      data: gameDocSnap.data(),
    });
    return gameDocSnap.data() as GameDoc;
  }

  // Add a try/catch block to ensure no errors are missed
  try {
    console.log('[fetchOrCreateGame] Document not found. Calling getWordsFromUuid...');
    const { words, difficulties } = await getWordsFromUuid(gameId);
    console.log('[fetchOrCreateGame] Successfully got words and difficulties:', {
      words,
      difficulties,
    });

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

    // Add this log right before the setDoc call
    console.log('[fetchOrCreateGame] About to create document with this data:', newGame);

    await setDoc(gameDocRef, newGame);
    console.log('[fetchOrCreateGame] Document created successfully.');

    return newGame as GameDoc;
  } catch (error) {
    // This will catch any error from getWordsFromUuid or setDoc
    console.error('[fetchOrCreateGame] CRITICAL ERROR during game creation:', error);
    throw error; // Re-throw error so TanStack Query knows the request failed
  }
};

export const useGameSession = (gameId: string | undefined) => {
  // 2. Get the current user from our reliable AuthContext
  const { currentUser: user } = useAuth();
  const queryClient = useQueryClient();
  // Add this log to see the state of the dependencies
  console.log('[useGameSession] Hook evaluated. gameId:', gameId, 'user found:', !!user);

  const userId = user?.uid;

  const queryKey = ['gameSession', gameId, userId];

  const gameQuery = useQuery({
    queryKey,
    queryFn: () => {
      console.log('in queryFn of useGameSession');
      if (!userId || !gameId) {
        throw new Error('User or Game ID is missing!');
      }
      console.log('made it past the error check');
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
