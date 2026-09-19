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
import { useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { GameDoc, Language, UserDoc } from '@/types/firestore.d.ts';
import { getWordsFromUuid, normalizeWord } from '@/utils/wordUtils';

export const fetchOrCreateGame = async (
  gameId: string,
  userId: string,
  challengerId?: string | null
): Promise<GameDoc> => {
  const db = getFirestore();
  const gameDocRef = doc(db, 'games', `${userId}_${gameId}`);
  const gameDocSnap = await getDoc(gameDocRef);

  if (gameDocSnap.exists()) {
    return gameDocSnap.data() as GameDoc;
  }

  let words: GameDoc['words'] | undefined;
  let difficulties: GameDoc['difficulties'] | undefined;
  let shuffledLanguages: GameDoc['shuffledLanguages'] | undefined;

  // If this is a challenge game, inherit the challenger's solution words, difficulties,
  // and board order directly from their Firestore game doc so both players play the exact same puzzle.
  if (challengerId && challengerId !== userId) {
    try {
      const challengerDocRef = doc(db, 'games', `${challengerId}_${gameId}`);
      const challengerSnap = await getDoc(challengerDocRef);
      if (challengerSnap.exists()) {
        const challengerGame = challengerSnap.data() as GameDoc;
        if (
          challengerGame.words &&
          challengerGame.difficulties &&
          challengerGame.shuffledLanguages
        ) {
          words = challengerGame.words;
          difficulties = challengerGame.difficulties;
          shuffledLanguages = challengerGame.shuffledLanguages;
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to fetch challenger game config, falling back to UUID derivation:', err);
    }
  }

  // Fall back to deriving words and difficulties from UUID if not inherited from challenger
  if (!words || !difficulties || !shuffledLanguages) {
    const derived = await getWordsFromUuid(gameId);
    words = derived.words;
    difficulties = derived.difficulties;
    shuffledLanguages = derived.shuffledLanguages;
  }

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
  const [searchParams] = useSearchParams();
  const challengerParam = searchParams.get('challenger');
  const userId = user?.uid;
  const activeChallengerId = challengerParam && challengerParam !== userId ? challengerParam : null;

  const queryKey = ['gameSession', gameId, userId];

  const gameQuery = useQuery({
    queryKey,
    queryFn: () => {
      if (!userId || !gameId || !isValidUuid(gameId)) {
        throw new Error('User or Game ID is missing!');
      }
      return fetchOrCreateGame(gameId, userId, activeChallengerId);
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
        stats.totalScore = (stats.totalScore || 0) + score;
        if (!stats.highScore || score > stats.highScore) {
          stats.highScore = score;
        }

        if (isWin) {
          stats.wins = (stats.wins || 0) + 1;
          stats.currentStreak = (stats.currentStreak || 0) + 1;
          stats.maxStreak = Math.max(stats.maxStreak || 0, stats.currentStreak);
        } else {
          stats.currentStreak = 0; // Reset streak on a loss
        }
        stats.winPercentage = Math.round((stats.wins / stats.gamesPlayed) * 100);

        // Per-language, per-difficulty stats
        (gameData.shuffledLanguages || (['en', 'es', 'fr'] as Language[])).forEach(
          (lang: Language) => {
            const difficulty = gameData.difficulties?.[lang] || 'basic';
            const solution = gameData.words?.[lang];
            if (!solution || !stats?.languages?.[lang]?.[difficulty]) {
              return;
            }
            const langStats = stats.languages[lang][difficulty];

            const winIndex = (gameData.guessHistory || []).findIndex(
              (guess) => normalizeWord(guess) === normalizeWord(solution)
            );

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

            // Recalculate average guesses for this specific language/difficulty
            const totalGuesses = langStats.guessDistribution
              .slice(0, 8) // Only count wins (indices 0-7)
              .reduce((acc, count, i) => acc + count * (i + 1), 0);

            if (langStats.boardsSolved > 0) {
              langStats.averageGuesses = totalGuesses / langStats.boardsSolved;
            } else {
              langStats.averageGuesses = 0;
            }
          }
        );

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
    onMutate: async ({ isWin, score }: { isWin: boolean; score: number }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousGameSession = queryClient.getQueryData<GameDoc>(queryKey);
      if (previousGameSession) {
        queryClient.setQueryData<GameDoc>(queryKey, {
          ...previousGameSession,
          isLiveGame: false,
          isWin,
          score,
        });
      }
      return { previousGameSession };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousGameSession) {
        queryClient.setQueryData(queryKey, context.previousGameSession);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
      if (userId) {
        queryClient.invalidateQueries({ queryKey: ['userProfile', userId] });
      }
    },
  });

  return {
    ...gameQuery,
    updateGuessHistory: updateGuessHistoryMutation.mutateAsync,
    endGame: endGameMutation.mutateAsync,
  };
};
