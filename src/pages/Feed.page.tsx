import { useTranslation } from 'react-i18next';
import { Button, Center, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { FeedCard } from '@/components/FeedCard/FeedCard';
import { useActivityFeed } from '@/hooks/useActivityFeed';

export const FeedPage = () => {
  const { t } = useTranslation();
  const feed = useActivityFeed();
  const games = feed.data?.pages.flatMap((page) => page.games) ?? [];
  return (
    <Container size="sm" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>{t('feed.title')}</Title>
          <Text c="dimmed">{t('feed.subtitle')}</Text>
        </div>
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
              onClick={() => (feed.isFetchNextPageError ? feed.fetchNextPage() : feed.refetch())}
            >
              {t('common.tryAgain')}
            </Button>
          </Stack>
        )}
        {!feed.isPending && !feed.isError && games.length === 0 && (
          <Text c="dimmed">{t('feed.empty')}</Text>
        )}
        {games.map((game) => (
          <FeedCard key={game.id} game={game} />
        ))}
        {feed.hasNextPage && (
          <Button
            variant="light"
            onClick={() => feed.fetchNextPage()}
            loading={feed.isFetchingNextPage}
          >
            {t('history.loadMore')}
          </Button>
        )}
      </Stack>
    </Container>
  );
};
