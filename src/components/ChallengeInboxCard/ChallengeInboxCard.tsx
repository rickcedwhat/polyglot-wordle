import { FC, useMemo, useState } from 'react';
import { IconSwords } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Badge, Button, Group, Modal, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import type { ChallengeInboxItem } from '@/hooks/useChallenges';
import { useGameActions } from '@/hooks/useGameActions';

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
  const navigate = useNavigate();
  const { createNewGame } = useGameActions();
  const [resultOpened, setResultOpened] = useState(false);
  const [rematchBusy, setRematchBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const userId = currentUser?.uid;
  const otherId = useMemo(
    () => challenge.participantIds.find((id) => id !== userId),
    [challenge.participantIds, userId]
  );
  const me = userId ? challenge.participants[userId] : undefined;
  const other = otherId ? challenge.participants[otherId] : undefined;

  const myScore = me?.score;
  const theirScore = other?.score;
  const bothDone =
    myScore !== null && myScore !== undefined && theirScore !== null && theirScore !== undefined;

  const outcomeLabel = (() => {
    if (!bothDone) {
      return null;
    }
    if (myScore === theirScore) {
      return 'Tied';
    }
    return myScore! > theirScore! ? 'You won' : 'You lost';
  })();

  const unread = challenge.status === 'completed' && me && !me.resultSeenAt && bothDone;

  const handlePlay = () => {
    const challengerParam =
      challenge.createdBy !== userId ? `?challenger=${challenge.createdBy}` : '';
    navigate(`/game/${challenge.gameId}${challengerParam}`);
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
    setRematchBusy(true);
    try {
      // Start a fresh game as the challenger, then copy a share link for the opponent.
      await createNewGame();
      // createNewGame navigates away; stash rematch target for the game page to copy link.
      sessionStorage.setItem(
        'polyglot_pending_rematch',
        JSON.stringify({
          opponentId: otherId,
          opponentName: other?.displayName || 'Friend',
        })
      );
    } finally {
      setRematchBusy(false);
    }
  };

  const handleCopyRematchFromResult = async () => {
    if (!currentUser || !challenge.gameId) {
      return;
    }
    // Rematch = new game; from result modal we still offer sharing THIS completed puzzle too.
    const url = `${window.location.origin}/game/${challenge.gameId}?challenger=${currentUser.uid}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Paper withBorder p="sm" radius="md" bg={unread ? 'dark.6' : undefined}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
            <Avatar src={other?.photoURL} radius="xl" color="blue">
              <IconSwords size={16} />
            </Avatar>
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Group gap={6}>
                <Text size="sm" fw={700} truncate>
                  {other?.displayName || 'Opponent'}
                </Text>
                {unread && (
                  <Badge size="xs" color="blue">
                    New
                  </Badge>
                )}
              </Group>
              <Text size="xs" c="dimmed">
                {section === 'waiting' && 'Waiting for them to finish'}
                {section === 'needsYou' && !bothDone && 'Your move — play this challenge'}
                {section === 'needsYou' && bothDone && 'Result ready'}
                {section === 'archive' &&
                  (outcomeLabel ? `${outcomeLabel} · ${myScore} vs ${theirScore}` : 'Challenge')}
              </Text>
            </Stack>
          </Group>

          <Group gap={6} wrap="nowrap">
            {section === 'needsYou' && !bothDone && (
              <Button size="xs" onClick={handlePlay}>
                Play
              </Button>
            )}
            {bothDone && (
              <Button size="xs" variant="light" onClick={handleOpenResult}>
                Showdown
              </Button>
            )}
            {bothDone && (
              <Button size="xs" variant="subtle" loading={rematchBusy} onClick={handleRematch}>
                Rematch
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
              Head-to-Head Showdown
            </Text>
          </Group>
        }
        centered
      >
        <Stack gap="md">
          {outcomeLabel && (
            <Badge
              size="lg"
              color={
                outcomeLabel === 'You won' ? 'teal' : outcomeLabel === 'You lost' ? 'red' : 'yellow'
              }
            >
              {outcomeLabel}
            </Badge>
          )}
          <SimpleGrid cols={2} spacing="xs">
            <Paper p="xs" radius="sm" withBorder bg="dark.7">
              <Text size="xs" c="dimmed">
                You
              </Text>
              <Text size="sm" fw={800}>
                {myScore ?? '—'} pts
              </Text>
            </Paper>
            <Paper p="xs" radius="sm" withBorder bg="dark.7">
              <Text size="xs" c="dimmed">
                {other?.displayName || 'Opponent'}
              </Text>
              <Text size="sm" fw={800}>
                {theirScore ?? '—'} pts
              </Text>
            </Paper>
          </SimpleGrid>
          <Group justify="flex-end" gap="xs">
            <Button size="xs" variant="light" onClick={handleCopyRematchFromResult}>
              {copied ? 'Link copied' : 'Copy challenge link'}
            </Button>
            <Button size="xs" loading={rematchBusy} onClick={handleRematch}>
              Rematch
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
};
