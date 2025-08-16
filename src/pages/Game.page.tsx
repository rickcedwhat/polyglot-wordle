import { FC } from 'react';
import { Center, Loader, Text } from '@mantine/core';
import { Game } from '@/components/Game/Game';
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

  // Now you have the gameSession object, which is either a restored
  // session or a brand new one. You can pass it to your game component.
  // The rendering logic for live vs. completed game will live inside GameComponent.
  return (
    <Game gameSession={gameSession} updateGuessHistory={updateGuessHistory} endGame={endGame} />
  );
};
