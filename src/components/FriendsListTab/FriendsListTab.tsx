import { FC } from 'react';
import { Center, Loader, SimpleGrid, Text, Title } from '@mantine/core';
import { useFriendships } from '@/hooks/useFriendships';
import { FriendCard } from '../FriendCard/FriendCard';
import { PendingFriendCard } from '../PendingFriendCard/PendingFriendCard';

interface FriendListTabProps {
  profileUserId: string;
}

export const FriendListTab: FC<FriendListTabProps> = ({ profileUserId }) => {
  const { data: friendships, isLoading } = useFriendships(profileUserId);

  if (isLoading) {
    return (
      <Center mt="xl">
        <Loader />
      </Center>
    );
  }

  if (!friendships || friendships.length === 0) {
    return (
      <Text c="dimmed" mt="md">
        This user has no friends yet.
      </Text>
    );
  }

  const acceptedFriends = friendships.filter((f) => f.status === 'accepted');
  const incomingPendingFriends = friendships.filter((f) => f.direction === 'incoming');
  const outgoingPendingFriends = friendships.filter((f) => f.direction === 'outgoing');

  return (
    <>
      {incomingPendingFriends.length > 0 && (
        <Title order={4} mt="md">
          Incoming Friend Requests
        </Title>
      )}
      <SimpleGrid cols={{ base: 1, xs: 2 }} mt="md">
        {incomingPendingFriends.map((friend) => (
          <PendingFriendCard key={friend.id} friendship={friend} friendId={friend.id} />
        ))}
      </SimpleGrid>

      {outgoingPendingFriends.length > 0 && (
        <Title order={4} mt="md">
          Outgoing Friend Requests
        </Title>
      )}
      <SimpleGrid cols={{ base: 1, xs: 2 }} mt="md">
        {outgoingPendingFriends.map((friend) => (
          <PendingFriendCard key={friend.id} friendship={friend} friendId={friend.id} />
        ))}
      </SimpleGrid>

      {acceptedFriends.length > 0 && (
        <Title order={4} mt="md">
          Friends
        </Title>
      )}
      <SimpleGrid cols={{ base: 1, xs: 2 }} mt="md">
        {acceptedFriends.map((friend) => (
          <FriendCard key={friend.id} friendId={friend.id} />
        ))}
      </SimpleGrid>
    </>
  );
};
