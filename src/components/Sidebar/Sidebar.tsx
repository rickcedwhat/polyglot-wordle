import { FC, useCallback, useEffect, useRef, useState } from 'react';
import {
  IconAdjustmentsHorizontal,
  IconFlag,
  IconHelpCircle,
  IconHome,
  IconLanguage,
  IconLogout,
  IconRefresh,
  IconSettings,
  IconSwords,
  IconUser,
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Affix, Badge, Divider, Group, Paper, Stack, Text, Transition } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { DifficultyModal } from '@/components/DifficultyModal/DifficultyModal';
import { FlagsModal } from '@/components/FlagsModal/FlagsModal';
import { HowToPlayModal } from '@/components/HowToPlayModal/HowToPlayModal';
import { LanguagePickerModal } from '@/components/LanguagePickerModal/LanguagePickerModal';
import { useAuth } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';
import { useChallengeResultToasts, useChallenges } from '@/hooks/useChallenges';
import { useGameActions } from '@/hooks/useGameActions';
import { openSandboxDrawer } from '@/hooks/useSandboxDrawer';
import type { Language } from '@/types/firestore';
import { BlurButton as Button } from '../BlurButton/BlurButton';
import classes from './Sidebar.module.css';

interface ChallengeToast {
  challengeId: string;
  message: string;
}

export const Sidebar: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, currentUser } = useAuth();
  const { createNewGame, preferencesNotSet, shouldAskLanguages } = useGameActions();
  const { sidebarContent, close: closeSidebar } = useSidebar();
  const { unreadCount } = useChallenges();
  const [howToPlayOpened, { open: openHowToPlay, close: closeHowToPlay }] = useDisclosure(false);
  const [difficultyModalOpened, { open: openDifficultyModal, close: closeDifficultyModal }] =
    useDisclosure(false);
  const [languageModalOpened, { open: openLanguageModal, close: closeLanguageModal }] =
    useDisclosure(false);
  const [languageModalStartsGame, setLanguageModalStartsGame] = useState(true);
  const [flagsModalOpened, { open: openFlagsModal, close: closeFlagsModal }] = useDisclosure(false);
  const [toast, setToast] = useState<ChallengeToast | null>(null);
  const toastQueueRef = useRef<ChallengeToast[]>([]);

  const handleToast = useCallback((item: ChallengeToast) => {
    setToast((currentToast) => {
      if (currentToast) {
        toastQueueRef.current.push(item);
        return currentToast;
      }
      return item;
    });
  }, []);
  useChallengeResultToasts(handleToast);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setToast(toastQueueRef.current.shift() ?? null);
    }, 6000);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  const handleNewGameClick = () => {
    if (preferencesNotSet) {
      openDifficultyModal();
    } else if (shouldAskLanguages) {
      setLanguageModalStartsGame(true);
      openLanguageModal();
    } else {
      createNewGame();
    }
  };

  const handleOpenLanguageSettings = () => {
    setLanguageModalStartsGame(false);
    openLanguageModal();
  };

  const handleLanguageConfirm = (languages: [Language, Language, Language]) => {
    if (languageModalStartsGame) {
      createNewGame({ languages });
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

  const mainLinks: {
    label: string;
    icon: typeof IconHome;
    action: () => void;
    badge?: number;
  }[] = [
    { label: 'Home', icon: IconHome, action: () => navigate('/') },
    { label: 'My Profile', icon: IconUser, action: () => navigate(`/profile/${currentUser?.uid}`) },
    {
      label: 'Challenges',
      icon: IconSwords,
      action: () => navigate('/challenges'),
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    { label: 'New Game', icon: IconRefresh, action: handleNewGameClick },
  ];

  const toolLinks = [
    { label: 'How to Play', icon: IconHelpCircle, action: openHowToPlay },
    { label: 'Difficulty', icon: IconSettings, action: openDifficultyModal },
    { label: 'Languages', icon: IconLanguage, action: handleOpenLanguageSettings },
    { label: 'Custom Flags / Emojis', icon: IconFlag, action: openFlagsModal },
    { label: 'Sandbox Tools', icon: IconAdjustmentsHorizontal, action: handleSandboxTools },
  ];

  return (
    <>
      <HowToPlayModal opened={howToPlayOpened} onClose={closeHowToPlay} />
      <DifficultyModal opened={difficultyModalOpened} onClose={closeDifficultyModal} />
      <LanguagePickerModal
        opened={languageModalOpened}
        onClose={closeLanguageModal}
        startGameOnConfirm={languageModalStartsGame}
        onConfirm={handleLanguageConfirm}
      />
      <FlagsModal opened={flagsModalOpened} onClose={closeFlagsModal} />

      <div className={classes.wrapper}>
        <Stack>
          {mainLinks.map((link) => (
            <Button
              key={link.label}
              leftSection={<link.icon size="1rem" />}
              onClick={() => handleNavigate(link.action)}
              fullWidth
              variant="light"
              rightSection={
                link.badge ? (
                  <Badge size="sm" circle color="blue">
                    {link.badge}
                  </Badge>
                ) : undefined
              }
            >
              {link.label}
            </Button>
          ))}

          <Divider />

          {toolLinks.map((link) => (
            <Button
              key={link.label}
              leftSection={<link.icon size="1rem" />}
              onClick={link.action}
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

      <Affix position={{ bottom: 20, right: 20 }}>
        <Transition transition="slide-up" mounted={!!toast}>
          {(styles) => (
            <Paper
              style={styles}
              shadow="md"
              p="sm"
              radius="md"
              withBorder
              maw={360}
              onClick={() => {
                setToast(toastQueueRef.current.shift() ?? null);
                navigate('/challenges');
                closeSidebar();
              }}
            >
              <Group gap="xs" wrap="nowrap">
                <IconSwords size={16} />
                <Text size="sm">{toast?.message}</Text>
              </Group>
            </Paper>
          )}
        </Transition>
      </Affix>
    </>
  );
};
