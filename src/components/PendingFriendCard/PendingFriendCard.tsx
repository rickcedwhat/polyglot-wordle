import { FC } from 'react';
import { Avatar, Button, Card, Group, Skeleton, Text } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import { useFriendships } from '@/hooks/useFriendships';
import { useUserProfile } from '@/hooks/useUserProfile';
import { FriendshipDoc } from '@/types/firestore';

interface PendingFriendCardProps {
  friendship: FriendshipDoc;
  friendId: string; // Add friendId prop here
}

export const PendingFriendCard: FC<PendingFriendCardProps> = ({ friendship, friendId }) => {
  const { currentUser } = useAuth();
  // Get the action functions from the useFriendships hook
  const { acceptRequest, removeFriendship } = useFriendships(currentUser?.uid || '');
  const { data: friendProfile, isLoading } = useUserProfile(friendId);

  // Call the acceptRequest function from the hook with the friend's ID
  const handleAccept = () => {
    acceptRequest(friendId);
  };

  // Call the removeFriendship function for both denying and canceling
  const handleRemove = () => {
    removeFriendship(friendId);
  };

  if (isLoading) {
    return (
      <Card withBorder p="md" radius="md">
        <Group>
          <Skeleton height={40} circle />
          <Skeleton height={12} width="70%" />
        </Group>
      </Card>
    );
  }

  if (!friendProfile) {
    return null;
  }

  return (
    <Card withBorder p="md" radius="md">
      <Group>
        <Avatar src={friendProfile.photoURL} alt={friendProfile.displayName} radius="xl" />
        <Text fw={500}>{friendProfile.displayName}</Text>
      </Group>

      {friendship.direction === 'incoming' && (
        <Group mt="md">
          <Button onClick={handleAccept} fullWidth>
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
    </Card>
  );
};
