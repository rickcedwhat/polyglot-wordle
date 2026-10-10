import { FC } from 'react';
import { IconUserCancel, IconUserExclamation, IconUserPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { getFriendshipStatus, sendRequest, removeFriendship, acceptRequest, isPending } =
    useFriendships(currentUser?.uid);

  // We need the other user's profile to show their name in the modal
  const { data: userProfile } = useUserProfile(profileUserId);
  const modals = useModals();

  const friendshipStatus = getFriendshipStatus(profileUserId);

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
      labels: { confirm: confirmLabel, cancel: t('friends.cancel') },
      confirmProps: { color: 'red' },
      onConfirm,
    });
  };

  if (!currentUser || currentUser.uid === profileUserId) {
    return null;
  }

  const name = userProfile?.displayName ?? t('friends.thisUser');

  switch (friendshipStatus) {
    case 'friends':
      return (
        <Button
          color="red"
          leftSection={<IconUserCancel size={16} />}
          onClick={() =>
            openConfirmationModal(
              t('friends.remove'),
              t('friends.removeText', { name }),
              t('friends.removeConfirm'),
              () => removeFriendship(profileUserId)
            )
          }
          loading={isPending}
        >
          {t('friends.remove')}
        </Button>
      );
    case 'pending_sent':
      return (
        <Button
          variant="default"
          leftSection={<IconUserExclamation size={16} />}
          onClick={() =>
            openConfirmationModal(
              t('friends.cancelTitle'),
              t('friends.cancelText', { name }),
              t('friends.cancelRequest'),
              () => removeFriendship(profileUserId)
            )
          }
          loading={isPending}
        >
          {t('friends.requestSent')}
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
                t('friends.declineTitle'),
                t('friends.declineText', { name }),
                t('friends.decline'),
                () => removeFriendship(profileUserId)
              )
            }
            loading={isPending}
          >
            {t('friends.decline')}
          </Button>
          <Button color="green" onClick={() => acceptRequest(profileUserId)} loading={isPending}>
            {t('friends.accept')}
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
          {t('friends.add')}
        </Button>
      );
  }
};
