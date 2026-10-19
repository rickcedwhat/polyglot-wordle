import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@mantine/core';
import { useGameActions } from '@/hooks/useGameActions';
import { GameSetupDialog } from '../GameSetup/GameSetupDialog';

/** The normal New game flow, including the player's saved skip-picker preference. */
export const NewGameButton = () => {
  const { t } = useTranslation();
  const { createNewGame, needsSetup } = useGameActions();
  const [opened, setOpened] = useState(false);
  return (
    <>
      <GameSetupDialog opened={opened} onClose={() => setOpened(false)} mode="newGame" />
      <Button
        size="xs"
        leftSection={<IconPlus size={14} />}
        onClick={() => (needsSetup ? setOpened(true) : void createNewGame())}
      >
        {t('nav.newGame')}
      </Button>
    </>
  );
};
