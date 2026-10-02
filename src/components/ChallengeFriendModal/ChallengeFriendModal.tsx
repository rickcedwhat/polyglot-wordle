import { FC, useEffect, useState } from 'react';
import { IconSwords } from '@tabler/icons-react';
import {
  Avatar,
  Center,
  Group,
  Loader,
  Modal,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { LanguagePickerModal } from '@/components/LanguagePickerModal/LanguagePickerModal';
import { useAuth } from '@/context/AuthContext';
import {
  friendChallengeErrorMessage,
  useFriendChallenge,
  type ChallengeFriend,
} from '@/hooks/useFriendChallenge';
import { useFriendships } from '@/hooks/useFriendships';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { GameDoc, LanguageCombo } from '@/types/firestore';
import { showToast } from '@/utils/toast';

interface ChallengeFriendModalProps {
  opened: boolean;
  onClose: () => void;
  /** Challenge on this finished game; omit to start a new game (asks for languages). */
  game?: GameDoc;
  /** Skip the friend picker (e.g. from a friend's profile or a rematch). */
  friend?: ChallengeFriend;
  /** Friends who can't be picked (e.g. the person whose challenge you just played). */
  excludeIds?: string[];
}

export const ChallengeFriendModal: FC<ChallengeFriendModalProps> = ({
  opened,
  onClose,
  game,
  friend: fixedFriend,
  excludeIds = [],
}) => {
  const { challengeOnGame, challengeNewGame } = useFriendChallenge();
  const [picked, setPicked] = useState<ChallengeFriend | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setPicked(null);
      setError(null);
      setBusyId(null);
    }
  }, [opened]);

  const target = fixedFriend ?? picked;

  const sent = (friend: ChallengeFriend) => {
    showToast(
      { message: `Challenge sent to ${friend.displayName}`, color: 'teal' },
      { immediate: true }
    );
    onClose();
  };

  const handlePick = async (friend: ChallengeFriend) => {
    setError(null);
    if (!game) {
      setPicked(friend);
      return;
    }
    setBusyId(friend.id);
    try {
      await challengeOnGame(friend, game);
      sent(friend);
    } catch (err) {
      setError(friendChallengeErrorMessage(err, friend.displayName));
    } finally {
      setBusyId(null);
    }
  };

  const handleLanguages = async (languages: LanguageCombo) => {
    if (!target) {
      return;
    }
    setBusyId(target.id);
    setError(null);
    try {
      await challengeNewGame(target, languages);
      sent(target);
    } catch (err) {
      setError(friendChallengeErrorMessage(err, target.displayName));
    } finally {
      setBusyId(null);
    }
  };

  const choosingLanguages = opened && !game && !!target;

  return (
    <>
      <Modal
        opened={opened && !choosingLanguages}
        onClose={onClose}
        centered
        title={
          <Group gap={6}>
            <IconSwords size={16} />
            <Text fw={700}>{game ? 'Challenge a friend on this game' : 'Challenge a friend'}</Text>
          </Group>
        }
      >
        <FriendPicker
          busyId={busyId}
          excludeIds={excludeIds}
          onPick={handlePick}
          hint={
            game
              ? 'They play the exact same boards. You both see the result when they finish.'
              : "You'll both play a brand-new game."
          }
        />
        {error && (
          <Text size="sm" c="red" mt="sm" role="alert">
            {error}
          </Text>
        )}
      </Modal>

      <LanguagePickerModal
        opened={choosingLanguages}
        onClose={() => (fixedFriend ? onClose() : setPicked(null))}
        saveToPrefs={false}
        title={target ? `Challenge ${target.displayName}: choose languages` : 'Choose languages'}
        confirmLabel="Send challenge & play"
        loading={!!busyId}
        error={error}
        onConfirm={handleLanguages}
      />
    </>
  );
};

const FriendPicker: FC<{
  busyId: string | null;
  excludeIds: string[];
  hint: string;
  onPick: (friend: ChallengeFriend) => void;
}> = ({ busyId, excludeIds, hint, onPick }) => {
  const { currentUser } = useAuth();
  const { data: friendships, isLoading } = useFriendships(currentUser?.uid);
  const friendIds = (friendships ?? [])
    .filter((f) => f.status === 'accepted' && !excludeIds.includes(f.id))
    .map((f) => f.id);

  if (isLoading) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }

  if (friendIds.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No friends to challenge yet. Add friends from their profile, or use Share to send a link.
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      <Text size="sm" c="dimmed">
        {hint}
      </Text>
      {friendIds.map((id) => (
        <FriendRow
          key={id}
          friendId={id}
          busy={busyId === id}
          disabled={!!busyId}
          onPick={onPick}
        />
      ))}
    </Stack>
  );
};

const FriendRow: FC<{
  friendId: string;
  busy: boolean;
  disabled: boolean;
  onPick: (friend: ChallengeFriend) => void;
}> = ({ friendId, busy, disabled, onPick }) => {
  const { data: profile, isLoading } = useUserProfile(friendId);

  if (isLoading) {
    return <Skeleton height={44} radius="md" />;
  }
  if (!profile) {
    return null;
  }

  return (
    <UnstyledButton
      disabled={disabled}
      onClick={() =>
        onPick({ id: friendId, displayName: profile.displayName, photoURL: profile.photoURL })
      }
      style={{
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 8,
        padding: '8px 12px',
        opacity: disabled && !busy ? 0.5 : 1,
      }}
    >
      <Group justify="space-between">
        <Group gap="sm">
          <Avatar src={profile.photoURL} radius="xl" size="sm" />
          <Text size="sm" fw={600}>
            {profile.displayName}
          </Text>
        </Group>
        {busy ? <Loader size="xs" /> : <IconSwords size={16} />}
      </Group>
    </UnstyledButton>
  );
};
