import { FC, useEffect, useMemo, useState } from 'react';
import { IconSwords } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import {
  Badge,
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Modal,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { GameSetupModal } from '@/components/GameSetup/GameSetupModal';
import type { GameSetupValue } from '@/components/GameSetup/GameSetupPanel';
import { UserAvatar } from '@/components/UserAvatar/UserAvatar';
import { useAuth } from '@/context/AuthContext';
import { useChallenges } from '@/hooks/useChallenges';
import {
  friendChallengeErrorMessage,
  joinNames,
  useFriendChallenge,
  type ChallengeFriend,
  type FriendChallengeResult,
} from '@/hooks/useFriendChallenge';
import { useFriendships } from '@/hooks/useFriendships';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { GameDoc } from '@/types/firestore';
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
  const { currentUser } = useAuth();
  const { data: profile } = useUserProfile(currentUser?.uid);
  const { challenges } = useChallenges();
  const { challengeOnGame, challengeNewGame } = useFriendChallenge();
  const [selected, setSelected] = useState<ChallengeFriend[]>([]);
  const [choosingSetup, setChoosingSetup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setSelected([]);
      setChoosingSetup(false);
      setError(null);
      setBusy(false);
    }
  }, [opened]);

  const alreadyChallengedIds = useMemo(() => {
    if (!game || !currentUser) {
      return [];
    }
    return challenges
      .filter((c) => c.gameId === game.gameId && c.createdBy === currentUser.uid)
      .flatMap((c) => c.participantIds.filter((id) => id !== currentUser.uid));
  }, [challenges, game, currentUser]);

  const targets = fixedFriend ? [fixedFriend] : selected;

  const toggle = (friend: ChallengeFriend) => {
    setError(null);
    setSelected((prev) =>
      prev.some((f) => f.id === friend.id)
        ? prev.filter((f) => f.id !== friend.id)
        : [...prev, friend]
    );
  };

  const report = ({ sent, failed }: FriendChallengeResult) => {
    if (sent.length > 0) {
      showToast(
        { message: `Challenge sent to ${joinNames(sent)}`, color: 'teal' },
        { immediate: true }
      );
    }
    const failure = failed
      .map(({ friend, error: err }) => friendChallengeErrorMessage(err, friend.displayName))
      .join(' ');
    if (sent.length === 0) {
      setError(failure || null);
      return;
    }
    if (failure) {
      showToast({ message: failure, color: 'red' }, { immediate: true });
    }
    onClose();
  };

  const run = async (action: () => Promise<FriendChallengeResult>) => {
    setBusy(true);
    setError(null);
    try {
      report(await action());
    } catch (err) {
      setError(friendChallengeErrorMessage(err, joinNames(targets)));
    } finally {
      setBusy(false);
    }
  };

  const handleContinue = () => {
    if (game) {
      run(() => challengeOnGame(selected, game));
    } else {
      setChoosingSetup(true);
    }
  };

  const handleSetup = ({ languages, difficulties }: GameSetupValue) =>
    run(() => challengeNewGame(targets, languages, difficulties));

  const showSetup = opened && !game && (!!fixedFriend || choosingSetup);
  const setupTitle =
    targets.length === 1
      ? `Challenge ${targets[0].displayName}`
      : `Challenge ${targets.length} friends`;
  const actionLabel = !game
    ? 'Next: pick the game'
    : selected.length > 1
      ? `Send to ${selected.length} friends`
      : 'Send challenge';

  return (
    <>
      <Modal
        opened={opened && !showSetup}
        onClose={onClose}
        centered
        title={
          <Group gap={6}>
            <IconSwords size={16} />
            <Text fw={700}>{game ? 'Challenge friends on this game' : 'Challenge friends'}</Text>
          </Group>
        }
      >
        <FriendPicker
          gameId={game?.gameId}
          selectedIds={selected.map((f) => f.id)}
          challengedIds={alreadyChallengedIds}
          excludeIds={excludeIds}
          disabled={busy}
          onToggle={toggle}
          hint={
            game
              ? 'They play the exact same boards. You see each result as they finish.'
              : 'Everyone you pick plays the same brand-new game.'
          }
        />
        {error && (
          <Text size="sm" c="red" mt="sm" role="alert">
            {error}
          </Text>
        )}
        <Button
          fullWidth
          mt="md"
          leftSection={<IconSwords size={16} />}
          disabled={selected.length === 0}
          loading={busy}
          onClick={handleContinue}
        >
          {actionLabel}
        </Button>
      </Modal>

      <GameSetupModal
        opened={showSetup}
        onClose={() => (fixedFriend ? onClose() : setChoosingSetup(false))}
        mode="challenge"
        title={targets.length > 0 ? setupTitle : undefined}
        resetKey={profile ? 'loaded' : 'loading'}
        initialLanguages={profile?.languagePrefs?.languages}
        initialDifficulties={profile?.difficultyPrefs}
        loading={busy}
        error={error}
        onSubmit={handleSetup}
      />
    </>
  );
};

