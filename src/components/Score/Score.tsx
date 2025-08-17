import { FC } from 'react';
import { IconHash, IconTrophy } from '@tabler/icons-react';
import { Divider, Group, Paper, Stack, Text } from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import { useScore } from '@/context/ScoreContext';

interface ScoreProps {
  orientation?: 'vertical' | 'horizontal';
}

export const Score: FC<ScoreProps> = ({ orientation = 'vertical' }) => {
  const { score, numberOfGuesses } = useScore();

  // HORIZONTAL LAYOUT (for the header)
  if (orientation === 'horizontal') {
    return (
      <Group gap="xs">
        <IconTrophy size="1.2rem" />
        <Text fz="sm" fw={700}>
          {score}
        </Text>
        <Divider orientation="vertical" />
        <Text fz="sm" fw={500}>
          {numberOfGuesses}/{MAX_GUESSES}
        </Text>
      </Group>
    );
  }

  // VERTICAL LAYOUT (the default, for the sidebar)
  return (
    <Paper withBorder p="sm" radius="md">
      <Stack gap="xs">
        <Group justify="space-between">
          <Group gap="xs">
            <IconTrophy size="1.1rem" />
            <Text fz="sm" fw={500}>
              Score
            </Text>
          </Group>
          <Text fw={700}>{score}</Text>
        </Group>
        <Group justify="space-between">
          <Group gap="xs">
            <Text fz="sm" fw={500}>
              Guesses
            </Text>
          </Group>
          <Text fw={700}>
            {numberOfGuesses} / {MAX_GUESSES}
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
};
