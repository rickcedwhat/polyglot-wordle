import { FC, useCallback, useState } from 'react';
import { IconSwords } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Paper } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { FlagsModal } from '@/components/FlagsModal/FlagsModal';
import { GameSetupDialog } from '@/components/GameSetup/GameSetupDialog';
import type { HelpTopic } from '@/components/HowToPlayModal/HelpSlides';
import { HowToPlayModal } from '@/components/HowToPlayModal/HowToPlayModal';
import { UiLanguageModal } from '@/components/UiLanguage/UiLanguagePicker';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useChallengeResultToasts, useChallenges } from '@/hooks/useChallenges';
import { useGameActions } from '@/hooks/useGameActions';
import { openSandboxDrawer } from '@/hooks/useSandboxDrawer';
import { showToast } from '@/utils/toast';
import { SidebarNavigation } from './SidebarNavigation';

interface ChallengeToast {
  challengeId: string;
  message: string;
}

export const Sidebar: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, currentUser } = useAuth();
  const { createNewGame, needsSetup } = useGameActions();
  const { sidebarContent, close: closeSidebar } = useSidebar();
  const { unreadCount } = useChallenges();
  const [howToPlayOpened, { open: openHowToPlay, close: closeHowToPlay }] = useDisclosure(false);
  const [setupOpened, { open: openSetupDialog, close: closeSetup }] = useDisclosure(false);
  const [helpTopic, setHelpTopic] = useState<HelpTopic>('play');
  const [setupMode, setSetupMode] = useState<'newGame' | 'settings'>('newGame');
  const openSetup = (mode: 'newGame' | 'settings') => {
    setSetupMode(mode);
    openSetupDialog();
  };
  const [flagsModalOpened, { open: openFlagsModal, close: closeFlagsModal }] = useDisclosure(false);
  const [languageOpened, { open: openLanguage, close: closeLanguage }] = useDisclosure(false);

  const handleToast = useCallback(
    ({ challengeId, message }: ChallengeToast) => {
      const id = `challenge-${challengeId}`;
      showToast({
        id,
        icon: <IconSwords size={18} />,
        message,
        color: 'blue',
        style: { cursor: 'pointer' },
        onClick: () => {
          notifications.hide(id);
          navigate('/challenges');
          closeSidebar();
        },
      });
    },
    [navigate, closeSidebar]
  );
  useChallengeResultToasts(handleToast, { isPlaying: location.pathname.startsWith('/game/') });

  const handleNewGameClick = () => {
    if (needsSetup) {
      openSetup('newGame');
    } else {
      createNewGame();
    }
  };

  const handleSandboxTools = () => {
    if (location.pathname !== '/sandbox') {
      navigate('/sandbox');
    }
    openSandboxDrawer();
  };

  const handleNavigate = (action: () => void) => {
    action();
    closeSidebar();
  };

  return (
    <>
      <HowToPlayModal opened={howToPlayOpened} onClose={closeHowToPlay} initialTopic={helpTopic} />
      <GameSetupDialog opened={setupOpened} onClose={closeSetup} mode={setupMode} />
      <FlagsModal opened={flagsModalOpened} onClose={closeFlagsModal} />
      <UiLanguageModal opened={languageOpened} onClose={closeLanguage} />

      <SidebarNavigation
        currentPath={location.pathname}
        user={currentUser ?? { uid: '' }}
        unreadCount={unreadCount}
        activeHelpTopic={howToPlayOpened ? helpTopic : undefined}
        onNavigate={closeSidebar}
        onNewGame={() => handleNavigate(handleNewGameClick)}
        onHelpTopic={(topic) =>
          handleNavigate(() => {
            setHelpTopic(topic);
            openHowToPlay();
          })
        }
        onSetup={() => handleNavigate(() => openSetup('settings'))}
        onFlags={() => handleNavigate(openFlagsModal)}
        onLanguage={() => handleNavigate(openLanguage)}
        onLogout={logout}
        onSandbox={import.meta.env.DEV ? () => handleNavigate(handleSandboxTools) : undefined}
      >
        {sidebarContent && (
          <Paper withBorder p="xs" radius="md" mt="md">
            {sidebarContent}
          </Paper>
        )}
      </SidebarNavigation>
    </>
  );
};
