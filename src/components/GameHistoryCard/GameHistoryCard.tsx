import { FC } from 'react';
import { IconPin, IconPinnedFilled } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ActionIcon, Badge, Box, Button, Card, Group, Text } from '@mantine/core';
import { certificationTrack, FEATS } from '@/achievements/config';
import { useAuth } from '@/context/AuthContext';
import { useGameAchievements } from '@/hooks/useGameAchievements';
import { usePinning } from '@/hooks/usePinning';
import { usePlayedGame } from '@/hooks/usePlayedGame';
import type { GameDoc, UserDoc } from '@/types/firestore.d.ts';
import { gamePath, languagesFromGame } from '@/utils/languages';
import { GameBadgeRow } from '../Badges/GameAchievements';
import MiniBoard from '../MiniBoard/MiniBoard';
import { GamePuzzleAction } from './GamePuzzleAction';
import miniTileClasses from '../MiniTile/MiniTile.module.css';
import classes from './GameHistoryCard.module.css';

interface GameHistoryCardProps {
  game: GameDoc & { id: string };
  userProfile?: UserDoc | null;
  isOwnProfile?: boolean;
}
export const GameHistoryCard: FC<GameHistoryCardProps> = ({ game, userProfile, isOwnProfile }) => {
  const { t, i18n } = useTranslation();
  const { currentUser } = useAuth();
  const played = usePlayedGame(game);
  const own = currentUser?.uid === game.userId;
  const { pinGame, unpinGame, isPending } = usePinning();
  const { feats, levelUps } = useGameAchievements(game);
  const levelUp = levelUps[0];
  const highlight = feats[0]
    ? FEATS[feats[0].id].name
    : levelUp
      ? `${certificationTrack(levelUp.lang).name}: ${certificationTrack(levelUp.lang).levels[levelUp.level].label}`
      : null;
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

  // Finished games show the day they were finished; unfinished ones the day they were started.
  const gameDate = (game.completedAt ?? game.startedAt).toDate().toLocaleDateString(i18n.language);

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder className={classes.card}>
      {highlight && (
        <Text fw={700} mb="sm">
          {highlight}
        </Text>
      )}
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
          {isOwnProfile && own && canPin && (
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
      <Box mt="sm">
        {own ? (
          <Button
            component={Link}
            to={gamePath(game.gameId, languagesFromGame(game))}
            variant="light"
          >
            {t(game.isLiveGame ? 'feed.continueGame' : 'feed.view')}
          </Button>
        ) : (
          <GamePuzzleAction
            game={game}
            profile={userProfile}
            mine={played.mine}
            canReveal={played.canReveal}
            loading={played.isPending}
            failed={played.isError}
            retry={() => played.refetch()}
          />
        )}
      </Box>
      {(feats.length > 0 || levelUps.length > 0) && (
        <Box mt="sm">
          <GameBadgeRow feats={feats} levelUps={levelUps} spoilerSafe={!played.canReveal} />
        </Box>
      )}
    </Card>
  );
};
