import { FC } from 'react';
import { Button, Center, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useGameHistory } from '@/hooks/useGameHistory';
import { usePinnedGames } from '@/hooks/usePinnedGames';
import type { UserDoc } from '@/types/firestore';
import { GameHistoryCard } from '../GameHistoryCard/GameHistoryCard';

interface GameHistoryTabProps {
  profileUserId: string;
  userProfile: UserDoc;
  isOwnProfile: boolean;
}

export const GameHistoryTab: FC<GameHistoryTabProps> = ({
  profileUserId,
  userProfile,
  isOwnProfile,
}) => {
  const { data: pinnedGames, isLoading: arePinsLoading } = usePinnedGames(
    profileUserId,
    userProfile.pinnedGames
  );

  const {
    data: historyPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isHistoryLoading,
  } = useGameHistory(profileUserId);

  const isLoading = arePinsLoading || isHistoryLoading;

  if (isLoading) {
    return (
      <Center mt="xl">
        <Loader />
      </Center>
    );
  }

  const pinnedGameIds = new Set(pinnedGames?.map((g) => g.gameId));

  const allGames = historyPages?.pages.flatMap((page) => page.games) || [];
  const nonPinnedGames = allGames.filter((game) => !pinnedGameIds.has(game.gameId));

  return (
    <Stack mt="md">
      {/* Pinned Games Section */}
      <Title order={4}>Pinned Games</Title>
      {pinnedGames && pinnedGames.length > 0 ? (
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          {pinnedGames.map((game) => (
            <GameHistoryCard
              key={game.id}
              game={game}
              userProfile={userProfile}
              isOwnProfile={isOwnProfile}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Text c="dimmed" size="sm">
          No games have been pinned.
        </Text>
      )}

      {/* Game History Section */}
      <Title order={4} mt="xl">
        Recent Games
      </Title>
      {nonPinnedGames.length > 0 ? (
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          {nonPinnedGames.map((game) => (
            <GameHistoryCard
              key={game.id}
              game={game}
              userProfile={userProfile}
              isOwnProfile={isOwnProfile}
            />
          ))}
        </SimpleGrid>
      ) : (
        <Text c="dimmed" size="sm">
          No recent game history found.
        </Text>
      )}

      {hasNextPage && (
        <Center mt="xl">
          <Button onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
            Load More
          </Button>
        </Center>
      )}
    </Stack>
  );
};
