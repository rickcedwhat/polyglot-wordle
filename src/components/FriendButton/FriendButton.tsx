import { FC, useMemo } from 'react';
import { IconUserCancel, IconUserExclamation, IconUserPlus } from '@tabler/icons-react';
import { Button, Group } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import { useFriendships } from '@/hooks/useFriendships';

interface FriendButtonProps {
  profileUserId: string;
}

export const FriendButton: FC<FriendButtonProps> = ({ profileUserId }) => {
  const { currentUser } = useAuth();
  const {
    data: myFriendships,
    sendRequest,
    removeFriendship,
    acceptRequest,
    isPending,
  } = useFriendships(currentUser?.uid);

  const friendshipStatus = useMemo(() => {
    if (!myFriendships || !profileUserId) {
      return null;
    }
    const friendship = myFriendships.find((f) => f.id === profileUserId);
    if (!friendship) {
      return 'none';
    }
    if (friendship.status === 'accepted') {
      return 'friends';
    }
    if (friendship.status === 'pending' && friendship.direction === 'outgoing') {
      return 'pending_sent';
    }
    if (friendship.status === 'pending' && friendship.direction === 'incoming') {
      return 'pending_received';
    }
  }, [myFriendships, profileUserId]);

  if (!currentUser || currentUser.uid === profileUserId) {
    // Don't render the button on your own profile
    return null;
  }

  switch (friendshipStatus) {
    case 'friends':
      return (
        <Button
          color="red"
          leftSection={<IconUserCancel size={16} />}
          onClick={() => removeFriendship(profileUserId)}
          loading={isPending}
        >
          Remove Buddy
        </Button>
      );
    case 'pending_sent':
      return (
        <Button
          variant="default"
          leftSection={<IconUserExclamation size={16} />}
          onClick={() => removeFriendship(profileUserId)}
          loading={isPending}
        >
          Request Sent
        </Button>
      );
    case 'pending_received':
      return (
        <Group>
          <Button
            color="red"
            variant="outline"
            onClick={() => removeFriendship(profileUserId)}
            loading={isPending}
          >
            Decline
          </Button>
          <Button color="green" onClick={() => acceptRequest(profileUserId)} loading={isPending}>
            Accept
          </Button>
        </Group>
      );
    case 'none':
    default:
      return (
        <Button
          leftSection={<IconUserPlus size={16} />}
          onClick={() => sendRequest(profileUserId)}
          loading={isPending}
        >
          Add Buddy
        </Button>
      );
  }
};
