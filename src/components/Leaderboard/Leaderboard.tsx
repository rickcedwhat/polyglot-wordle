import { FC } from 'react';
import { Center, Loader, Stack, Tabs } from '@mantine/core';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { GameDoc } from '@/types/firestore';
import { LeaderboardCard } from '../LeaderboardCard/LeaderboardCard';

interface LeaderboardProps {
  gameId: string;
  onGameSelect: (game: GameDoc) => void;
  selectedUserId: string;
}

export const Leaderboard: FC<LeaderboardProps> = ({ gameId, onGameSelect, selectedUserId }) => {
  // const { globalQuery, friendsQuery } = useLeaderboard(gameId);
  const { friendsQuery } = useLeaderboard(gameId);

  return (
    // Set the default tab to "friends"
    <Tabs defaultValue="friends" mt="lg">
      <Tabs.List grow>
        {/* <Tabs.Tab value="global">Global</Tabs.Tab> */}
        <Tabs.Tab value="friends">Friends</Tabs.Tab>
      </Tabs.List>

      {/* <Tabs.Panel value="global" pt="xs">
        {globalQuery.isLoading ? (
          <Center mt="md">
            <Loader />
          </Center>
        ) : (
          <Stack mt="md">
            {globalQuery.data?.map((game, index) => (
              <LeaderboardCard
                key={game.userId}
                game={game}
                rank={index + 1}
                onClick={() => onGameSelect(game)} // Pass the click handler
                isSelected={game.userId === selectedUserId}
              />
            ))}
          </Stack>
        )}
      </Tabs.Panel> */}

      <Tabs.Panel value="friends" pt="xs">
        {friendsQuery.isLoading ? (
          <Center mt="md">
            <Loader />
          </Center>
        ) : (
          <Stack mt="md">
            {friendsQuery.data?.map((game, index) => (
              <LeaderboardCard
                key={game.userId}
                game={game}
                rank={index + 1}
                onClick={() => onGameSelect(game)} // Pass the click handler
                isSelected={game.userId === selectedUserId}
              />
            ))}
          </Stack>
        )}
      </Tabs.Panel>
    </Tabs>
  );
};
