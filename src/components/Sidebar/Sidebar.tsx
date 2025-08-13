import { FC } from 'react';
import { IconHelpCircle, IconHome, IconLogout, IconRefresh } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { HowToPlayModal } from '@/components/HowToPlayModal/HowToPlayModal';
import { useAuth } from '@/context/AuthContext';

export const Sidebar: FC = () => {
  const navigate = useNavigate();

  const { logout } = useAuth();
  const [opened, { open, close }] = useDisclosure(false);

  const handleNewGame = () => {
    const newGameId = uuidv4();
    navigate(`/game/${newGameId}`);
    // This will cause a full page reload and fetch new words.
    // A more seamless UX could be achieved with client-side state management.
    window.location.reload();
  };

  return (
    <>
      <HowToPlayModal opened={opened} onClose={close} />
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
