import { Button, Center, Title } from '@mantine/core';
import { useGameActions } from '@/hooks/useGameActions';

export function HomePage() {
  const { createNewGame } = useGameActions();

  return (
    <Center style={{ height: '100vh', flexDirection: 'column' }}>
      <Title order={1} mb="xl">
        Polyglot Wordle
      </Title>
      <Button size="xl" onClick={createNewGame}>
        New Game
      </Button>
    </Center>
  );
}
