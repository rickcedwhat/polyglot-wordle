import { FC } from 'react';
import { IconEye } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge, Box, Group, Paper, Text, UnstyledButton } from '@mantine/core';
import { UserAvatar } from '@/components/UserAvatar/UserAvatar';
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
  const { t } = useTranslation();

  return (
    <Paper
      withBorder
      p="xs"
      radius="md"
      pos="relative"
      style={{
        backgroundColor: isSelected ? 'var(--mantine-color-blue-light)' : 'transparent',
        borderColor: isSelected ? 'var(--mantine-color-blue-filled)' : undefined,
      }}
    >
      <UnstyledButton
        type="button"
        pos="absolute"
        inset={0}
        w="100%"
        aria-label={t('leaderboard.viewGame', {
          name: userProfile?.displayName || t('postGame.player'),
          rank,
          score: game.score,
        })}
        aria-pressed={isSelected}
        onClick={onClick}
        style={{ borderRadius: 'inherit' }}
      />
      <Group wrap="nowrap" style={{ pointerEvents: 'none' }}>
        <Text fw={700} w={20}>
          {rank}.
        </Text>
        <Box style={{ flex: 1, minWidth: 0 }}>
          {/* Only the avatar and name open the profile; the rest of the row picks the game. */}
          <Box display="inline-block" maw="100%" pos="relative" style={{ pointerEvents: 'auto' }}>
            <ProfileLink userId={game.userId}>
              <Group gap="sm" wrap="nowrap">
                <UserAvatar src={userProfile?.photoURL} name={userProfile?.displayName} size="sm" />
                <Text size="sm" fw={500} truncate>
                  {userProfile?.displayName || '...'}
                </Text>
              </Group>
            </ProfileLink>
          </Box>
        </Box>
        {isSelected ? (
          <Badge size="sm" variant="filled">
            {t('leaderboard.viewing')}
          </Badge>
        ) : (
          <Group gap={4} c="dimmed" wrap="nowrap">
            <IconEye size={14} />
            <Text size="xs">{t('leaderboard.view')}</Text>
          </Group>
        )}
        <Text size="sm" fw={700}>
          {game.score}
        </Text>
      </Group>
    </Paper>
  );
};
