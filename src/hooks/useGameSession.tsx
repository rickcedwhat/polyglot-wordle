import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  arrayUnion,
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext'; // 1. Import useAuth
import type { GameDoc, Language, UserDoc } from '@/types/firestore.d.ts';
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

  // const endGameMutation = useMutation({
  //   mutationFn: async ({ isWin, score }: { isWin: boolean; score: number }) => {
  //     if (!userId || !gameId) {
  //       throw new Error('Cannot end game without IDs.');
  //     }

  //     const gameDocRef = doc(db, 'games', `${userId}_${gameId}`);
  //     await updateDoc(gameDocRef, {
  //       isLiveGame: false,
  //       isWin,
  //       completedAt: serverTimestamp(),
  //       score,
  //     });

  //   },
  //   onSuccess: () => {
  //     // Invalidate the current game session query
  //     queryClient.invalidateQueries({ queryKey });
  //   },
  // });

  const endGameMutation = useMutation({
    mutationFn: async ({ isWin, score }: { isWin: boolean; score: number }) => {
      if (!userId || !gameId) {
        throw new Error('Cannot end game without IDs.');
      }

      const db = getFirestore();
      const gameDocRef = doc(db, 'games', `${userId}_${gameId}`);
      const userDocRef = doc(db, 'users', userId);

      // Use a transaction to atomically update game and user stats
      await runTransaction(db, async (transaction) => {
        // 1. Read existing documents first
        const gameDocSnap = await transaction.get(gameDocRef);
        const userDocSnap = await transaction.get(userDocRef);

        if (!gameDocSnap.exists() || !userDocSnap.exists()) {
          throw new Error('Game or User document does not exist!');
        }

        const gameData = gameDocSnap.data() as GameDoc;
        const userData = userDocSnap.data() as UserDoc;

        // --- 2. Calculate New Stats ---
        const stats = userData.stats;

        // Overall stats
        stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
        if (isWin) {
          stats.wins = (stats.wins || 0) + 1;
          stats.currentStreak = (stats.currentStreak || 0) + 1;
          stats.maxStreak = Math.max(stats.maxStreak || 0, stats.currentStreak);
        } else {
          stats.currentStreak = 0; // Reset streak on a loss
        }
        stats.winPercentage = Math.round((stats.wins / stats.gamesPlayed) * 100);

        // Per-language, per-difficulty stats
        gameData.shuffledLanguages.forEach((lang: Language) => {
          const difficulty = gameData.difficulties[lang];
          const solution = gameData.words[lang];
          const langStats = stats.languages[lang][difficulty];

          const winIndex = gameData.guessHistory.findIndex((g) => g === solution);

          if (winIndex !== -1) {
            // Board was solved
            langStats.boardsSolved = (langStats.boardsSolved || 0) + 1;
            const guessCount = winIndex + 1; // 1-based index
            langStats.guessDistribution[guessCount - 1]++;
          } else {
            // Board was not solved
            langStats.boardsFailed = (langStats.boardsFailed || 0) + 1;
            langStats.guessDistribution[8]++; // Index 8 for losses
          }
        });

        // --- 3. Write updates back to Firestore ---
        // Update the user's stats
        transaction.update(userDocRef, { stats });

        // Finalize the game document
        transaction.update(gameDocRef, {
          isLiveGame: false,
          isWin,
          completedAt: serverTimestamp(),
          score,
        });
      });
    },
    onSuccess: () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ['userProfile', userId] }); // Invalidate user profile to update stats display
    },
  });

  return {
    ...gameQuery,
    updateGuessHistory: updateGuessHistoryMutation.mutateAsync,
    endGame: endGameMutation.mutateAsync,
  };
};
