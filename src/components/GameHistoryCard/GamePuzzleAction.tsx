import { useState } from 'react';
import { IconSwords } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button, Stack, Text } from '@mantine/core';
import { HeadToHeadModal } from '@/components/Replay/HeadToHeadModal';
import { useAuth } from '@/context/AuthContext';
import type { GameDoc, UserDoc } from '@/types/firestore';
import { gamePath, languagesFromGame } from '@/utils/languages';

export const GamePuzzleAction = ({
  game,
  profile,
  mine,
  canReveal,
  loading,
  failed,
  retry,
}: {
  game: GameDoc;
  profile?: UserDoc | null;
  mine?: GameDoc | null;
  canReveal: boolean;
  loading: boolean;
  failed: boolean;
  retry: () => void;
}) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  if (!currentUser || currentUser.uid === game.userId || game.isLiveGame) {
    return null;
  }
  if (failed) {
    return (
      <Button variant="subtle" onClick={retry}>
        {t('common.tryAgain')}
      </Button>
    );
  }
  return (
    <Stack gap="xs">
      {canReveal ? (
        <Button
          variant="light"
          leftSection={<IconSwords size={16} />}
          onClick={() => setOpened(true)}
        >
          {t('feed.compare')}
        </Button>
      ) : (
        <Button
          component={Link}
          to={gamePath(game.gameId, languagesFromGame(game), { challenger: game.userId })}
          loading={loading}
          leftSection={<IconSwords size={16} />}
          variant="light"
        >
          {t(mine ? 'feed.continue' : 'feed.challenge')}
        </Button>
      )}
      {canReveal && (
        <Text size="sm" c="dimmed">
          {game.shuffledLanguages.map((lang) => game.words[lang]).join(' · ')}
        </Text>
      )}
      {opened && canReveal && (
        <HeadToHeadModal
          opened
          onClose={() => setOpened(false)}
          gameId={game.gameId}
          sides={[
            { userId: currentUser.uid, name: t('postGame.you'), photoURL: currentUser.photoURL },
            {
              userId: game.userId,
              name: profile?.displayName || t('challenges.opponent'),
              photoURL: profile?.photoURL,
            },
          ]}
        />
      )}
    </Stack>
  );
};
