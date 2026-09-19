import { useCallback, useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge, Box, Button, Card, Group, Paper, Text } from '@mantine/core';
import { useLetterStatus } from '@/hooks/useLetterStatus';
import type { Language } from '@/types/firestore';
import { AlphabetStatus } from './AlphabetStatus';

interface AlphabetStoryControls {
  scenario: 'midGame' | 'allSolved' | 'newGame' | 'custom';
  englishWord: string;
  spanishWord: string;
  frenchWord: string;
  guesses: string;
  activeKey: string;
}

const meta: Meta<AlphabetStoryControls> = {
  title: 'Game/AlphabetStatus',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    scenario: {
      control: { type: 'select' },
      options: ['midGame', 'allSolved', 'newGame', 'custom'],
      description: 'Quick game preset or custom scenario to test keyboard statuses.',
    },
    englishWord: {
      control: { type: 'text' },
      description: 'Target English solution word (5 letters).',
    },
    spanishWord: {
      control: { type: 'text' },
      description: 'Target Spanish solution word (5 letters).',
    },
    frenchWord: {
      control: { type: 'text' },
      description: 'Target French solution word (5 letters).',
    },
    guesses: {
      control: { type: 'text' },
      description: 'Comma-separated list of evaluated guesses (e.g. "ADOPT, CRANE, PILOT").',
    },
    activeKey: {
      control: { type: 'text' },
      description: 'Simulate pressing or focusing a specific key (e.g. "a", "enter", "del").',
    },
  },
};

export default meta;
type Story = StoryObj<AlphabetStoryControls>;

const SHUFFLED_LANGS: Language[] = ['en', 'es', 'fr'];

const PRESET_SCENARIOS: Record<string, { en: string; es: string; fr: string; guesses: string[] }> =
  {
    midGame: {
      en: 'apple',
      es: 'audio',
      fr: 'fruit',
      guesses: ['adopt', 'crane', 'pilot'],
    },
    allSolved: {
      en: 'apple',
      es: 'audio',
      fr: 'fruit',
      guesses: ['crane', 'apple', 'audio', 'fruit'],
    },
    newGame: {
      en: 'apple',
      es: 'audio',
      fr: 'fruit',
      guesses: [],
    },
  };

// Component that drives the keyboard from Storybook controls
const ControlsDrivenKeyboard = ({
  scenario,
  englishWord,
  spanishWord,
  frenchWord,
  guesses,
  activeKey,
}: AlphabetStoryControls) => {
  const { updateLetterStatuses } = useLetterStatus();

  useEffect(() => {
    let effectiveSolution = {
      en: englishWord.toLowerCase().trim(),
      es: spanishWord.toLowerCase().trim(),
      fr: frenchWord.toLowerCase().trim(),
    };
    let effectiveGuesses: string[] = [];

    if (scenario !== 'custom' && PRESET_SCENARIOS[scenario]) {
      const p = PRESET_SCENARIOS[scenario];
      effectiveSolution = { en: p.en, es: p.es, fr: p.fr };
      effectiveGuesses = p.guesses;
    } else {
      effectiveGuesses = guesses
        .split(',')
        .map((g) => g.toLowerCase().trim())
        .filter((g) => g.length === 5);
    }

    updateLetterStatuses({
      guesses: effectiveGuesses,
      solution: effectiveSolution,
      shuffledLanguages: SHUFFLED_LANGS,
    });
  }, [scenario, englishWord, spanishWord, frenchWord, guesses, updateLetterStatuses]);

  return (
    <Box maw={640} mx="auto" p="md">
      <Paper p="sm" mb="md" withBorder radius="md">
        <Group justify="space-between" mb={6}>
          <Text size="xs" fw={700} c="dimmed">
            KEYBOARD STATUS CONTROLS
          </Text>
          <Badge size="xs" variant="light" color="blue">
            Scenario: {scenario}
          </Badge>
        </Group>
        <Group gap="xs" wrap="wrap">
          <Badge color="blue" variant="dot" size="sm">
            EN: {scenario !== 'custom' ? PRESET_SCENARIOS[scenario]?.en : englishWord}
          </Badge>
          <Badge color="orange" variant="dot" size="sm">
            ES: {scenario !== 'custom' ? PRESET_SCENARIOS[scenario]?.es : spanishWord}
          </Badge>
          <Badge color="cyan" variant="dot" size="sm">
            FR: {scenario !== 'custom' ? PRESET_SCENARIOS[scenario]?.fr : frenchWord}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed" mt={6}>
          Key segment order: <strong>Top = EN</strong> | <strong>Middle = ES</strong> |{' '}
          <strong>Bottom = FR</strong>. Adjust values in the Controls panel below to update letter
          colors in real time.
        </Text>
      </Paper>

      <AlphabetStatus onKeyPress={() => {}} activeKey={activeKey || null} />
    </Box>
  );
};

export const ControlsPlayground: Story = {
  name: 'Controls Playground (Instant Test)',
  render: (args) => <ControlsDrivenKeyboard {...args} />,
  args: {
    scenario: 'midGame',
    englishWord: 'apple',
    spanishWord: 'audio',
    frenchWord: 'fruit',
    guesses: 'adopt, crane, pilot',
    activeKey: '',
  },
};

