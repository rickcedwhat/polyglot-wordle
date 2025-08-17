import { FC } from 'react';
import { IconBellRinging, IconPinned, IconUsers } from '@tabler/icons-react';
import { useParams } from 'react-router-dom';
import { Center, Container, Loader, Tabs, Text, Title } from '@mantine/core';
import { useUserProfile } from '@/hooks/useUserProfile';

export const ProfilePage: FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { data: userProfile, isLoading, isError } = useUserProfile(userId);

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
          {/* We'll add the user's 5 pinned games here next. */}
          Pinned games content will go here.
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
