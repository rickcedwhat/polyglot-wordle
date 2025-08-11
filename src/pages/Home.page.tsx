import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Button, Center, Title } from '@mantine/core';

export function HomePage() {
  const navigate = useNavigate();

  const startNewGame = () => {
    const newUuid = uuidv4();
    navigate(`/game/${newUuid}`);
  };

  return (
    <Center style={{ height: '100vh', flexDirection: 'column' }}>
      <Title order={1} mb="xl">
        Polyglot Wordle
      </Title>
      <Button size="xl" onClick={startNewGame}>
        New Game
      </Button>
    </Center>
  );
}