export const ScenarioMidGame: Story = {
  name: 'Preset: Mid-Game (Mixed Letters)',
  render: () => (
    <ControlsDrivenKeyboard
      scenario="midGame"
      englishWord="apple"
      spanishWord="audio"
      frenchWord="fruit"
      guesses="adopt, crane, pilot"
      activeKey=""
    />
  ),
};

export const ScenarioAllSolved: Story = {
  name: 'Preset: All Words Solved',
  render: () => (
    <ControlsDrivenKeyboard
      scenario="allSolved"
      englishWord="apple"
      spanishWord="audio"
      frenchWord="fruit"
      guesses="crane, apple, audio, fruit"
      activeKey=""
    />
  ),
};

export const ScenarioNewGame: Story = {
  name: 'Preset: New Game (Neutral Keys)',
  render: () => (
    <ControlsDrivenKeyboard
      scenario="newGame"
      englishWord="apple"
      spanishWord="audio"
      frenchWord="fruit"
      guesses=""
      activeKey=""
    />
  ),
};

// --- Interactive Keyboard Typing Playground ---

const InteractiveKeyboardHarness = () => {
  const solution = { en: 'apple', es: 'audio', fr: 'fruit' };
  const [guesses, setGuesses] = useState<string[]>(['crane', 'audio']);
  const [currentGuess, setCurrentGuess] = useState('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const { updateLetterStatuses } = useLetterStatus();

  useEffect(() => {
    updateLetterStatuses({ guesses, solution, shuffledLanguages: SHUFFLED_LANGS });
  }, [guesses, solution, updateLetterStatuses]);

  const handleKeyPress = useCallback(
    (key: string) => {
      const lowerKey = key.toLowerCase();
      setActiveKey(lowerKey);
      setTimeout(() => setActiveKey(null), 150);

      if (lowerKey === 'enter' || lowerKey === '⏎') {
        if (currentGuess.length === 5) {
          setGuesses((prev) => [...prev, currentGuess]);
          setCurrentGuess('');
        }
      } else if (lowerKey === 'del' || lowerKey === 'backspace' || lowerKey === '←') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (currentGuess.length < 5 && /^[a-z]$/.test(lowerKey)) {
        setCurrentGuess((prev) => prev + lowerKey);
      }
    },
    [currentGuess]
  );

  const applyPreset = (presetGuesses: string[]) => {
    setGuesses(presetGuesses);
    setCurrentGuess('');
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;
      if (key === 'Enter') {
        handleKeyPress('enter');
      } else if (key === 'Backspace') {
        handleKeyPress('del');
      } else if (key.length === 1 && /^[a-zA-Z]$/.test(key)) {
        handleKeyPress(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  return (
    <Box p="md" maw={640} mx="auto">
      <Card withBorder radius="md" p="sm" mb="md">
        <Group justify="space-between" align="center" mb={6}>
          <Text size="xs" fw={700} c="dimmed">
            INTERACTIVE KEYBOARD PLAYGROUND
          </Text>
          <Group gap={6}>
            <Badge size="xs" color="blue" variant="light">
              EN: {solution.en}
            </Badge>
            <Badge size="xs" color="orange" variant="light">
              ES: {solution.es}
            </Badge>
            <Badge size="xs" color="cyan" variant="light">
              FR: {solution.fr}
            </Badge>
          </Group>
        </Group>

        <Paper p="xs" withBorder radius="sm" style={{ background: 'rgba(0,0,0,0.15)' }} mb="xs">
          <Group justify="space-between" align="center">
            <Text size="sm">
              <strong>Current Guess:</strong>{' '}
              <Text span fw={700} c="blue">
                {currentGuess.padEnd(5, '_')}
              </Text>
            </Text>
            <Group gap={6}>
              <Button
                size="compact-xs"
                variant="light"
                onClick={() => handleKeyPress('del')}
                disabled={currentGuess.length === 0}
              >
                ← Del
              </Button>
              <Button
                size="compact-xs"
                color="green"
                onClick={() => handleKeyPress('enter')}
                disabled={currentGuess.length < 5}
              >
                ⏎ Submit
              </Button>
            </Group>
          </Group>
          <Text size="xs" c="dimmed" mt={4}>
            Submitted: {guesses.length ? guesses.join(' • ') : '(No guesses yet)'}
          </Text>
        </Paper>

        <Group justify="space-between" align="center">
          <Text size="xs" c="dimmed">
            Key segments: <strong>Top = EN</strong> | <strong>Mid = ES</strong> |{' '}
            <strong>Bot = FR</strong>
          </Text>
          <Group gap={4}>
            <Button
              size="compact-xs"
              variant="subtle"
              onClick={() => applyPreset(['crane', 'audio', 'pilot'])}
            >
              Load 3 Guesses
            </Button>
            <Button
              size="compact-xs"
              variant="subtle"
              color="green"
              onClick={() => applyPreset(['apple', 'audio', 'fruit'])}
            >
              Solved
            </Button>
            <Button size="compact-xs" variant="subtle" color="red" onClick={() => applyPreset([])}>
              Clear
            </Button>
          </Group>
        </Group>
      </Card>

      <AlphabetStatus onKeyPress={handleKeyPress} activeKey={activeKey} />
    </Box>
  );
};

export const InteractivePlayground: Story = {
  name: 'Interactive Playground (Click & Type)',
  render: () => <InteractiveKeyboardHarness />,
};
