import { FC } from 'react';
import {
  IconHelpCircle,
  IconHome,
  IconLogout,
  IconRefresh,
  IconSettings,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { DifficultyModal } from '@/components/DifficultyModal/DifficultyModal';
import { HowToPlayModal } from '@/components/HowToPlayModal/HowToPlayModal';
import { useAuth } from '@/context/AuthContext';
import { useGameActions } from '@/hooks/useGameActions';
// import { Button } from '@mantine/core';
import { BlurButton as Button } from '../BlurButton/BlurButton';
import { Score } from '../Score/Score';

export const Sidebar: FC = () => {
  const navigate = useNavigate();

  const { logout } = useAuth();
  const [opened, { open, close }] = useDisclosure(false);
  const [difficultyModalOpened, { open: openDifficultyModal, close: closeDifficultyModal }] =
    useDisclosure(false);
  const { createNewGame } = useGameActions();

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
            onClick={createNewGame}
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
          <Score fullWidth />
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
