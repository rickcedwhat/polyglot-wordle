import { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Card, Group, Skeleton, Text } from '@mantine/core';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ProfileLink } from '../ProfileLink/ProfileLink';

interface FriendCardProps {
  friendId: string;
  /** Action buttons under the name. Without actions the whole card links to the profile. */
  children?: ReactNode;
}

export const FriendCard: FC<FriendCardProps> = ({ friendId, children }) => {
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

  const identity = (
    <Group>
      <Avatar src={friendProfile.photoURL} alt={friendProfile.displayName} radius="xl" />
      <Text fw={500}>{friendProfile.displayName}</Text>
    </Group>
  );

  if (children) {
    return (
      <Card withBorder p="md" radius="md">
        <ProfileLink userId={friendId}>{identity}</ProfileLink>
        {children}
      </Card>
    );
  }

  return (
    <Card component={Link} to={`/profile/${friendId}`} withBorder p="md" radius="md">
      {identity}
    </Card>
  );
};
