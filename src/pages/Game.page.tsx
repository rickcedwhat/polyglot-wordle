import { FC } from 'react';
import { Center, Loader, Text } from '@mantine/core';
import { Game } from '@/components/Game/Game';
import { PostGameView } from '@/components/PostGameView/PostGameView';
import { useGameSession } from '@/hooks/useGameSession';

export const GamePage: FC = () => {
  const { data: gameSession, isLoading, isError, updateGuessHistory, endGame } = useGameSession();

  if (isLoading || !gameSession) {
    return (
      <Center style={{ height: '80vh' }}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center>
        <Text c="red">Error loading game session.</Text>
      </Center>
    );
  }

  if (gameSession.isLiveGame) {
    return (
      <Game gameSession={gameSession} updateGuessHistory={updateGuessHistory} endGame={endGame} />
    );
  }

  return <PostGameView gameSession={gameSession} />;
};
