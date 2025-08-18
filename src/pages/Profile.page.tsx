import { FC } from 'react';
import { IconBellRinging, IconPinned, IconUsers } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import { Center, Container, Loader, SimpleGrid, Tabs, Text, Title } from '@mantine/core';
import { GameHistoryCard } from '@/components/GameHistoryCard/GameHistoryCard';
import { useAuth } from '@/context/AuthContext';
import { usePinnedGames } from '@/hooks/usePinnedGames';
import { useUserProfile } from '@/hooks/useUserProfile';

export const ProfilePage: FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { data: userProfile, isLoading, isError } = useUserProfile(userId);
  const { currentUser } = useAuth();
  const isOwnProfile = currentUser?.uid === userId;
  const { data: pinnedGames, isLoading: areGamesLoading } = usePinnedGames(
    userId,
    userProfile?.pinnedGames
  );

  if (isLoading) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  if (isError || !userProfile) {
    return (
      <Center h="100%">
        <Text c="red">User profile not found.</Text>
      </Center>
    );
  }

  return (
    <Container size="md" mt="lg">
      <Title order={2}>{userProfile.displayName}'s Profile</Title>
      <Text c="dimmed">Member since {userProfile.joinedAt.toDate().toLocaleDateString()}</Text>

      <Tabs defaultValue="pinned" mt="xl">
        <Tabs.List>
          <Tabs.Tab value="pinned" leftSection={<IconPinned size={14} />}>
            Pinned Games
          </Tabs.Tab>
          <Tabs.Tab value="friends" leftSection={<IconUsers size={14} />}>
            Friends
          </Tabs.Tab>
          <Tabs.Tab value="requests" leftSection={<IconBellRinging size={14} />}>
            Requests
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="pinned" pt="xs">
          {areGamesLoading && (
            <Center mt="xl">
              <Loader />
            </Center>
          )}

          {!areGamesLoading && (!pinnedGames || pinnedGames.length === 0) && (
            <Text c="dimmed" mt="md">
              This user hasn't pinned any games yet.
            </Text>
          )}

          {!areGamesLoading && pinnedGames && pinnedGames.length > 0 && (
            <SimpleGrid cols={{ base: 1, xs: 2 }} mt="md">
              {pinnedGames.map((game) => (
                <GameHistoryCard
                  key={game.id}
                  game={game}
                  userProfile={userProfile}
                  isOwnProfile={isOwnProfile}
                />
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        <Tabs.Panel value="friends" pt="xs">
          Friends list will go here.
        </Tabs.Panel>

        <Tabs.Panel value="requests" pt="xs">
          Friend and challenge requests will go here.
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};
