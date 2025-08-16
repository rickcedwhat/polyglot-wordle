import { FC } from 'react';
import { IconArrowRight, IconMoodSad, IconTrophy } from '@tabler/icons-react';
import { Button, Modal, Stack, Text, Title } from '@mantine/core';
import { useGameActions } from '@/hooks/useGameActions';

interface GameOverProps {
  opened: boolean;
  onClose: () => void;
  status: 'won' | 'lost';
  score: number;
}

export const GameOver: FC<GameOverProps> = ({ opened, onClose, status, score }) => {
  const isWin = status === 'won';
  const { createNewGame } = useGameActions();

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isWin ? 'Congratulations!' : 'Game Over'}
      centered
    >
      <Stack align="center">
        {isWin ? (
          <IconTrophy size={48} color="var(--mantine-color-yellow-6)" />
        ) : (
          <IconMoodSad size={48} color="var(--mantine-color-gray-6)" />
        )}
        <Title order={2}>{isWin ? 'You Won!' : 'Better Luck Next Time!'}</Title>
        <Text>{isWin ? `You solved it in ${score}/10 guesses.` : 'You ran out of guesses.'}</Text>
        <Button
          onClick={createNewGame}
          variant="light"
          rightSection={<IconArrowRight size={14} />}
          mt="md"
        >
          Play a New Game
        </Button>
      </Stack>
    </Modal>
  );
};
