import { FC } from 'react';
import { Avatar, Group, Paper, Text, UnstyledButton } from '@mantine/core';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { GameDoc } from '@/types/firestore';
import { ProfileLink } from '../ProfileLink/ProfileLink';

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
    <Paper
      withBorder
      p="xs"
      radius="md"
      pos="relative"
      style={{
        backgroundColor: isSelected ? 'var(--mantine-color-blue-light-hover)' : 'transparent',
      }}
    >
      <UnstyledButton
        type="button"
        pos="absolute"
        inset={0}
        w="100%"
        aria-label={`View ${userProfile?.displayName || 'Player'}'s game, rank ${rank}, score ${game.score}`}
        aria-pressed={isSelected}
        onClick={onClick}
        style={{ borderRadius: 'inherit' }}
      />
      <Group style={{ pointerEvents: 'none' }}>
        <Text fw={700} w={20}>
          {rank}.
        </Text>
        <div style={{ flex: 1, minWidth: 0, position: 'relative', pointerEvents: 'auto' }}>
          <ProfileLink userId={game.userId}>
            <Group gap="sm" wrap="nowrap">
              <Avatar
                src={userProfile?.photoURL}
                alt={userProfile?.displayName}
                radius="xl"
                size="sm"
              />
              <Text size="sm" fw={500} truncate>
                {userProfile?.displayName || '...'}
              </Text>
            </Group>
          </ProfileLink>
        </div>
        <Text size="sm" fw={700}>
          {game.score}
        </Text>
      </Group>
    </Paper>
  );
};
