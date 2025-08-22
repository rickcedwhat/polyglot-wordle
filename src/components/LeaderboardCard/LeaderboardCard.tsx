import { FC } from 'react';
import { Avatar, Group, Paper, Text, UnstyledButton } from '@mantine/core';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { GameDoc } from '@/types/firestore';

interface LeaderboardCardProps {
  game: GameDoc;
  rank: number;
  onClick: () => void;
  isSelected: boolean;
}

export const LeaderboardCard: FC<LeaderboardCardProps> = ({ game, rank, onClick, isSelected }) => {
  // Fetch the profile for the user who set this score
  const { data: userProfile } = useUserProfile(game.userId);

  return (
    <UnstyledButton onClick={onClick}>
      <Paper
        withBorder
        p="xs"
        radius="md"
        style={{
          backgroundColor: isSelected ? 'var(--mantine-color-blue-light-hover)' : 'transparent',
        }}
      >
        <Group>
          <Text fw={700} w={20}>
            {rank}.
          </Text>
          <Avatar
            src={userProfile?.photoURL}
            alt={userProfile?.displayName}
            radius="xl"
            size="sm"
          />
          <Text size="sm" fw={500} style={{ flex: 1 }}>
            {userProfile?.displayName || '...'}
          </Text>
          <Text size="sm" fw={700}>
            {game.score}
          </Text>
        </Group>
      </Paper>
    </UnstyledButton>
  );
};
