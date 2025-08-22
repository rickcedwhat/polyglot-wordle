import { FC } from 'react';
import { Center, Loader, SimpleGrid, Text } from '@mantine/core';
import { useFriendships } from '@/hooks/useFriendships';
import { FriendCard } from '../FriendCard/FriendCard';

interface FriendListTabProps {
  profileUserId: string;
}

export const FriendListTab: FC<FriendListTabProps> = ({ profileUserId }) => {
  // Use the hook to fetch the friend list for the user whose profile we're viewing
  const { data: friendships, isLoading } = useFriendships(profileUserId);

  if (isLoading) {
    return (
      <Center mt="xl">
        <Loader />
      </Center>
    );
  }

  // Filter for only accepted friends
  const acceptedFriends = friendships?.filter((f) => f.status === 'accepted');

  if (!acceptedFriends || acceptedFriends.length === 0) {
    return (
      <Text c="dimmed" mt="md">
        This user has no friends yet.
      </Text>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, xs: 2 }} mt="md">
      {acceptedFriends.map((friend) => (
        <FriendCard key={friend.id} friendId={friend.id} />
      ))}
    </SimpleGrid>
  );
};
