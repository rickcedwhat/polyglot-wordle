import { FC, useState } from 'react';
import { IconSwords } from '@tabler/icons-react';
import { Avatar, Badge, CloseButton, Group, Paper, Text } from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import type { ChallengerProfile } from '@/hooks/useChallenge';
import type { GameDoc } from '@/types/firestore';

interface ChallengeBannerProps {
  challengerUser: ChallengerProfile | null;
  challengerGame: GameDoc;
}

export const ChallengeBanner: FC<ChallengeBannerProps> = ({ challengerUser, challengerGame }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const name = challengerUser?.displayName || 'A Friend';
  const turns = challengerGame.guessHistory.length;
  const score = challengerGame.score ?? 0;

  return (
    <Paper
      p="xs"
      radius="md"
      withBorder
      style={{
        background:
          'linear-gradient(135deg, rgba(34, 139, 230, 0.15) 0%, rgba(18, 184, 134, 0.15) 100%)',
        borderColor: 'rgba(34, 139, 230, 0.4)',
        maxWidth: 600,
        margin: '0 auto 12px auto',
        width: '100%',
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap">
          <Avatar src={challengerUser?.photoURL} size="sm" radius="xl" color="blue">
            <IconSwords size={16} />
          </Avatar>
          <div>
            <Group gap={6} align="center">
              <Text size="xs" fw={700} c="blue.3">
                CHALLENGE MODE
              </Text>
              <Badge size="xs" variant="filled" color="yellow">
                {score} PTS
              </Badge>
            </Group>
            <Text size="xs" c="gray.2">
              Can you beat{' '}
              <Text span fw={700}>
                {name}
              </Text>{' '}
              ({turns}/{MAX_GUESSES} turns)?
            </Text>
          </div>
        </Group>

        <CloseButton
          size="xs"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss challenge banner"
        />
      </Group>
    </Paper>
  );
};
