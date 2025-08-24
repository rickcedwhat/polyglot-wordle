import { FC } from 'react';
import { Button, Center, Container, Loader, SimpleGrid, Text, Title } from '@mantine/core';
import { GameHistoryCard } from '@/components/GameHistoryCard/GameHistoryCard';
import { useAuth } from '@/context/AuthContext';
import { useGameHistory } from '@/hooks/useGameHistory';
import { useUserProfile } from '@/hooks/useUserProfile';

export const HistoryPage: FC = () => {
  const { currentUser } = useAuth();
  // Fetch user profile to pass to the GameHistoryCard
  const { data: userProfile } = useUserProfile(currentUser?.uid);

  // Destructure the new return values from our infinite query hook
  const {
    data: historyPages,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGameHistory(currentUser?.uid ?? '');

  if (isLoading) {
    return (
      <Center style={{ height: '80vh' }}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center>
        <Text c="red">Error loading game history.</Text>
      </Center>
    );
  }

  // Flatten the array of pages into a single array of games
  const allGames = historyPages?.pages.flatMap((page) => page.games) || [];

  if (allGames.length === 0) {
    return (
      <Center style={{ height: '80vh' }}>
        <Text>You haven't played any games yet.</Text>
      </Center>
    );
  }

  return (
    <Container size="lg" my="md">
      <Title order={2} mb="xl">
        Game History
      </Title>
      <SimpleGrid
        cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
        spacing={{ base: 'md', sm: 'xl' }}
        verticalSpacing={{ base: 'md', sm: 'xl' }}
      >
        {allGames.map((game) => (
          <GameHistoryCard key={game.id} game={game} userProfile={userProfile} isOwnProfile />
        ))}
      </SimpleGrid>

      {/* Add a "Load More" button that shows when there is a next page */}
      {hasNextPage && (
        <Center mt="xl">
          <Button onClick={() => fetchNextPage()} loading={isFetchingNextPage}>
            Load More
          </Button>
        </Center>
      )}
    </Container>
  );
};
