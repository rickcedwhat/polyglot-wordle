import { FC } from 'react';
import {
  IconHelpCircle,
  IconHome,
  IconLogout,
  IconRefresh,
  IconSettings,
} from '@tabler/icons-react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DifficultyModal } from '@/components/DifficultyModal/DifficultyModal';
import { HowToPlayModal } from '@/components/HowToPlayModal/HowToPlayModal';
import { useAuth } from '@/context/AuthContext';
import { UserDoc } from '@/types/firestore';

// A helper function to map difficulty names back to a hex character
const difficultyToHex = (difficulty: 'basic' | 'intermediate' | 'advanced'): string => {
  if (difficulty === 'basic') {
    return '0';
  } // 0-4 range
  if (difficulty === 'intermediate') {
    return '5';
  } // 5-9 range
  return 'a'; // a-f range
};

export const Sidebar: FC = () => {
  const navigate = useNavigate();

  const { currentUser, logout } = useAuth();
  const [opened, { open, close }] = useDisclosure(false);
  const [difficultyModalOpened, { open: openDifficultyModal, close: closeDifficultyModal }] =
    useDisclosure(false);

  const handleNewGame = async () => {
    if (!currentUser) {
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
      const randomPart = uuidv4().replace(/-/g, '').substring(0, 24);

      // 3. Construct the difficulty part from preferences
      const difficultyPart =
        difficultyToHex(prefs.en) + difficultyToHex(prefs.es) + difficultyToHex(prefs.fr);

      // 4. Create the full game ID (UUID)
      // We'll add some extra random chars to fill it out to 32
      const extraChars = uuidv4().replace(/-/g, '').substring(0, 5);
      const newGameId = randomPart + difficultyPart + extraChars;

      navigate(`/${newGameId}`);
      window.location.reload();
    } catch (error) {
      console.error('Failed to create new game:', error);
      // Optional: show an error notification to the user
    }
  };

  return (
    <>
      <HowToPlayModal opened={opened} onClose={close} />
      <DifficultyModal opened={difficultyModalOpened} onClose={closeDifficultyModal} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          height: '100%',
        }}
      >
        <div>
          <Button
            leftSection={<IconHome size="1rem" />}
            onClick={() => navigate('/')}
            fullWidth
            variant="light"
            style={{ marginTop: '1rem' }}
          >
            Home
          </Button>
          <Button
            leftSection={<IconRefresh size="1rem" />}
            onClick={handleNewGame}
            fullWidth
            variant="light"
            style={{ marginTop: '1rem' }}
          >
            New Game
          </Button>
          <Button
            leftSection={<IconHelpCircle size="1rem" />}
            onClick={open}
            fullWidth
            variant="light"
            style={{ marginTop: '1rem' }}
          >
            How to Play
          </Button>
          <Button
            leftSection={<IconSettings size={20} />}
            onClick={openDifficultyModal}
            fullWidth
            variant="light"
            style={{ marginTop: '1rem' }}
          >
            Difficulty
          </Button>
        </div>
        <Button
          leftSection={<IconLogout size="1rem" />}
          onClick={logout}
          fullWidth
          variant="light"
          color="red"
          style={{ marginTop: '1rem' }}
        >
          Logout
        </Button>
      </div>
    </>
  );
};
