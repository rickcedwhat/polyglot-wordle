import { useId, useState, type ReactNode } from 'react';
import { IconAward, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { ActionIcon, Box, Group, Paper, Stack, Text, ThemeIcon } from '@mantine/core';
import { CERTIFICATION_LEVELS, FEATS, FIRST_TRY_FEATS } from '@/achievements/config';
import { GameHistoryCard } from '@/components/GameHistoryCard/GameHistoryCard';
import { ProfileLink } from '@/components/ProfileLink/ProfileLink';
import { UserAvatar } from '@/components/UserAvatar/UserAvatar';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { FeedGame, ReactionTarget, TimelineEntry } from '@/utils/activityTimeline';
import { labelFor } from '@/utils/languages';
import { ActivityReactions } from './ActivityReactions';
import classes from './ActivityTimeline.module.css';

type RenderReactions = (target: ReactionTarget) => ReactNode;
const reactions = (target: ReactionTarget) => <ActivityReactions target={target} />;
const GameDetails = ({
  game,
  renderReactions,
}: {
  game: FeedGame;
  renderReactions: RenderReactions;
}) => {
  const { data: profile } = useUserProfile(game.userId);
  return (
    <Box mt="md">
      <GameHistoryCard game={game} userProfile={profile} />
      {renderReactions({ kind: 'game', sourceId: game.id, ownerId: game.userId })}
    </Box>
  );
};
const GameRow = ({
  game,
  renderReactions,
  initialOpen = false,
}: {
  initialOpen?: boolean;
  game: FeedGame;
  renderReactions: RenderReactions;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(initialOpen);
  const id = useId();
  return (
    <div className={classes.gameRow}>
      <button
        type="button"
        className={classes.gameToggle}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <Stack gap={2} className={classes.content}>
          <Text size="sm" fw={550}>
            {game.isWin
              ? t('activity.solved', { count: game.guessHistory.length })
              : t('activity.finished')}
          </Text>
          <Text size="xs" c="dimmed">
            {game.shuffledLanguages.map(labelFor).join(' · ')}
          </Text>
        </Stack>
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" c="dimmed" className={classes.score}>
            {t('postGame.pts', { score: game.score ?? 0 })}
          </Text>
          {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        </Group>
      </button>
      <div id={id} hidden={!open}>
        {open && <GameDetails game={game} renderReactions={renderReactions} />}
      </div>
    </div>
  );
};
const ActivityCard = ({
  entry,
  renderReactions,
  initiallyExpanded,
}: {
  initiallyExpanded?: 'groups' | 'details';
  entry: TimelineEntry;
  renderReactions: RenderReactions;
}) => {
  const { t, i18n } = useTranslation();
  const { data: profile } = useUserProfile(entry.userId);
  const [open, setOpen] = useState(Boolean(initiallyExpanded));
  const id = useId();
  const name = profile?.displayName || t('challenges.opponent');
  const multiple = entry.type === 'games' && entry.games.length > 1;
  const game = entry.type === 'games' ? entry.games[0] : 'game' in entry ? entry.game : null;
  const target: ReactionTarget = {
    kind: entry.type === 'games' ? 'game' : entry.type,
    sourceId: entry.type === 'certification' ? entry.certification.id : game!.id,
    ownerId: entry.userId,
  };
  const summary =
    entry.type === 'games'
      ? t('activity.playedGames', { count: entry.games.length })
      : entry.type === 'feat'
        ? t('activity.earnedFeat', { feat: entry.feat ? FEATS[entry.feat.id].name : '' })
        : entry.type === 'streak'
          ? t('activity.streak', { count: entry.game.activity?.streak ?? 0 })
          : t(`activity.${entry.type}`);
  const date = new Date(entry.at);
  return (
    <Paper
      component="article"
      aria-label={`${name} ${summary}`}
      withBorder
      radius="md"
      p="md"
      className={entry.type === 'certification' ? classes.milestone : undefined}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <ProfileLink userId={entry.userId}>
          <UserAvatar name={name} src={profile?.photoURL} size={34} />
        </ProfileLink>
        <Box className={classes.content}>
          <Text size="sm">
            <ProfileLink userId={entry.userId}>
              <Text span inherit fw={650}>
                {name}
              </Text>
            </ProfileLink>{' '}
            {summary}
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
          {entry.type === 'certification' && (
            <Group mt="sm" gap="sm" wrap="nowrap">
              <ThemeIcon size={42} color="violet" variant="light" radius="md">
                <IconAward size={25} />
              </ThemeIcon>
              <div>
                <Text fw={700} size="lg">
                  {labelFor(entry.certification.lang)}{' '}
                  <Text span inherit c="violet">
                    {CERTIFICATION_LEVELS[entry.certification.level]?.label}
                  </Text>
                </Text>
                <Text size="xs" c="dimmed">
                  {t('activity.words', {
                    count: entry.certification.wordCount,
                    language: labelFor(entry.certification.lang),
                  })}
                </Text>
              </div>
            </Group>
          )}
          {multiple && (
            <Text size="xs" c="dimmed" mt={4}>
              {t('activity.results', {
                wins: entry.games.filter((item) => item.isWin).length,
                losses: entry.games.filter((item) => !item.isWin).length,
              })}
            </Text>
          )}
          {entry.type === 'personalBest' && (
            <Text size="lg" fw={700} mt={5}>
              {t('postGame.pts', { score: game?.score ?? 0 })}
            </Text>
          )}
          {entry.type === 'feat' && entry.feat && (
            <Text size="sm" c="dimmed" mt={5}>
              {entry.feat.lang && FIRST_TRY_FEATS[entry.feat.lang] === entry.feat.id
                ? t('activity.firstTry', { language: labelFor(entry.feat.lang) })
                : FEATS[entry.feat.id].detail(entry.feat)}
            </Text>
          )}
          {entry.type === 'games' && !multiple && (
            <Text size="sm" c="dimmed" mt={5}>
              {game?.isWin
                ? t('activity.solved', { count: game.guessHistory.length })
                : t('activity.finished')}{' '}
              · {t('postGame.pts', { score: game?.score ?? 0 })}
            </Text>
          )}
          {!multiple && renderReactions(target)}
        </Box>
        {game && (
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label={multiple ? t('activity.showGames') : t('activity.showGame')}
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(!open)}
          >
            {open ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
          </ActionIcon>
        )}
      </Group>
      {game && (
        <div id={id} hidden={!open}>
          {open &&
            (multiple ? (
              <div className={classes.gameList}>
                {entry.games.map((item, index) => (
                  <GameRow
                    key={item.id}
                    game={item}
                    renderReactions={renderReactions}
                    initialOpen={initiallyExpanded === 'details' && index === 0}
                  />
                ))}
              </div>
            ) : (
              <Box mt="md">
                <GameHistoryCard game={game} userProfile={profile} />
                {entry.type !== 'games' &&
                  renderReactions({ kind: 'game', sourceId: game.id, ownerId: game.userId })}
              </Box>
            ))}
        </div>
      )}
    </Paper>
  );
};
export const ActivityTimeline = ({
  entries,
  renderReactions = reactions,
  initiallyExpanded,
}: {
  initiallyExpanded?: 'groups' | 'details';
  entries: TimelineEntry[];
  renderReactions?: RenderReactions;
}) => (
  <Stack gap="sm">
    {entries.map((entry) => (
      <ActivityCard
        key={entry.id}
        entry={entry}
        renderReactions={renderReactions}
        initiallyExpanded={initiallyExpanded}
      />
    ))}
  </Stack>
);
