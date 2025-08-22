import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Card, Group, Skeleton, Text } from '@mantine/core';
import { useUserProfile } from '@/hooks/useUserProfile';

interface FriendCardProps {
  friendId: string;
}

export const FriendCard: FC<FriendCardProps> = ({ friendId }) => {
  const { data: friendProfile, isLoading } = useUserProfile(friendId);

  if (isLoading) {
    return (
      <Card withBorder p="md" radius="md">
        <Group>
          <Skeleton height={40} circle />
          <Skeleton height={12} width="70%" />
        </Group>
      </Card>
    );
  }

  if (!friendProfile) {
    return null;
  }

  return (
    <Card component={Link} to={`/profile/${friendId}`} withBorder p="md" radius="md">
      <Group>
        <Avatar src={friendProfile.photoURL} alt={friendProfile.displayName} radius="xl" />
        <Text fw={500}>{friendProfile.displayName}</Text>
      </Group>
    </Card>
  );
};
