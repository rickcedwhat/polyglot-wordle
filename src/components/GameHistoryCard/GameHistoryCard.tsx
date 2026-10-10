import { FC } from 'react';
import { IconPin, IconPinnedFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ActionIcon, Badge, Box, Card, Group, Text } from '@mantine/core';
import { useGameAchievements } from '@/hooks/useGameAchievements';
import { usePinning } from '@/hooks/usePinning';
import type { GameDoc, UserDoc } from '@/types/firestore.d.ts';
import { gamePath, languagesFromGame } from '@/utils/languages';
import { GameBadgeRow } from '../Badges/GameAchievements';
import MiniBoard from '../MiniBoard/MiniBoard';
import miniTileClasses from '../MiniTile/MiniTile.module.css';
import classes from './GameHistoryCard.module.css';

interface GameHistoryCardProps {
  game: GameDoc & { id: string };
  userProfile?: UserDoc | null;
  isOwnProfile?: boolean;
}
export const GameHistoryCard: FC<GameHistoryCardProps> = ({ game, userProfile, isOwnProfile }) => {
  const { t, i18n } = useTranslation();
  const { pinGame, unpinGame, isPending } = usePinning();
  const { feats, levelUps } = useGameAchievements(game);
  const isPinned = userProfile?.pinnedGames?.includes(game.gameId);
  const canPin = userProfile && (userProfile.pinnedGames?.length < 5 || isPinned);

  const handlePinClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating when clicking the pin button
    e.stopPropagation();
    if (isPinned) {
      unpinGame(game.gameId);
    } else {
      pinGame(game.gameId);
    }
  };

  let status: string;
  let color: string;

  if (game.isLiveGame) {
    status = t('history.inProgress');
    color = 'blue';
  } else if (game.isWin) {
    status = t('history.won');
    color = 'green';
  } else {
    status = t('history.lost');
    color = 'red';
  }

  const numberOfGuesses = game.guessHistory.length;

  // Convert Firestore Timestamp to a readable date
  const gameDate = game.startedAt.toDate().toLocaleDateString(i18n.language);

  return (
    <Card
      component={Link}
      to={gamePath(game.gameId, languagesFromGame(game))}
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      className={classes.card}
    >
      <Card.Section>
        <Group
          justify="center"
          gap="xs"
          wrap="nowrap"
          mt="xs"
          mb="xs"
          className={miniTileClasses.fixedHeight}
        >
          {game.shuffledLanguages.map((lang) => (
            <MiniBoard
              key={lang}
              solutionWord={game.words[lang]!}
              submittedGuesses={game.guessHistory}
            />
          ))}
        </Group>
      </Card.Section>

      <Group justify="space-between">
        <Text fw={500}>{gameDate}</Text>
        <Badge color={color}>{status}</Badge>
      </Group>
      <Group justify="space-between" mt="xs">
        <Text size="sm" c="dimmed">
          {t('history.score', { score: game.score ?? '---' })}
        </Text>
        <Text size="sm" c="dimmed">
          {t('history.guesses', { count: numberOfGuesses })}
        </Text>
        <Group gap="xs">
          {isOwnProfile && canPin && (
            <ActionIcon
              onClick={handlePinClick}
              variant="subtle"
              loading={isPending}
              title={t('history.pin')}
            >
              {isPinned ? <IconPinnedFilled size={20} /> : <IconPin size={20} />}
            </ActionIcon>
          )}
        </Group>
      </Group>
      {(feats.length > 0 || levelUps.length > 0) && (
        <Box mt="sm">
          <GameBadgeRow feats={feats} levelUps={levelUps} />
        </Box>
      )}
    </Card>
  );
};
