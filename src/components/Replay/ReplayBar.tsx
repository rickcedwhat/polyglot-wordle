import { FC } from 'react';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconPlayerTrackNextFilled,
  IconPlayerTrackPrevFilled,
} from '@tabler/icons-react';
import { ActionIcon, Group, SegmentedControl, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { REPLAY_SPEEDS, type Replay, type ReplaySpeed } from '@/hooks/useReplay';
import classes from './ReplayBar.module.css';

interface ReplayBarProps {
  replay: Replay;
  /** Guess numbers (1-based) that solved a word, marked on their dots. */
  solvedSteps: number[];
}

/** Play / step controls and one dot per guess for a finished game's replay. */
export const ReplayBar: FC<ReplayBarProps> = ({ replay, solvedSteps }) => {
  const { step, total, playing } = replay;
  const typing = replay.typedLetters !== null;

  return (
    <Group className={classes.bar} gap="xs" wrap="nowrap" justify="center">
      <Group gap={2} wrap="nowrap">
        <ActionIcon
          variant="subtle"
          color="gray"
          className={classes.skip}
          onClick={() => replay.goTo(0)}
          disabled={step === 0 && !typing}
          aria-label="Back to the start"
        >
          <IconPlayerSkipBackFilled size={14} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={replay.prev}
          disabled={step === 0}
          aria-label="Previous guess"
        >
          <IconPlayerTrackPrevFilled size={14} />
        </ActionIcon>
        <ActionIcon
          variant="filled"
          radius="xl"
          size="lg"
          onClick={playing ? replay.pause : replay.play}
          disabled={total === 0}
          aria-label={playing ? 'Pause replay' : 'Play replay'}
        >
          {playing ? <IconPlayerPauseFilled size={16} /> : <IconPlayerPlayFilled size={16} />}
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={replay.next}
          disabled={step >= total || typing}
          aria-label="Next guess"
        >
          <IconPlayerTrackNextFilled size={14} />
        </ActionIcon>
        <ActionIcon
          variant="subtle"
          color="gray"
          className={classes.skip}
          onClick={() => replay.goTo(total)}
          disabled={step >= total && !typing}
          aria-label="Skip to the end"
        >
          <IconPlayerSkipForwardFilled size={14} />
        </ActionIcon>
      </Group>

      <Group gap={6} wrap="nowrap" className={classes.dots}>
        {Array.from({ length: total }, (_, i) => i + 1).map((at) => (
          <Tooltip key={at} label={`Guess ${at}`} withArrow openDelay={300}>
            <UnstyledButton
              className={classes.dot}
              data-played={at <= step || undefined}
              data-current={at === step || undefined}
              data-solved={solvedSteps.includes(at) || undefined}
              onClick={() => replay.goTo(at)}
              aria-label={`Jump to guess ${at}`}
            />
          </Tooltip>
        ))}
      </Group>

      <Text size="xs" c="dimmed" className={classes.count}>
        {step}/{total}
      </Text>

      <SegmentedControl
        size="xs"
        value={String(replay.speed)}
        onChange={(value) => replay.setSpeed(Number(value) as ReplaySpeed)}
        data={REPLAY_SPEEDS.map((speed) => ({ value: String(speed), label: `${speed}×` }))}
        aria-label="Replay speed"
      />
    </Group>
  );
};