const FriendPicker: FC<{
  gameId?: string;
  selectedIds: string[];
  challengedIds: string[];
  excludeIds: string[];
  disabled: boolean;
  hint: string;
  onToggle: (friend: ChallengeFriend) => void;
}> = ({ gameId, selectedIds, challengedIds, excludeIds, disabled, hint, onToggle }) => {
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
          gameId={gameId}
          checked={selectedIds.includes(id)}
          challenged={challengedIds.includes(id)}
          disabled={disabled}
          onToggle={onToggle}
        />
      ))}
    </Stack>
  );
};

/**
 * Whether the friend already has a game doc for `gameId` (rules block challenging them).
 * A failed check reads as "not played"; the send then fails with a message.
 */
const useFriendPlayed = (friendId: string, gameId: string | undefined) =>
  useQuery({
    queryKey: ['friendPlayed', friendId, gameId],
    queryFn: async () => {
      const snap = await getDoc(doc(getFirestore(), 'games', `${friendId}_${gameId}`)).catch(
        () => null
      );
      return !!snap?.exists();
    },
    enabled: !!gameId,
    staleTime: 60_000,
  });

const FriendRow: FC<{
  friendId: string;
  gameId?: string;
  checked: boolean;
  challenged: boolean;
  disabled: boolean;
  onToggle: (friend: ChallengeFriend) => void;
}> = ({ friendId, gameId, checked, challenged, disabled, onToggle }) => {
  const { data: profile, isLoading } = useUserProfile(friendId);
  const { data: played = false } = useFriendPlayed(friendId, gameId);

  if (isLoading) {
    return <Skeleton height={44} radius="md" />;
  }
  if (!profile) {
    return null;
  }

  const unavailableLabel = challenged ? 'Challenged' : played ? 'Played' : null;
  const inactive = disabled || !!unavailableLabel;

  return (
    <UnstyledButton
      disabled={inactive}
      role="checkbox"
      aria-checked={checked}
      onClick={() =>
        onToggle({ id: friendId, displayName: profile.displayName, photoURL: profile.photoURL })
      }
      style={{
        border: `1px solid ${
          checked ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)'
        }`,
        borderRadius: 8,
        padding: '8px 12px',
        opacity: unavailableLabel ? 0.5 : 1,
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <UserAvatar src={profile.photoURL} name={profile.displayName} size="sm" />
          <Text size="sm" fw={600}>
            {profile.displayName}
          </Text>
        </Group>
        {unavailableLabel ? (
          <Badge size="sm" variant="light" color="gray">
            {unavailableLabel}
          </Badge>
        ) : (
          <Checkbox
            checked={checked}
            readOnly
            tabIndex={-1}
            aria-hidden
            styles={{ input: { cursor: 'pointer' } }}
          />
        )}
      </Group>
    </UnstyledButton>
  );
};
