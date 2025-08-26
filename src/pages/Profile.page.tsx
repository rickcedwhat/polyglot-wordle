import { FC } from 'react';
import { IconBooks, IconChartBar, IconUsers } from '@tabler/icons-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Center, Container, Loader, Tabs, Text, Title } from '@mantine/core';
import { FriendButton } from '@/components/FriendButton/FriendButton';
import { FriendListTab } from '@/components/FriendsListTab/FriendsListTab';
import { GameHistoryTab } from '@/components/GameHistoryTab/GameHistoryTab';
import { StatsTab } from '@/components/StatsTab/StatsTab';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';

export const ProfilePage: FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: userProfile, isLoading: isProfileLoading, isError } = useUserProfile(userId);
  const { currentUser } = useAuth();

  const isOwnProfile = currentUser?.uid === userId;

  // Determine active tab from URL hash, default to 'stats'
  const validTabs = ['history', 'stats', 'friends'];
  const activeTabFromUrl = location.hash.slice(1);
  const activeTab = validTabs.includes(activeTabFromUrl) ? activeTabFromUrl : 'history';

  const handleTabChange = (newTab: string | null) => {
    if (newTab) {
      // Update the URL hash without adding to browser history
      navigate(`#${newTab}`, { replace: true });
    }
  };

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
    <Container size="lg" mt="lg">
      <Title order={2} style={{ textTransform: 'capitalize' }}>
        {userProfile.displayName}
      </Title>
      <Text c="dimmed">Member since {userProfile.joinedAt.toDate().toLocaleDateString()}</Text>
      <FriendButton profileUserId={userId!} />

      {/* The Tabs component is now controlled by state derived from the URL */}
      <Tabs value={activeTab} onChange={handleTabChange} mt="xl">
        <Tabs.List grow>
          {' '}
          {/* Add grow to make tabs fill the space */}
          <Tabs.Tab value="history" leftSection={<IconBooks size={16} />}>
            <Text component="span" visibleFrom="xs">
              Game History
            </Text>
          </Tabs.Tab>
          <Tabs.Tab value="stats" leftSection={<IconChartBar size={16} />}>
            <Text component="span" visibleFrom="xs">
              Stats
            </Text>
          </Tabs.Tab>
          <Tabs.Tab value="friends" leftSection={<IconUsers size={16} />}>
            <Text component="span" visibleFrom="xs">
              Friends
            </Text>
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="history" pt="xs">
          <GameHistoryTab
            profileUserId={userId!}
            userProfile={userProfile}
            isOwnProfile={isOwnProfile}
          />
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
