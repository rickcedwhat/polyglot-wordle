import { FC, useMemo } from 'react';
import { IconUserCancel, IconUserExclamation, IconUserPlus } from '@tabler/icons-react';
import { Button, Group, Text } from '@mantine/core';
import { useModals } from '@mantine/modals';
import { useAuth } from '@/context/AuthContext';
import { useFriendships } from '@/hooks/useFriendships';
import { useUserProfile } from '@/hooks/useUserProfile';

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

  // We need the other user's profile to show their name in the modal
  const { data: userProfile } = useUserProfile(profileUserId);
  const modals = useModals();

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

  const openConfirmationModal = (
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void
  ) => {
    modals.openConfirmModal({
      title,
      centered: true,
      children: <Text size="sm">{message}</Text>,
      labels: { confirm: confirmLabel, cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm,
    });
  };

  if (!currentUser || currentUser.uid === profileUserId) {
    return null;
  }

  const displayName = userProfile?.displayName ?? 'this user';

  switch (friendshipStatus) {
    case 'friends':
      return (
        <Button
          color="red"
          leftSection={<IconUserCancel size={16} />}
          onClick={() =>
            openConfirmationModal(
              'Remove Buddy',
              `Are you sure you want to remove ${displayName} as your buddy?`,
              'Remove',
              () => removeFriendship(profileUserId)
            )
          }
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
          onClick={() =>
            openConfirmationModal(
              'Cancel Friend Request',
              `Are you sure you want to cancel your friend request to ${displayName}?`,
              'Cancel Request',
              () => removeFriendship(profileUserId)
            )
          }
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
            onClick={() =>
              openConfirmationModal(
                'Decline Friend Request',
                `Are you sure you want to decline the friend request from ${displayName}?`,
                'Decline',
                () => removeFriendship(profileUserId)
              )
            }
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
