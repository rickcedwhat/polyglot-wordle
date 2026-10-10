import { FC } from 'react';
import {
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerTrackNextFilled,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Group } from '@mantine/core';
import type { Replay } from '@/hooks/useReplay';

interface ReplayBarProps {
  replay: Replay;
  /** What one step is. */
  step?: 'guess' | 'turn';
}

/** Play (runs to the end) / pause, and play just the next step. */
export const ReplayBar: FC<ReplayBarProps> = ({ replay, step: stepKind = 'guess' }) => {
  const { step, total, playing } = replay;
  const { t } = useTranslation();
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
        {playing ? t('replay.pause') : step >= total ? t('replay.replay') : t('replay.play')}
      </Button>
      <Button
        radius="xl"
        size="sm"
        variant="default"
        rightSection={<IconPlayerTrackNextFilled size={14} />}
        onClick={() => (step >= total ? replay.goTo(0) : replay.next())}
        disabled={busy || total === 0}
      >
        {step >= total
          ? t('replay.startOver')
          : stepKind === 'turn'
            ? t('replay.nextTurn')
            : t('replay.nextGuess')}
      </Button>
    </Group>
  );
};
