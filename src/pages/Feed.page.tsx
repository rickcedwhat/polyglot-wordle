import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Button, Center, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { ActivityTimeline } from '@/components/ActivityTimeline/ActivityTimeline';
import { NotificationActivity } from '@/components/ReactionNotifications/NotificationActivity';
import { ReactionInboxContainer } from '@/components/ReactionNotifications/ReactionInboxContainer';
import { useActivityTimeline } from '@/hooks/useActivityTimeline';
import { buildTimeline } from '@/utils/activityTimeline';
import { parseNotificationTarget } from '@/utils/reactionNotifications';

export const FeedPage = () => {
  const { t } = useTranslation();
  const feed = useActivityTimeline();
  const [params, setParams] = useSearchParams();
  const target = parseNotificationTarget(params.get('activity'));
  const entries = buildTimeline(feed.data?.pages.flatMap((page) => page.records) ?? []);
  return (
    <Container size={740} py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>{t('feed.title')}</Title>
          <Text c="dimmed">{t('feed.subtitle')}</Text>
        </div>
        {params.has('activity') ? (
          <>
            <Button variant="subtle" onClick={() => setParams({})}>
              {t('activity.notifications.back')}
            </Button>
            {target ? (
              <NotificationActivity target={target} />
            ) : (
              <Text c="dimmed">{t('activity.notifications.unavailable')}</Text>
            )}
          </>
        ) : (
          <>
            <ReactionInboxContainer />
            <Group>
              <Button variant="subtle" onClick={() => feed.refetch()} loading={feed.isRefetching}>
                {t('feed.refresh')}
              </Button>
            </Group>
            {feed.isPending && (
              <Center>
                <Loader />
              </Center>
            )}
            {feed.isError && (
              <Stack gap="xs">
                <Text c="red">{t('feed.loadFailed')}</Text>
                <Button
                  onClick={() =>
                    feed.isFetchNextPageError ? feed.fetchNextPage() : feed.refetch()
                  }
                >
                  {t('common.tryAgain')}
                </Button>
              </Stack>
            )}
            {!feed.isPending && !feed.isError && entries.length === 0 && (
              <Text c="dimmed">{t('feed.empty')}</Text>
            )}
            <ActivityTimeline entries={entries} />
            {feed.hasNextPage && (
              <Button
                variant="light"
                onClick={() => feed.fetchNextPage()}
                loading={feed.isFetchingNextPage}
              >
                {t('history.loadMore')}
              </Button>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
};
