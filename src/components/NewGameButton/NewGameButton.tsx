import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@mantine/core';
import { useGameActions } from '@/hooks/useGameActions';
import { showToast } from '@/utils/toast';
import { GameSetupDialog } from '../GameSetup/GameSetupDialog';

/** The normal New game flow, including the player's saved skip-picker preference. */
export const NewGameButton = () => {
  const { t } = useTranslation();
  const { createNewGame, needsSetup } = useGameActions();
  const [opened, setOpened] = useState(false);
  const [starting, setStarting] = useState(false);
  const handleClick = async () => {
    if (needsSetup) {
      setOpened(true);
      return;
    }
    setStarting(true);
    try {
      if (!(await createNewGame())) {
        showToast({ message: t('setup.startFailed'), color: 'red' }, { immediate: true });
      }
    } finally {
      setStarting(false);
    }
  };
  return (
    <>
      <GameSetupDialog opened={opened} onClose={() => setOpened(false)} mode="newGame" />
      <Button
        size="xs"
        leftSection={<IconPlus size={14} />}
        loading={starting}
        onClick={handleClick}
      >
        {t('nav.newGame')}
      </Button>
    </>
  );
};
