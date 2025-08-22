import { FC } from 'react';
import { IconBellRinging, IconPinned, IconUsers } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import { Center, Container, Loader, SimpleGrid, Tabs, Text, Title } from '@mantine/core';
import { FriendButton } from '@/components/FriendButton/FriendButton';
import { FriendListTab } from '@/components/FriendsListTab/FriendsListTab';
import { GameHistoryCard } from '@/components/GameHistoryCard/GameHistoryCard';
import { StatsTab } from '@/components/StatsTab/StatsTab';
import { useAuth } from '@/context/AuthContext';
import { usePinnedGames } from '@/hooks/usePinnedGames';
import { useUserProfile } from '@/hooks/useUserProfile';

export const ProfilePage: FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { data: userProfile, isLoading: isProfileLoading, isError } = useUserProfile(userId);
  const { currentUser } = useAuth();

  const isOwnProfile = currentUser?.uid === userId;
  const { data: pinnedGames, isLoading: areGamesLoading } = usePinnedGames(
    userId,
    userProfile?.pinnedGames
  );

  if (isProfileLoading) {
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
      <Title order={2} style={{ textTransform: 'capitalize' }}>
        {userProfile.displayName}
      </Title>
      <Text c="dimmed">Member since {userProfile.joinedAt.toDate().toLocaleDateString()}</Text>
      <FriendButton profileUserId={userId!} />

      <Tabs defaultValue="pinned" mt="xl">
        <Tabs.List>
          <Tabs.Tab value="pinned" leftSection={<IconPinned size={14} />}>
            Pinned Games
          </Tabs.Tab>
          <Tabs.Tab value="stats" leftSection={<IconBellRinging size={14} />}>
            Stats
          </Tabs.Tab>
          <Tabs.Tab value="friends" leftSection={<IconUsers size={14} />}>
            Friends
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
          <FriendListTab profileUserId={userId!} />
        </Tabs.Panel>

        <Tabs.Panel value="stats" pt="xs">
          <StatsTab profileUserId={userId!} />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
};
