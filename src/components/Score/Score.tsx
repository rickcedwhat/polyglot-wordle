import { FC } from 'react';
import { IconTrophy } from '@tabler/icons-react';
import { Divider, Group, Paper, Stack, Text } from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import { useScore } from '@/context/ScoreContext';
import { useCountUp } from '@/hooks/useCountUp';
import { SCORE_TARGET_ATTR } from '../ScoreFlights/flightUtils';

interface ScoreProps {
  orientation?: 'vertical' | 'horizontal';
}

export const Score: FC<ScoreProps> = ({ orientation = 'vertical' }) => {
  const { score: targetScore, heldPoints, numberOfGuesses } = useScore();
  const score = useCountUp(targetScore - heldPoints);
  const targetProps = { [SCORE_TARGET_ATTR]: true };

  // HORIZONTAL LAYOUT (for the header)
  if (orientation === 'horizontal') {
    return (
      <Group gap="xs">
        <IconTrophy size="1.2rem" />
        <Text fz="sm" fw={700} {...targetProps}>
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
          <Text fw={700} {...targetProps}>
            {score}
          </Text>
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
