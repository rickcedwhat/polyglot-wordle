import { useTranslation } from 'react-i18next';
import { Group, Stack, Text } from '@mantine/core';
import { GameHistoryCard } from '@/components/GameHistoryCard/GameHistoryCard';
import { ProfileLink } from '@/components/ProfileLink/ProfileLink';
import { UserAvatar } from '@/components/UserAvatar/UserAvatar';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { GameDoc } from '@/types/firestore';

export const FeedCard = ({ game }: { game: GameDoc & { id: string } }) => {
  const { data: profile } = useUserProfile(game.userId);
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  return (
    <Stack gap="xs">
      <ProfileLink userId={game.userId}>
        <Group gap="sm">
          <UserAvatar src={profile?.photoURL} name={profile?.displayName} size="sm" />
          <Text fw={600}>{profile?.displayName || t('challenges.opponent')}</Text>
        </Group>
      </ProfileLink>
      <GameHistoryCard
        game={game}
        userProfile={profile}
        isOwnProfile={currentUser?.uid === game.userId}
      />
    </Stack>
  );
};
