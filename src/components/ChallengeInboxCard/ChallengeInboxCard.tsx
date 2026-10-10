import { FC, useMemo, useState } from 'react';
import { IconPlayerPlay, IconSwords } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Group, Modal, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { ChallengeFriendModal } from '@/components/ChallengeFriendModal/ChallengeFriendModal';
import { HeadToHeadModal, type HeadToHeadSide } from '@/components/Replay/HeadToHeadModal';
import { UserAvatar } from '@/components/UserAvatar/UserAvatar';
import { useAuth } from '@/context/AuthContext';
import type { ChallengeInboxItem } from '@/hooks/useChallenges';
import { useFriendships } from '@/hooks/useFriendships';
import { useGameActions } from '@/hooks/useGameActions';
import { shareLanguage } from '@/i18n';
import { cancelFriendChallenge } from '@/utils/challengeUtils';
import { gamePath } from '@/utils/languages';
import { ProfileLink } from '../ProfileLink/ProfileLink';

interface ChallengeInboxCardProps {
  challenge: ChallengeInboxItem;
  section: 'needsYou' | 'waiting' | 'archive';
  onMarkSeen: (challengeId: string) => Promise<void>;
}

export const ChallengeInboxCard: FC<ChallengeInboxCardProps> = ({
  challenge,
  section,
  onMarkSeen,
}) => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createNewGame } = useGameActions();
  const [resultOpened, setResultOpened] = useState(false);
  const [rematchBusy, setRematchBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [friendRematchOpened, setFriendRematchOpened] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [duelOpened, setDuelOpened] = useState(false);
  const queryClient = useQueryClient();

  const userId = currentUser?.uid;
  const { getFriendshipStatus } = useFriendships(userId);
  const otherId = useMemo(
    () => challenge.participantIds.find((id) => id !== userId),
    [challenge.participantIds, userId]
  );
  const me = userId ? challenge.participants[userId] : undefined;
  const other = otherId ? challenge.participants[otherId] : undefined;

  const duelSides = useMemo<[HeadToHeadSide, HeadToHeadSide] | null>(
    () =>
      userId && otherId
        ? [
            { userId, name: t('postGame.you'), photoURL: me?.photoURL },
            {
              userId: otherId,
              name: other?.displayName || t('challenges.opponent'),
              photoURL: other?.photoURL,
            },
          ]
        : null,
    [userId, otherId, me?.photoURL, other?.displayName, other?.photoURL, t]
  );

  const myScore = me?.score;
  const theirScore = other?.score;
  const bothDone =
    myScore !== null && myScore !== undefined && theirScore !== null && theirScore !== undefined;

  const outcome = (() => {
    if (!bothDone) {
      return null;
    }
    if (myScore === theirScore) {
      return 'tied';
    }
    return myScore! > theirScore! ? 'won' : 'lost';
  })();
  const outcomeLabel =
    outcome &&
    { tied: t('challenges.tied'), won: t('challenges.youWon'), lost: t('challenges.youLost') }[
      outcome
    ];

  const unread = challenge.status === 'completed' && me && !me.resultSeenAt && bothDone;
  const iAmChallenger = challenge.createdBy === userId;
  const isInvite = challenge.source === 'friend_invite';
  const canCancel = isInvite && iAmChallenger && challenge.status === 'pending';
  const isFriend = !!otherId && getFriendshipStatus(otherId) === 'friends';

  const statusText = (() => {
    if (section === 'archive') {
      return outcomeLabel
        ? t('challenges.archiveStatus', {
            outcome: outcomeLabel,
            mine: myScore,
            theirs: theirScore,
          })
        : t('challenges.challenge');
    }
    if (section === 'waiting') {
      return canCancel ? t('challenges.sentNotStarted') : t('challenges.waitingFinish');
    }
    if (bothDone) {
      return t('challenges.resultReady');
    }
    if (isInvite && iAmChallenger) {
      return t('challenges.youChallenged');
    }
    if (isInvite && me?.rsvp === 'pending') {
      return t('challenges.challengedYou');
    }
    return t('challenges.yourMove');
  })();

  const handleCancel = async () => {
    setCancelBusy(true);
    try {
      await cancelFriendChallenge(challenge.id);
      await queryClient.invalidateQueries({ queryKey: ['challenges', userId] });
    } finally {
      setCancelBusy(false);
    }
  };

  const handlePlay = () => {
    navigate(
      gamePath(challenge.gameId, null, {
        challenger: challenge.createdBy !== userId ? challenge.createdBy : null,
      })
    );
  };

  const handleOpenResult = async () => {
    setResultOpened(true);
    if (unread) {
      await onMarkSeen(challenge.id);
    }
  };

  const handleRematch = async () => {
    if (!otherId || !currentUser) {
      return;
    }
    if (isFriend) {
      setResultOpened(false);
      setFriendRematchOpened(true);
      return;
    }
    setRematchBusy(true);
    try {
      // Stash before navigate so the destination Game mount can copy the link.
      sessionStorage.setItem(
        'polyglot_pending_rematch',
        JSON.stringify({
          opponentId: otherId,
          opponentName: other?.displayName || t('challenges.friend'),
        })
      );
      const gameStarted = await createNewGame();
      if (!gameStarted) {
        sessionStorage.removeItem('polyglot_pending_rematch');
      }
    } finally {
      setRematchBusy(false);
    }
  };

  const handleCopyRematchFromResult = async () => {
    if (!currentUser || !challenge.gameId) {
      return;
    }
    // Rematch = new game; from result modal we still offer sharing THIS completed puzzle too.
    const url = `${window.location.origin}${gamePath(challenge.gameId, null, {
      challenger: currentUser.uid,
      lang: shareLanguage(),
    })}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Paper withBorder p="sm" radius="md" bg={unread ? 'dark.6' : undefined}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <ProfileLink
              userId={otherId}
              aria-label={t('game.challenge.viewProfile', {
                name: other?.displayName || t('challenges.opponent'),
              })}
            >
              <UserAvatar
                src={other?.photoURL}
                name={other?.displayName || t('challenges.opponent')}
              />
            </ProfileLink>
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Group gap={6}>
                <ProfileLink userId={otherId}>
                  <Text size="sm" fw={700} truncate>
                    {other?.displayName || t('challenges.opponent')}
                  </Text>
                </ProfileLink>
                {unread && (
                  <Badge size="xs" color="blue">
                    {t('challenges.new')}
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                {statusText}
              </Text>
            </Stack>
          </Group>

          <Group gap={6} wrap="nowrap">
            {canCancel && (
              <Button
                size="xs"
                variant="subtle"
                color="gray"
                loading={cancelBusy}
                onClick={handleCancel}
              >
                {t('challenges.cancel')}
              </Button>
            )}
            {section === 'needsYou' && !bothDone && (
              <Button size="xs" onClick={handlePlay}>
                {t('challenges.play')}
              </Button>
            )}
            {bothDone && (
              <Button size="xs" variant="light" onClick={handleOpenResult}>
                {t('challenges.showdown')}
              </Button>
            )}
            {bothDone && (
              <Button size="xs" variant="subtle" loading={rematchBusy} onClick={handleRematch}>
                {t('challenges.rematch')}
              </Button>
            )}
          </Group>
        </Group>
      </Paper>

      <Modal
        opened={resultOpened}
        onClose={() => setResultOpened(false)}
        title={
          <Group gap={6}>
            <IconSwords size={16} />
            <Text fw={700} size="sm">
              {t('postGame.showdown')}
            </Text>
          </Group>
        }
        centered
      >
        <Stack gap="md">
          {outcomeLabel && (
            <Badge
              size="lg"
              color={outcome === 'won' ? 'teal' : outcome === 'lost' ? 'red' : 'yellow'}
            >
              {outcomeLabel}
            </Badge>
          )}
          <SimpleGrid cols={2} spacing="xs">
            <Paper p="xs" radius="sm" withBorder bg="dark.7">
              <Text size="xs" c="dimmed">
                {t('postGame.you')}
              </Text>
              <Text size="sm" fw={800}>
                {myScore == null ? '—' : t('postGame.pts', { score: myScore })}
              </Text>
            </Paper>
            <Paper p="xs" radius="sm" withBorder bg="dark.7">
              <ProfileLink userId={otherId}>
                <Text size="xs" c="dimmed">
                  {other?.displayName || t('challenges.opponent')}
                </Text>
              </ProfileLink>
              <Text size="sm" fw={800}>
                {theirScore == null ? '—' : t('postGame.pts', { score: theirScore })}
              </Text>
            </Paper>
          </SimpleGrid>
          {duelSides && (
            <Button
              leftSection={<IconPlayerPlay size={14} />}
              variant="gradient"
              gradient={{ from: 'indigo', to: 'cyan', deg: 45 }}
              onClick={() => {
                setResultOpened(false);
                setDuelOpened(true);
              }}
            >
              {t('postGame.watchReplay')}
            </Button>
          )}
          <Group justify="flex-end" gap="xs">
            <Button size="xs" variant="light" onClick={handleCopyRematchFromResult}>
              {copied ? t('challenges.linkCopied') : t('challenges.copyLink')}
            </Button>
            <Button size="xs" loading={rematchBusy} onClick={handleRematch}>
              {t('challenges.rematch')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {duelSides && challenge.gameId && (
        <HeadToHeadModal
          opened={duelOpened}
          onClose={() => setDuelOpened(false)}
          gameId={challenge.gameId}
          sides={duelSides}
        />
      )}

      {otherId && isFriend && (
        <ChallengeFriendModal
          opened={friendRematchOpened}
          onClose={() => setFriendRematchOpened(false)}
          friend={{
            id: otherId,
            displayName: other?.displayName || t('challenges.friend'),
            photoURL: other?.photoURL || '',
          }}
        />
      )}
    </>
  );
};
