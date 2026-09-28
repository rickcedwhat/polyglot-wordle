import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge, Box, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import {
  calculateScoreFromHistory,
  getLatestTurnScoreEvents,
  type ScoreEvent,
} from '@/utils/wordUtils';
import { CurrentGuessRow } from '../CurrentGuessRow/CurrentGuessRow';
import { ScorePopups } from './ScorePopups';

const meta: Meta<typeof ScorePopups> = {
  title: 'Game/ScorePopups',
  component: ScorePopups,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    events: { control: false },
    durationMs: {
      control: { type: 'range', min: 600, max: 10000, step: 200 },
      description: 'Animation length per popup (app default 1800ms).',
    },
  },
  args: {
    durationMs: 1800,
  },
};

export default meta;
type Story = StoryObj<typeof ScorePopups>;

const EMPTY_ROW = ['', '', '', '', ''];

const PopupStage = ({ events, durationMs }: { events: ScoreEvent[]; durationMs?: number }) => {
  const [burst, setBurst] = useState(0);
  return (
    <Stack align="center" gap="md" pt={200} w={360}>
      <Box pos="relative">
        <ScorePopups key={`${burst}-${durationMs}`} events={events} durationMs={durationMs} />
        <CurrentGuessRow guess={EMPTY_ROW} cursorIndex={0} onTileClick={() => {}} />
      </Box>
      <Button size="xs" variant="light" onClick={() => setBurst((b) => b + 1)}>
        Replay
      </Button>
    </Stack>
  );
};

const scenario = (events: ScoreEvent[]): Story => ({
  render: ({ durationMs }) => <PopupStage events={events} durationMs={durationMs} />,
});

export const SlowMotion = {
  ...scenario([
    { kind: 'green', points: 50, lang: 'en' },
    { kind: 'yellow', points: 15, lang: 'it' },
    { kind: 'wordSolved', points: 160, lang: 'it' },
    { kind: 'gameSolved', points: 175 },
  ]),
  name: 'Slow Motion (inspect styling)',
  args: { durationMs: 10000 },
};

export const GreensAndYellows = {
  ...scenario([
    { kind: 'green', points: 50, lang: 'en' },
    { kind: 'green', points: 50, lang: 'it' },
    { kind: 'yellow', points: 5, lang: 'en' },
    { kind: 'yellow', points: 10, lang: 'pt' },
  ]),
  name: 'Greens + Yellow Combo',
};

export const YellowsOnly = {
  ...scenario([
    { kind: 'yellow', points: 5, lang: 'es' },
    { kind: 'yellow', points: 10, lang: 'es' },
    { kind: 'yellow', points: 15, lang: 'es' },
  ]),
  name: 'Yellow Combo Only',
};

export const WordSolved = {
  ...scenario([
    { kind: 'green', points: 40, lang: 'it' },
    { kind: 'yellow', points: 5, lang: 'pt' },
    { kind: 'wordSolved', points: 160, lang: 'it' },
  ]),
  name: 'Word Solved',
};

export const GameWon = {
  ...scenario([
    { kind: 'green', points: 35, lang: 'fr' },
    { kind: 'wordSolved', points: 140, lang: 'fr' },
    { kind: 'gameSolved', points: 175 },
  ]),
  name: 'Game Won',
};

export const GameLost = {
  ...scenario([
    { kind: 'green', points: 15, lang: 'en' },
    { kind: 'penalty', points: -250, lang: 'es' },
    { kind: 'penalty', points: -250, lang: 'pt' },
  ]),
  name: 'Game Lost (Penalties)',
};

const PLAYGROUND_SOLUTION = { en: 'apple', it: 'fiore', pt: 'livro' };

const ScoringPlayground = () => {
  const [history, setHistory] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const events = getLatestTurnScoreEvents(history, PLAYGROUND_SOLUTION);
  const isOver = history.length >= MAX_GUESSES;

  const submit = () => {
    const guess = input.toLowerCase().replace(/[^a-z]/g, '');
    if (guess.length !== 5 || isOver) {
      return;
    }
    setHistory((h) => [...h, guess]);
    setInput('');
  };

  return (
    <Stack align="center" gap="md" pt={200} w={380}>
      <Box pos="relative">
        {history.length > 0 && <ScorePopups key={history.length} events={events} />}
        <CurrentGuessRow
          guess={Array.from({ length: 5 }, (_, i) => input[i]?.toLowerCase() ?? '')}
          cursorIndex={Math.min(4, input.length)}
          onTileClick={() => {}}
        />
      </Box>
      <Group gap="xs" align="flex-end">
        <TextInput
          label="Guess (any 5 letters)"
          value={input}
          maxLength={5}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          disabled={isOver}
        />
        <Button onClick={submit} disabled={isOver}>
          Guess
        </Button>
        <Button variant="subtle" onClick={() => setHistory([])}>
          Reset
        </Button>
      </Group>
      <Text size="xs" c="dimmed" ta="center">
        Solution:{' '}
        {Object.entries(PLAYGROUND_SOLUTION)
          .map(([lang, word]) => `${lang.toUpperCase()} ${word}`)
          .join(' · ')}
      </Text>
      <Group gap="xs">
        <Badge variant="light">
          Guesses {history.length}/{MAX_GUESSES}
        </Badge>
        <Badge variant="light">
          Score {calculateScoreFromHistory(history, PLAYGROUND_SOLUTION)}
        </Badge>
      </Group>
    </Stack>
  );
};

export const Playground: Story = {
  name: 'Scoring Playground',
  render: () => <ScoringPlayground />,
};
