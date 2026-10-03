import { FC } from 'react';
import { Avatar, Group, Paper, Text } from '@mantine/core';
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

  // A div rather than a button, so the player's profile link can sit inside the row.
  return (
    <Paper
      withBorder
      p="xs"
      radius="md"
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onClick();
        }
      }}
      style={{
        cursor: 'pointer',
        backgroundColor: isSelected ? 'var(--mantine-color-blue-light-hover)' : 'transparent',
      }}
    >
      <Group>
        <Text fw={700} w={20}>
          {rank}.
        </Text>
        <div style={{ flex: 1, minWidth: 0 }}>
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
