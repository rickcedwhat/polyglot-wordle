import { FC } from 'react';
import {
  IconHelpCircle,
  IconHome,
  IconLogout,
  IconRefresh,
  IconSettings,
  IconUser,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Divider, Paper, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DifficultyModal } from '@/components/DifficultyModal/DifficultyModal';
import { HowToPlayModal } from '@/components/HowToPlayModal/HowToPlayModal';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useGameActions } from '@/hooks/useGameActions';
import { BlurButton as Button } from '../BlurButton/BlurButton';
import classes from './Sidebar.module.css';

export const Sidebar: FC = () => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const { createNewGame, preferencesNotSet } = useGameActions();
  const { sidebarContent, close: closeSidebar } = useSidebar();
  const [howToPlayOpened, { open: openHowToPlay, close: closeHowToPlay }] = useDisclosure(false);
  const [difficultyModalOpened, { open: openDifficultyModal, close: closeDifficultyModal }] =
    useDisclosure(false);

  const handleNewGameClick = () => {
    if (preferencesNotSet) {
      openDifficultyModal();
    } else {
      createNewGame();
    }
  };

  // A single handler for all navigation actions
  const handleNavigate = (action: () => void) => {
    action();
    closeSidebar(); // Always close the sidebar after navigation
  };

  const mainLinks = [
    { label: 'Home', icon: IconHome, action: () => navigate('/') },
    { label: 'My Profile', icon: IconUser, action: () => navigate(`/profile/${currentUser?.uid}`) },
    { label: 'New Game', icon: IconRefresh, action: handleNewGameClick },
  ];

  const toolLinks = [
    { label: 'How to Play', icon: IconHelpCircle, action: openHowToPlay },
    { label: 'Difficulty', icon: IconSettings, action: openDifficultyModal },
  ];

  return (
    <>
      <HowToPlayModal opened={howToPlayOpened} onClose={closeHowToPlay} />
      <DifficultyModal opened={difficultyModalOpened} onClose={closeDifficultyModal} />

      <div className={classes.wrapper}>
        <Stack>
          {mainLinks.map((link) => (
            <Button
              key={link.label}
              leftSection={<link.icon size="1rem" />}
              onClick={() => handleNavigate(link.action)}
              fullWidth
              variant="light"
            >
              {link.label}
            </Button>
          ))}

          <Divider />

          {toolLinks.map((link) => (
            <Button
              key={link.label}
              leftSection={<link.icon size="1rem" />}
              onClick={link.action} // Modal buttons don't need to close the sidebar
              fullWidth
              variant="light"
            >
              {link.label}
            </Button>
          ))}

          {sidebarContent && (
            <Paper withBorder p="xs" radius="md" mt="md">
              {sidebarContent}
            </Paper>
          )}
        </Stack>

        <Button
          leftSection={<IconLogout size="1rem" />}
          onClick={logout}
          fullWidth
          variant="light"
          color="red"
        >
          Logout
        </Button>
      </div>
    </>
  );
};
