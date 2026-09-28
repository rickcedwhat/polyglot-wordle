import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge, Box, Button, Center, Group, Loader, Stack, Text } from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import { useLetterStatus } from '@/hooks/useLetterStatus';
import { useWordPools } from '@/hooks/useWordPools';
import type { Language } from '@/types/firestore';
import { flagFor } from '@/utils/languages';
import {
  calculateScoreFromHistory,
  getLatestTurnScoreEvents,
  normalizeWord,
  validateGuess,
  type ScoreEvent,
} from '@/utils/wordUtils';
import { AlphabetStatus } from '../AlphabetStatus/AlphabetStatus';
import { CurrentGuessRow } from '../CurrentGuessRow/CurrentGuessRow';
import { GameBoard } from '../Gameboard/Gameboard';
import { ScorePopups } from './ScorePopups';

const COMBOS = {
  'en-es-fr': {
    shuffled: ['fr', 'en', 'es'] as Language[],
    words: { en: 'apple', es: 'queso', fr: 'fruit' },
  },
  'en-it-pt': {
    shuffled: ['pt', 'en', 'it'] as Language[],
    words: { en: 'apple', it: 'fiore', pt: 'livro' },
  },
  'es-fr-it': {
    shuffled: ['it', 'es', 'fr'] as Language[],
    words: { es: 'queso', fr: 'fruit', it: 'fiore' },
  },
} as const;

type ComboKey = keyof typeof COMBOS;

interface StoryArgs {
  combo: ComboKey;
  showSolution: boolean;
  durationMs: number;
}

const meta: Meta<StoryArgs> = {
  title: 'Game/ScorePopups',
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    combo: {
      control: { type: 'select' },
      options: Object.keys(COMBOS),
      description: 'Language combo and its fixed solution words.',
    },
    showSolution: {
      control: { type: 'boolean' },
      description: 'Show the solution words above the boards.',
    },
    durationMs: {
      control: { type: 'range', min: 600, max: 10000, step: 200 },
      description: 'Popup animation length (app default 1800ms). Raise it to inspect styling.',
    },
  },
  args: {
    combo: 'en-it-pt',
    showSolution: true,
    durationMs: 1800,
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

const EMPTY_GUESS = Array(5).fill('');

const PlayableGame = ({ combo, showSolution, durationMs }: StoryArgs) => {
  const { shuffled, words } = COMBOS[combo];
  const solution = words as Partial<Record<Language, string>>;
  const difficulties = useMemo(
    () => Object.fromEntries(shuffled.map((lang) => [lang, 'advanced' as const])),
    [shuffled]
  );
  const { data: wordPools } = useWordPools(difficulties);
  const { updateLetterStatuses } = useLetterStatus();

  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>(EMPTY_GUESS);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [isInvalid, setIsInvalid] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [burst, setBurst] = useState<{ id: number; events: ScoreEvent[] } | null>(null);

  const solvedAll = shuffled.every((lang) =>
    guesses.map(normalizeWord).includes(normalizeWord(solution[lang]!))
  );
  const isOver = solvedAll || guesses.length >= MAX_GUESSES;

  useEffect(() => {
    updateLetterStatuses({ guesses, solution, shuffledLanguages: shuffled });
  }, [guesses, solution, shuffled, updateLetterStatuses]);

  const reset = () => {
    setGuesses([]);
    setCurrentGuess(EMPTY_GUESS);
    setCursorIndex(0);
    setBurst(null);
  };

  const handleKeyPress = useCallback(
    (key: string) => {
      if (isOver || !wordPools) {
        return;
      }
      const lowerKey = key.toLowerCase();
      setActiveKey(null);
      setTimeout(() => setActiveKey(lowerKey), 10);

      if (lowerKey === 'enter') {
        const guess = currentGuess.join('');
        if (guess.length !== 5) {
          return;
        }
        const { isValid } = validateGuess({
          guess,
          masterPools: wordPools.master,
          solution,
          previousGuesses: guesses,
        });
        if (!isValid) {
          setIsInvalid(true);
          setTimeout(() => setIsInvalid(false), 500);
          return;
        }
        const next = [...guesses, guess];
        setGuesses(next);
        setBurst({ id: next.length, events: getLatestTurnScoreEvents(next, solution) });
        setCurrentGuess(EMPTY_GUESS);
        setCursorIndex(0);
      } else if (lowerKey === 'del' || lowerKey === 'backspace') {
        const next = [...currentGuess];
        if (next[cursorIndex]) {
          next[cursorIndex] = '';
          setCurrentGuess(next);
        } else if (cursorIndex > 0) {
          next[cursorIndex - 1] = '';
          setCurrentGuess(next);
          setCursorIndex(cursorIndex - 1);
        }
      } else if (/^[a-z]$/.test(lowerKey)) {
        const next = [...currentGuess];
        next[cursorIndex] = lowerKey;
        setCurrentGuess(next);
        setCursorIndex(Math.min(4, cursorIndex + 1));
      }
    },
    [currentGuess, cursorIndex, guesses, isOver, solution, wordPools]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleKeyPress('enter');
      } else if (event.key === 'Backspace') {
        handleKeyPress('del');
      } else if (event.key === 'ArrowLeft') {
        setCursorIndex((i) => Math.max(0, i - 1));
      } else if (event.key === 'ArrowRight') {
        setCursorIndex((i) => Math.min(4, i + 1));
      } else if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
        handleKeyPress(event.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleKeyPress]);

  if (!wordPools) {
    return (
      <Center h="80vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="xs" p="md" mih="100vh" justify="space-between">
      <Group justify="space-between" wrap="wrap">
        <Group gap="xs">
          {showSolution &&
            shuffled.map((lang) => (
              <Badge key={lang} variant="light" size="lg">
                {flagFor(lang)} {solution[lang]}
              </Badge>
            ))}
        </Group>
        <Group gap="xs">
          <Badge variant="outline" size="lg">
            Score {calculateScoreFromHistory(guesses, solution)}
          </Badge>
          <Badge variant="outline" size="lg">
            {guesses.length}/{MAX_GUESSES}
          </Badge>
          <Button size="xs" variant="light" onClick={reset}>
            Reset
          </Button>
        </Group>
      </Group>

      <GameBoard
        key={combo}
        solution={solution}
        guesses={guesses}
        shuffledLanguages={shuffled}
        wordPoolsOverride={wordPools}
      />

      <Box>
        {isOver && (
          <Text ta="center" fw={700} c={solvedAll ? 'green' : 'red'}>
            {solvedAll ? 'All words solved!' : 'Out of guesses'} — hit Reset to play again
          </Text>
        )}
        <Box pos="relative">
          {burst && (
            <ScorePopups
              key={`${burst.id}-${durationMs}`}
              events={burst.events}
              durationMs={durationMs}
            />
          )}
          <CurrentGuessRow
            guess={currentGuess}
            cursorIndex={cursorIndex}
            onTileClick={setCursorIndex}
            isInvalid={isInvalid}
          />
        </Box>
        <AlphabetStatus activeKey={activeKey} onKeyPress={handleKeyPress} />
      </Box>
    </Stack>
  );
};

export const Playable: Story = {
  name: 'Playable Game',
  render: (args) => <PlayableGame key={args.combo} {...args} />,
};
