import { FC } from 'react';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerTrackNextFilled,
} from '@tabler/icons-react';
import { Button, Group } from '@mantine/core';
import type { Replay } from '@/hooks/useReplay';

interface ReplayBarProps {
  replay: Replay;
  /** What one step is called ("guess", "turn"). */
  stepLabel?: string;
}

/** Play (runs to the end) / pause, and play just the next step. */
export const ReplayBar: FC<ReplayBarProps> = ({ replay, stepLabel = 'guess' }) => {
  const { step, total, playing } = replay;
  const busy = playing || replay.typedLetters !== null;

  return (
    <Group gap="xs" justify="center">
      <Button
        radius="xl"
        size="sm"
        leftSection={
          playing ? <IconPlayerPauseFilled size={14} /> : <IconPlayerPlayFilled size={14} />
        }
        onClick={playing ? replay.pause : replay.play}
        disabled={total === 0}
      >
        {playing ? 'Pause' : step >= total ? 'Replay' : 'Play'}
      </Button>
      <Button
        radius="xl"
        size="sm"
        variant="default"
        rightSection={<IconPlayerTrackNextFilled size={14} />}
        onClick={() => (step >= total ? replay.goTo(0) : replay.next())}
        disabled={busy || total === 0}
      >
        {step >= total ? 'Start over' : `Next ${stepLabel}`}
      </Button>
    </Group>
  );
};
