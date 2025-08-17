import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Card, Group, Image, Text } from '@mantine/core';
import type { GameDoc } from '@/types/firestore.d.ts';
import classes from './GameHistoryCard.module.css';

interface GameHistoryCardProps {
  game: GameDoc & { id: string };
}

export const GameHistoryCard: FC<GameHistoryCardProps> = ({ game }) => {
  let status: 'Won' | 'Lost' | 'In Progress';
  let imageSrc: string;
  let color: string;

  if (game.isLiveGame) {
    status = 'In Progress';
    imageSrc = '/inprogress.png';
    color = 'blue';
  } else if (game.isWin) {
    status = 'Won';
    imageSrc = '/win.png';
    color = 'green';
  } else {
    status = 'Lost';
    imageSrc = '/loss.png';
    color = 'red';
  }

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
        <Image src={imageSrc} height={160} alt={status} />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500}>{gameDate}</Text>
        <Badge color={color}>{status}</Badge>
      </Group>

      <Text size="sm" c="dimmed">
        Score: {game.score ?? '---'}
      </Text>
    </Card>
  );
};
