import { useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/context/AuthContext';
import type { UserDoc } from '@/types/firestore.d.ts';

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
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createNewGame = async () => {
    if (!currentUser) {
      console.error('Cannot create a new game without a logged-in user.');
      // Optional: show a notification to the user
      return;
    }

    try {
      // 1. Fetch the user's latest preferences from Firestore
      const db = getFirestore();
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        throw new Error('User profile not found');
      }
      const prefs = userDocSnap.data().difficultyPrefs as UserDoc['difficultyPrefs'];

      // 2. Generate the random part of the UUID (for word indices)
      const fullUUID = uuidv4().replace(/-/g, '');
      const randomPart = fullUUID.substring(0, 24);

      // 3. Construct the difficulty part from preferences
      const difficultyPart =
        difficultyToHex(prefs.en) + difficultyToHex(prefs.es) + difficultyToHex(prefs.fr);

      // 4. Create the full game ID (UUID)
      const extraChars = fullUUID.substring(0, 5);
      const newGameId = randomPart + difficultyPart + extraChars;
      await queryClient.invalidateQueries({ queryKey: ['gameHistory'] });

      navigate(`/game/${newGameId}`);
    } catch (error) {
      console.error('Failed to create new game:', error);
      // Optional: show an error notification to the user
    }
  };

  // Return an object with all the actions you want to expose
  return { createNewGame };
};
