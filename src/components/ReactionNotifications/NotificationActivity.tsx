import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Center, Loader, Stack, Text } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import { notificationSourceOptions } from '@/hooks/useReactionNotices';
import { buildTimeline, type ReactionTarget } from '@/utils/activityTimeline';
import { ActivityTimeline } from '../ActivityTimeline/ActivityTimeline';

/** Fetch the exact source even when it has fallen outside the paginated public feed. */
export const NotificationActivity = ({ target }: { target: Omit<ReactionTarget, 'ownerId'> }) => {
  const source = useQuery(notificationSourceOptions(target));
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  if (source.isPending) {
    return (
      <Center>
        <Loader size="sm" />
      </Center>
    );
  }
  if (source.isError) {
    return (
      <Stack>
        <Text c="red">{t('feed.loadFailed')}</Text>
        <Button onClick={() => source.refetch()}>{t('common.tryAgain')}</Button>
      </Stack>
    );
  }
  const record = source.data;
  const owner = record?.type === 'game' ? record.game.userId : record?.certification.userId;
  const entries =
    record && owner === currentUser?.uid
      ? buildTimeline([record]).filter((entry) =>
          target.kind === 'game' ? entry.type === 'games' : entry.type === target.kind
        )
      : [];
  return entries.length ? (
    <ActivityTimeline
      key={`${target.sourceId}__${target.kind}`}
      entries={entries}
      initiallyExpanded="details"
    />
  ) : (
    <Text c="dimmed">{t('activity.notifications.unavailable')}</Text>
  );
};
