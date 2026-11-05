import { useId, useState, type ReactNode } from 'react';
import { IconChevronDown, IconChevronRight, IconLock, IconUsers } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
} from '@mantine/core';
import { GameHistoryCard } from '@/components/GameHistoryCard/GameHistoryCard';
import { ProfileLink } from '@/components/ProfileLink/ProfileLink';
import { UserAvatar } from '@/components/UserAvatar/UserAvatar';
import { useAuth } from '@/context/AuthContext';
import { usePlayedGame } from '@/hooks/usePlayedGame';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { FeedGame, ReactionTarget } from '@/utils/activityTimeline';
import { gamePath, labelFor, languagesFromGame } from '@/utils/languages';
import { puzzleIdentity, type SharedPuzzleEntry } from '@/utils/sharedPuzzleFeed';
import classes from './ActivityTimeline.module.css';

const PlayerResult = ({
  game,
  reveal,
  rank,
  renderReactions,
}: {
  game: FeedGame;
  reveal: boolean;
  rank: number | null;
  renderReactions: (target: ReactionTarget) => ReactNode;
}) => {
  const { data: profile } = useUserProfile(game.userId);
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const id = useId();
  const name = profile?.displayName || t('postGame.player');
  return (
    <div className={classes.puzzlePlayer}>
      <Group gap="sm" wrap="nowrap">
        {reveal && (
          <Text size="sm" c="dimmed" w={20} style={{ flexShrink: 0 }}>
            {rank ?? '—'}
          </Text>
        )}
        <Box className={classes.content}>
          <ProfileLink userId={game.userId}>
            <Group gap="xs" wrap="nowrap">
              <Box style={{ flexShrink: 0 }}>
                <UserAvatar name={name} src={profile?.photoURL} size={28} />
              </Box>
              <Text size="sm" fw={550} miw={0} style={{ overflowWrap: 'anywhere' }}>
                {name}
              </Text>
            </Group>
          </ProfileLink>
        </Box>
        {currentUser?.uid === game.userId && (
          <Badge size="xs" variant="light" style={{ flexShrink: 0 }}>
            {t('postGame.you')}
          </Badge>
        )}
        {reveal && (
          <Text size="sm" fw={600} className={classes.score} style={{ flexShrink: 0 }}>
            {game.score == null ? '—' : t('postGame.pts', { score: game.score })}
          </Text>
        )}
        {reveal && (
          <ActionIcon
            variant="subtle"
            color="gray"
            style={{ flexShrink: 0 }}
            aria-label={t('activity.shared.details', { name })}
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((old) => !old)}
          >
            {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          </ActionIcon>
        )}
      </Group>
      {reveal && (
        <div id={id} hidden={!open}>
          {open && (
            <Box mt="sm">
              <GameHistoryCard game={game} userProfile={profile} />
              {renderReactions({ kind: 'game', sourceId: game.id, ownerId: game.userId })}
            </Box>
          )}
        </div>
      )}
    </div>
  );
};
export const SharedPuzzleCard = ({
  entry,
  renderReactions,
  initiallyExpanded = false,
}: {
  entry: SharedPuzzleEntry;
  renderReactions: (target: ReactionTarget) => ReactNode;
  initiallyExpanded?: boolean;
}) => {
  const { currentUser } = useAuth();
  const { t, i18n } = useTranslation();
  const reference = entry.games.find((game) => game.userId !== currentUser?.uid) ?? entry.games[0];
  const played = usePlayedGame(reference);
  const referenceIdentity = puzzleIdentity(reference);
  const completedViewerGame = entry.games.find(
    (game) =>
      game.userId === currentUser?.uid &&
      !game.isLiveGame &&
      !!game.completedAt &&
      referenceIdentity !== null &&
      puzzleIdentity(game) === referenceIdentity
  );
  const mine = completedViewerGame ?? played.mine;
  const compatible =
    !!mine && referenceIdentity !== null && puzzleIdentity(mine) === referenceIdentity;
  const reveal = !!mine?.completedAt && !mine.isLiveGame && compatible;
  const [open, setOpen] = useState(initiallyExpanded);
  const id = useId();
  const games = [...entry.games];
  // The viewer's completed game may be outside the public feed's loaded window.
  if (reveal && mine && !games.some((game) => game.userId === currentUser?.uid)) {
    games.push({ ...mine, id: `${mine.userId}_${mine.gameId}` });
  }
  games.sort(
    reveal
      ? (a, b) =>
          (b.score ?? -Infinity) - (a.score ?? -Infinity) || a.userId.localeCompare(b.userId)
      : (a, b) => a.userId.localeCompare(b.userId)
  );
  const date = new Date(entry.at);
  return (
    <Paper
      component="article"
      withBorder
      radius="md"
      p="md"
      aria-label={t('activity.shared.title', { count: games.length })}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <ThemeIcon variant="light" color="blue" radius="xl" size={36}>
          <IconUsers size={21} />
        </ThemeIcon>
        <Box className={classes.content}>
          <Text size="sm" fw={650}>
            {t('activity.shared.title', { count: games.length })}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {reference.shuffledLanguages.map(labelFor).join(' · ')}
          </Text>
          <Text size="xs" c="dimmed" mt={3}>
            <time dateTime={date.toISOString()}>
              {date.toLocaleString(i18n.language, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </time>
          </Text>
        </Box>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={t('activity.shared.expand')}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((old) => !old)}
        >
          {open ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
        </ActionIcon>
      </Group>
      <Group mt="md" gap="sm">
        {played.isError && !completedViewerGame ? (
          <Button variant="light" size="xs" onClick={() => played.refetch()}>
            {t('common.tryAgain')}
          </Button>
        ) : mine && !compatible ? (
          <Text size="sm" c="dimmed">
            {t('activity.shared.differentSetup')}
          </Text>
        ) : reveal ? (
          <Button variant="light" size="xs" onClick={() => setOpen((old) => !old)}>
            {t('activity.shared.results')}
          </Button>
        ) : (
          <Button
            component={Link}
            to={gamePath(reference.gameId, languagesFromGame(reference), {
              challenger: reference.userId,
            })}
            variant="light"
            size="xs"
            loading={played.isPending}
          >
            {t(mine ? 'feed.continue' : 'activity.shared.play')}
          </Button>
        )}
        {!reveal && (
          <Group gap={4} c="dimmed">
            <IconLock size={13} />
            <Text size="xs">{t('activity.shared.locked')}</Text>
          </Group>
        )}
      </Group>
      <div id={id} hidden={!open}>
        {open && (
          <Stack gap={0} mt="md">
            <Text size="xs" c="dimmed" mb="xs">
              {t('activity.shared.recent')}
            </Text>
            {games.map((game) => (
              <PlayerResult
                key={game.userId}
                game={game}
                reveal={reveal}
                rank={
                  typeof game.score === 'number'
                    ? 1 +
                      games.filter(
                        (other) => typeof other.score === 'number' && other.score > game.score!
                      ).length
                    : null
                }
                renderReactions={renderReactions}
              />
            ))}
          </Stack>
        )}
      </div>
    </Paper>
  );
};
