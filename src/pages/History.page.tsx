import { FC } from 'react';
import { Center, Container, Loader, SimpleGrid, Text, Title } from '@mantine/core';
import { GameHistoryCard } from '@/components/GameHistoryCard/GameHistoryCard';
import { useAuth } from '@/context/AuthContext';
import { useGameHistory } from '@/hooks/useGameHistory';
import { useUserProfile } from '@/hooks/useUserProfile';

export const HistoryPage: FC = () => {
  const { data: games, isLoading, isError } = useGameHistory();
  const { currentUser } = useAuth();
  const { data: userProfile } = useUserProfile(currentUser?.uid);

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
          <GameHistoryCard key={game.id} game={game} userProfile={userProfile} isOwnProfile />
        ))}
      </SimpleGrid>
    </Container>
  );
};
