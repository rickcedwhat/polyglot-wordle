import { FC } from 'react';
import { Center, Container, Loader, SimpleGrid, Text, Title } from '@mantine/core';
import { GameHistoryCard } from '@/components/GameHistoryCard/GameHistoryCard';
import { useGameHistory } from '@/hooks/useGameHistory';

export const HistoryPage: FC = () => {
  const { data: games, isLoading, isError } = useGameHistory();

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

  if (!games || games.length === 0) {
    return (
      <Center>
        <Text>You haven't played any games yet.</Text>
      </Center>
    );
  }

  return (
    <Container size="lg">
      <Title order={2} mb="xl">
        Game History
      </Title>
      <SimpleGrid
        cols={{ base: 1, sm: 2, md: 3, lg: 4 }}
        spacing={{ base: 'md', sm: 'xl' }}
        verticalSpacing={{ base: 'md', sm: 'xl' }}
      >
        {games.map((game) => (
          <GameHistoryCard key={game.id} game={game} />
        ))}
      </SimpleGrid>
    </Container>
  );
};
