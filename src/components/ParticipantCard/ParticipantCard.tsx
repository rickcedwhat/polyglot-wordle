import { FC } from 'react';
import { Avatar, Badge, Group, Paper, Text } from '@mantine/core';
import type { ChallengeDoc } from '@/types/firestore';

interface ParticipantCardProps {
  participant: ChallengeDoc['participants'][string];
  isCreator: boolean;
}

export const ParticipantCard: FC<ParticipantCardProps> = ({ participant, isCreator }) => {
  const hasFinished = participant.score !== null;

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between">
        <Group>
          <Avatar src={participant.photoURL} alt={participant.displayName} radius="xl" />
          <div>
            <Text fw={500}>{participant.displayName}</Text>
            <Text size="xs" c="dimmed">
              {hasFinished ? `Score: ${participant.score}` : 'Has not played yet'}
            </Text>
          </div>
        </Group>
        {isCreator && <Badge variant="light">Creator</Badge>}
      </Group>
    </Paper>
  );
};
