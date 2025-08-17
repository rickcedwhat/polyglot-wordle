import { FC } from 'react';
import {
  IconBooks,
  IconHelpCircle,
  IconHome,
  IconLogout,
  IconRefresh,
  IconSettings,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Paper } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DifficultyModal } from '@/components/DifficultyModal/DifficultyModal';
import { HowToPlayModal } from '@/components/HowToPlayModal/HowToPlayModal';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useGameActions } from '@/hooks/useGameActions';
// import { Button } from '@mantine/core';
import { BlurButton as Button } from '../BlurButton/BlurButton';

export const Sidebar: FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [howToPlayOpened, { open: openHowToPlay, close: closeHowToPlay }] = useDisclosure(false);
  const [difficultyModalOpened, { open: openDifficultyModal, close: closeDifficultyModal }] =
    useDisclosure(false);
  const { createNewGame } = useGameActions();
  const { sidebarContent, close } = useSidebar();

  const handleNewGameClick = () => {
    close();
    createNewGame();
  };

  const handleHistoryClick = () => {
    close();
    navigate('/history');
  };

  return (
    <>
      <HowToPlayModal opened={howToPlayOpened} onClose={closeHowToPlay} />
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
            onClick={handleNewGameClick}
            fullWidth
            variant="light"
            style={{ marginTop: '1rem' }}
          >
            New Game
          </Button>
          <Button
            leftSection={<IconHelpCircle size="1rem" />}
            onClick={openHowToPlay}
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
          <Button
            leftSection={<IconBooks size={20} />}
            onClick={handleHistoryClick}
            fullWidth
            variant="light"
            style={{ marginTop: '1rem' }}
          >
            History
          </Button>
          {sidebarContent && (
            <Paper withBorder p="xs" radius="md" mb="md" mt="md">
              {sidebarContent}
            </Paper>
          )}
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
