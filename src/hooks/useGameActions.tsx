import { useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, getFirestore, limit, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from './useUserProfile';

// A helper function to map difficulty names back to a hex character
const difficultyToHex = (difficulty: 'basic' | 'intermediate' | 'advanced'): string => {
  if (difficulty === 'basic') {
    return '0';
  }
  if (difficulty === 'intermediate') {
    return '5';
  }
  return 'a';
};

export const useGameActions = () => {
  const { currentUser } = useAuth();
  const { data: userProfile } = useUserProfile(currentUser?.uid);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const preferencesNotSet = !userProfile?.difficultyPrefs;

  const createNewGame = async () => {
    if (!currentUser) {
      console.error('Cannot create a new game without a logged-in user.');
      // Optional: show a notification to the user
      return;
    }

    try {
      const db = getFirestore();

      const prefs = userProfile?.difficultyPrefs;

      if (!prefs) {
        console.error('User difficulty preferences not found.');
        return;
      }

      // Query for an existing empty game that matches the user's current preferences
      const gamesCollectionRef = collection(db, 'games');
      const q = query(
        gamesCollectionRef,
        where('userId', '==', currentUser.uid),
        where('isLiveGame', '==', true),
        where('guessHistory', '==', []),
        where('difficulties.en', '==', prefs?.en),
        where('difficulties.es', '==', prefs?.es),
        where('difficulties.fr', '==', prefs?.fr),
        limit(1)
      );
      const existingGameSnapshot = await getDocs(q);
      let gameId = '';

      if (!existingGameSnapshot.empty) {
        // If a matching game is found, navigate to it
        const gameToReuse = existingGameSnapshot.docs[0].data();
        console.log('Found existing empty game with matching difficulties, reusing it.');
        gameId = gameToReuse.gameId;
      } else {
        // If no game is found, create a new one
        const fullUUID = uuidv4().replace(/-/g, '');
        const randomPart = fullUUID.substring(0, 24);

        // Construct the difficulty part from preferences
        const difficultyPart =
          difficultyToHex(prefs.en) + difficultyToHex(prefs.es) + difficultyToHex(prefs.fr);

        // Create the full game ID (UUID)
        const extraChars = fullUUID.substring(0, 5);
        const newGameId = randomPart + difficultyPart + extraChars;

        await queryClient.invalidateQueries({ queryKey: ['gameHistory'] });
        gameId = newGameId;
      }
      navigate(`/game/${gameId}`);
    } catch (error) {
      console.error('Failed to create new game:', error);
    }
  };

  // Return an object with all the actions you want to expose
  return { createNewGame, preferencesNotSet };
};
