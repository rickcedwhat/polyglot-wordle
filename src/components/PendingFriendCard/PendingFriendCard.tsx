import { FC } from 'react';
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
            Accept
          </Button>
          <Button onClick={handleRemove} fullWidth variant="outline">
            Deny
          </Button>
        </Group>
      )}

      {friendship.direction === 'outgoing' && (
        <Button onClick={handleRemove} mt="md" fullWidth variant="outline">
          Cancel Request
        </Button>
      )}
    </FriendCard>
  );
};
