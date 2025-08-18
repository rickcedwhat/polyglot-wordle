import { FC } from 'react';
import { IconPin, IconPinnedFilled } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { ActionIcon, Badge, Card, Group, Text } from '@mantine/core';
import { usePinning } from '@/hooks/usePinning';
import type { GameDoc, UserDoc } from '@/types/firestore.d.ts';
import MiniBoard from '../MiniBoard/MiniBoard';
import miniTileClasses from '../MiniTile/MiniTile.module.css';
import classes from './GameHistoryCard.module.css';

interface GameHistoryCardProps {
  game: GameDoc & { id: string };
  userProfile?: UserDoc | null;
  isOwnProfile?: boolean;
}
export const GameHistoryCard: FC<GameHistoryCardProps> = ({ game, userProfile, isOwnProfile }) => {
  const { pinGame, unpinGame, isPending } = usePinning();

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

  let status: 'Won' | 'Lost' | 'In Progress';
  let color: string;

  if (game.isLiveGame) {
    status = 'In Progress';
    color = 'blue';
  } else if (game.isWin) {
    status = 'Won';
    color = 'green';
  } else {
    status = 'Lost';
    color = 'red';
  }

  const numberOfGuesses = game.guessHistory.length;

  // Convert Firestore Timestamp to a readable date
  const gameDate = game.startedAt.toDate().toLocaleDateString();

  return (
    <Card
      component={Link}
      to={`/game/${game.gameId}`}
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
              solutionWord={game.words[lang]}
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
          Score: {game.score ?? '---'}
        </Text>
        <Text size="sm" c="dimmed">
          Guesses: {numberOfGuesses}
        </Text>
        {isOwnProfile && canPin && (
          <ActionIcon onClick={handlePinClick} variant="subtle" loading={isPending}>
            {isPinned ? <IconPinnedFilled size={20} /> : <IconPin size={20} />}
          </ActionIcon>
        )}
      </Group>
    </Card>
  );
};
