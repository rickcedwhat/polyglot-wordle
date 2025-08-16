import { FC } from 'react';
import { IconTrophy } from '@tabler/icons-react';
import { Text } from '@mantine/core';
import { useScore } from '@/context/ScoreContext';
import { BlurButton as Button } from '../BlurButton/BlurButton';

interface ScoreProps {
  fullWidth?: boolean; // 1. Add the optional prop
}

export const Score: FC<ScoreProps> = ({ fullWidth }) => {
  // 2. Destructure it
  const { score } = useScore();

  return (
    <Button
      leftSection={<IconTrophy size="1rem" />}
      fullWidth={fullWidth} // 3. Pass it to the Button
      style={fullWidth ? { marginTop: '1rem' } : undefined}
      variant="light"
    >
      <Text>Score: {score}</Text>
    </Button>
  );
};
