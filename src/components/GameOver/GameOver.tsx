import { FC } from 'react';
import { IconArrowRight, IconMoodSad, IconTrophy } from '@tabler/icons-react';
import { Button, Modal, Stack, Text, Title } from '@mantine/core';
import { useScore } from '@/context/ScoreContext';
import { useGameActions } from '@/hooks/useGameActions';

interface GameOverProps {
  opened: boolean;
  onClose: () => void;
  status: 'won' | 'lost';
}

export const GameOver: FC<GameOverProps> = ({ opened, onClose, status }) => {
  const isWin = status === 'won';
  const { createNewGame } = useGameActions();
  const { score, numberOfGuesses } = useScore();

  return (
    <Modal opened={opened} onClose={onClose} centered size="sm">
      <Stack align="center">
        {isWin ? (
          <>
            <Title order={2}>You Won!</Title>
            <IconTrophy size={48} color="var(--mantine-color-yellow-6)" />
            <Text>{`You solved it in ${numberOfGuesses}/10 guesses.`}</Text>
          </>
        ) : (
          <>
            <Title order={2}>'You Lost!'</Title>
            <IconMoodSad size={48} color="var(--mantine-color-gray-6)" />
          </>
        )}
        <Text>{`SCORE: ${score}`}</Text>
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
