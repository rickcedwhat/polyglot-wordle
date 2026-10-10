import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Center, Loader, Stack, Tabs } from '@mantine/core';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { GameDoc } from '@/types/firestore';
import { LeaderboardCard } from '../LeaderboardCard/LeaderboardCard';

interface LeaderboardListProps {
  games: GameDoc[] | undefined;
  isLoading?: boolean;
  onGameSelect: (game: GameDoc) => void;
  selectedUserId: string;
}

/** The Friends tab and its ranked games, without any data fetching. */
export const LeaderboardList: FC<LeaderboardListProps> = ({
  games,
  isLoading = false,
  onGameSelect,
  selectedUserId,
}) => {
  const { t } = useTranslation();
  return (
    <Tabs defaultValue="friends" mt="lg">
      <Tabs.List grow>
        <Tabs.Tab value="friends">{t('leaderboard.friends')}</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="friends" pt="xs">
        {isLoading ? (
          <Center mt="md">
            <Loader />
          </Center>
        ) : (
          <Stack mt="md">
            {games?.map((game, index) => (
              <LeaderboardCard
                key={game.userId}
                game={game}
                rank={index + 1}
                onClick={() => onGameSelect(game)}
                isSelected={game.userId === selectedUserId}
              />
            ))}
          </Stack>
        )}
      </Tabs.Panel>
    </Tabs>
  );
};

interface LeaderboardProps {
  gameId: string;
  onGameSelect: (game: GameDoc) => void;
  selectedUserId: string;
}

export const Leaderboard: FC<LeaderboardProps> = ({ gameId, onGameSelect, selectedUserId }) => {
  const { friendsQuery } = useLeaderboard(gameId);

  return (
    <LeaderboardList
      games={friendsQuery.data}
      isLoading={friendsQuery.isLoading}
      onGameSelect={onGameSelect}
      selectedUserId={selectedUserId}
    />
  );
};
