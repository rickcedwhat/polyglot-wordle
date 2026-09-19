import { useCallback, useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Box, Button, Group, Text } from '@mantine/core';
import { useLetterStatus } from '@/hooks/useLetterStatus';
import type { Language } from '@/types/firestore';
import { AlphabetStatus } from './AlphabetStatus';

const meta: Meta<typeof AlphabetStatus> = {
  title: 'Game/AlphabetStatus',
  component: AlphabetStatus,
  tags: ['autodocs'],
  argTypes: {
    onKeyPress: { action: 'keyPress', table: { disable: true } },
    activeKey: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof AlphabetStatus>;

interface InteractiveHarnessProps {
  initialGuesses?: string[];
  solution?: {
    en: string;
    es: string;
    fr: string;
  };
}

const InteractiveKeyboardHarness = ({
  initialGuesses = [],
  solution = { en: 'apple', es: 'audio', fr: 'fruit' },
}: InteractiveHarnessProps) => {
  const [guesses, setGuesses] = useState<string[]>(initialGuesses);
  const [currentGuess, setCurrentGuess] = useState('');
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const { updateLetterStatuses } = useLetterStatus();

  const shuffledLanguages: Language[] = ['en', 'es', 'fr'];

  useEffect(() => {
    updateLetterStatuses({ guesses, solution, shuffledLanguages });
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

  const handleReset = () => {
    setGuesses([]);
    setCurrentGuess('');
    updateLetterStatuses({
      guesses: [],
      solution: { en: '', es: '', fr: '' },
      shuffledLanguages,
    });
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
    <Box p="md" maw={620} mx="auto">
      <Box p="md" mb="md" style={{ border: '1px solid #444', borderRadius: '8px' }}>
        <Text size="sm">
          <strong>Current Guess:</strong> {currentGuess.padEnd(5, '_')}
        </Text>
        <Text size="sm" mt={4}>
          <strong>Submitted Guesses:</strong> {guesses.length ? guesses.join(', ') : '(None)'}
        </Text>
        <Text size="xs" c="dimmed" mt={8}>
          Solutions: EN: {solution.en} | ES: {solution.es} | FR: {solution.fr}
        </Text>
        <Group mt="sm">
          <Button onClick={handleReset} variant="outline" size="xs">
            Reset Guesses
          </Button>
        </Group>
      </Box>

      <AlphabetStatus onKeyPress={handleKeyPress} activeKey={activeKey} />
    </Box>
  );
};

export const Default: Story = {
  render: () => <AlphabetStatus onKeyPress={() => {}} activeKey={null} />,
};

export const InteractivePlayground: Story = {
  name: 'Interactive Playground',
  render: () => (
    <InteractiveKeyboardHarness
      initialGuesses={['adopt']}
      solution={{ en: 'apple', es: 'audio', fr: 'fruit' }}
    />
  ),
};
