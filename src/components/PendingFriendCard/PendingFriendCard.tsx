import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Group } from '@mantine/core';
import { FriendCard } from '@/components/FriendCard/FriendCard';
import { useAuth } from '@/context/AuthContext';
import { useFriendships } from '@/hooks/useFriendships';
import { FriendshipDoc } from '@/types/firestore';

interface PendingFriendCardProps {
  friendship: FriendshipDoc;
  friendId: string;
}

export const PendingFriendCard: FC<PendingFriendCardProps> = ({ friendship, friendId }) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const { acceptRequest, removeFriendship } = useFriendships(currentUser?.uid || '');

  // Denying and canceling both remove the friendship
  const handleRemove = () => {
    removeFriendship(friendId);
  };

  return (
    <FriendCard friendId={friendId}>
      {friendship.direction === 'incoming' && (
        <Group mt="md">
          <Button onClick={() => acceptRequest(friendId)} fullWidth>
            {t('friends.accept')}
          </Button>
          <Button onClick={handleRemove} fullWidth variant="outline">
            {t('friends.deny')}
          </Button>
        </Group>
      )}

      {friendship.direction === 'outgoing' && (
        <Button onClick={handleRemove} mt="md" fullWidth variant="outline">
          {t('friends.cancelRequest')}
        </Button>
      )}
    </FriendCard>
  );
};
