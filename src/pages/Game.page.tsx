import { FC } from 'react';
import { useParams } from 'react-router-dom';
import { Center, Loader, Text } from '@mantine/core';
import { Game } from '@/components/Game/Game';
import { useGameSession } from '@/hooks/useGameSession';

// A simple helper to validate the UUID format
const isValidUuid = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{32}$/i;
  return uuidRegex.test(uuid);
};

export const GamePage: FC = () => {
  const { uuid } = useParams<{ uuid: string }>();

  console.log('[Game.page] Page rendered. UUID from URL:', uuid);

  // Validate the UUID from the URL
  if (!uuid || !isValidUuid(uuid)) {
    return (
      <Center>
        <Text c="red">Invalid Game ID</Text>
      </Center>
    );
  }

  const { data: gameSession, isLoading, isError } = useGameSession(uuid);

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
  return <Game gameSession={gameSession} />;
};
