import { FC, useMemo } from 'react';
import { IconSwords } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { Center, Group, Loader, Modal, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import type { GameDoc } from '@/types/firestore';
import { languagesFromGame } from '@/utils/languages';
import { scoringVersionOf } from '@/utils/wordUtils';
import { TurnDuel, type DuelPlayer } from './TurnDuel';

export interface HeadToHeadSide {
  userId: string;
  name: string;
  photoURL?: string | null;
}

interface HeadToHeadModalProps {
  opened: boolean;
  onClose: () => void;
  gameId: string;
  /** You first, then your opponent. */
  sides: [HeadToHeadSide, HeadToHeadSide];
}

const COLORS = ['blue', 'orange'];

const fetchGame = async (userId: string, gameId: string) => {
  const snap = await getDoc(doc(getFirestore(), 'games', `${userId}_${gameId}`));
  return snap.exists() ? (snap.data() as GameDoc) : null;
};

/** Both players' games for one puzzle, replayed turn by turn. */
export const HeadToHeadModal: FC<HeadToHeadModalProps> = ({ opened, onClose, gameId, sides }) => {
  const phone = useMediaQuery('(max-width: 48em)');
  const { t } = useTranslation();
  const ids = sides.map((s) => s.userId);
  const { data: games, isLoading } = useQuery({
    queryKey: ['headToHead', gameId, ...ids],
    queryFn: () => Promise.all(ids.map((id) => fetchGame(id, gameId))),
    enabled: opened,
    staleTime: 1000 * 60 * 5,
  });

  const duel = useMemo(() => {
    const first = games?.[0];
    if (!first || !games?.[1]) {
      return null;
    }
    const players: DuelPlayer[] = sides.map((side, i) => ({
      id: side.userId,
      name: side.name,
      photoURL: side.photoURL,
      color: COLORS[i],
      guesses: games[i]?.guessHistory ?? [],
      scoringVersion: scoringVersionOf(games[i] ?? first),
    }));
    return {
      players,
      words: first.words,
      languages: languagesFromGame(first),
      scoringVersion: scoringVersionOf(first),
    };
  }, [games, sides]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      fullScreen={phone}
      centered
      title={
        <Group gap={6}>
          <IconSwords size={16} />
          <Text fw={700} size="sm">
            {t('replay.title')}
          </Text>
        </Group>
      }
    >
      {isLoading && (
        <Center py="xl">
          <Loader />
        </Center>
      )}
      {!isLoading && !duel && (
        <Text c="dimmed" ta="center" py="xl">
          {t('replay.loadFailed')}
        </Text>
      )}
      {duel && <TurnDuel {...duel} />}
    </Modal>
  );
};
