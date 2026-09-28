import { useEffect, useRef, useState } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconRefresh,
} from '@tabler/icons-react';
import { ActionIcon, Group, Paper, Slider, Text, Tooltip } from '@mantine/core';
import type { StoryGame } from './useStoryGame';

const AUTOPLAY_INTERVAL_MS = 2500;

/** Step through a story game's guess timeline one guess at a time. */
export function GameReplayControls({ game }: { game: StoryGame }) {
  const { step, timeline, goTo, reset } = game;
  const total = timeline.length;
  const [playing, setPlaying] = useState(false);
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  useEffect(() => {
    if (!playing) {
      return;
    }
    if (step >= total) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => goToRef.current(step + 1), AUTOPLAY_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [playing, step, total]);

  const togglePlay = () => {
    if (!playing && step >= total) {
      goTo(0);
    }
    setPlaying((p) => !p);
  };

  const currentWord = step > 0 ? timeline[step - 1] : null;

  return (
    <Paper withBorder radius="md" p="xs" maw={560} w="100%" mx="auto">
      <Group gap="xs" wrap="wrap">
        <Tooltip label="Start">
          <ActionIcon
            aria-label="Start"
            variant="subtle"
            onClick={() => goTo(0)}
            disabled={step === 0}
          >
            <IconPlayerSkipBackFilled size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Previous guess">
          <ActionIcon
            aria-label="Previous guess"
            variant="light"
            onClick={() => goTo(step - 1)}
            disabled={step === 0}
          >
            <IconChevronLeft size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={playing ? 'Pause' : 'Autoplay'}>
          <ActionIcon
            aria-label={playing ? 'Pause' : 'Autoplay'}
            variant="filled"
            onClick={togglePlay}
            disabled={total === 0}
          >
            {playing ? <IconPlayerPauseFilled size={16} /> : <IconPlayerPlayFilled size={16} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Next guess (plays animations)">
          <ActionIcon
            aria-label="Next guess (plays animations)"
            variant="light"
            onClick={() => goTo(step + 1)}
            disabled={step >= total}
          >
            <IconChevronRight size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="End">
          <ActionIcon
            aria-label="End"
            variant="subtle"
            onClick={() => goTo(total)}
            disabled={step >= total}
          >
            <IconPlayerSkipForwardFilled size={16} />
          </ActionIcon>
        </Tooltip>
        <Slider
          flex={1}
          miw={140}
          min={0}
          max={Math.max(total, 1)}
          step={1}
          value={step}
          onChange={goTo}
          disabled={total === 0}
          label={null}
          marks={timeline.map((_, i) => ({ value: i + 1 }))}
        />
        <Text size="xs" fw={600} miw={80}>
          {step}/{total}
          {currentWord ? ` · ${currentWord.toUpperCase()}` : ''}
        </Text>
        <Tooltip label="Restore the saved guesses">
          <ActionIcon
            aria-label="Restore the saved guesses"
            variant="subtle"
            color="gray"
            onClick={reset}
          >
            <IconRefresh size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Paper>
  );
}
