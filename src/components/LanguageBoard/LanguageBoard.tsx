import { FC, memo, useState } from 'react';
import { Box, Group, Loader, Popover, Stack, Text, UnstyledButton } from '@mantine/core';
import { useDefinition } from '@/hooks/useDefinition';
import { formatDefinition, getGuessStatuses, normalizeWord } from '@/utils/wordUtils';
import { LetterTile } from '../LetterTile/LetterTile';
import classes from './LanguageBoard.module.css';

interface LanguageBoardProps {
  language: 'en' | 'es' | 'fr';
  solutionWord: string;
  submittedGuesses: string[];
  words: string[];
  maxGuesses: number;
}

// 1. We create a dedicated component for a single, submitted guess row.
const SubmittedRow: FC<{
  guess: string;
  language: 'en' | 'es' | 'fr';
  solutionWord: string;
  languageMatch: boolean;
}> = ({ guess, language, solutionWord, languageMatch }) => {
  const [opened, setOpened] = useState(false);
  const statuses = getGuessStatuses(guess, solutionWord);

  const { data, isLoading, isError, refetch } = useDefinition(language, guess);

  const handleClick = () => {
    if (languageMatch) {
      // refetch will only make a network request the first time.
      // After that, it finds the data in the cache and returns it instantly.
      refetch();
      setOpened(true);
    }
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom"
      withArrow
      shadow="md"
      width={280}
    >
      <Popover.Target>
        <UnstyledButton
          onClick={handleClick}
          className={languageMatch ? classes.languageMatch : ''}
          style={{ cursor: languageMatch ? 'pointer' : 'default' }}
        >
          <Group gap="xs" wrap="nowrap">
            {guess.split('').map((letter, colIndex) => (
              <Box key={colIndex} style={{ flex: 1 }}>
                <LetterTile letter={letter} status={statuses[colIndex]} />
              </Box>
            ))}
          </Group>
        </UnstyledButton>
      </Popover.Target>

      <Popover.Dropdown>
        {isLoading && <Loader size="xs" />}
        {isError && (
          <Text size="sm" c="dimmed">
            Definition not found.
          </Text>
        )}
        {/* 2. Wrap the `data` in the formatting function */}
        {data && <Text size="sm">{formatDefinition(data)}</Text>}
      </Popover.Dropdown>
    </Popover>
  );
};

// 2. The main LanguageBoard component is now simpler.
const LanguageBoard: FC<LanguageBoardProps> = memo(
  ({ language, solutionWord, submittedGuesses, words, maxGuesses }) => {
    const normalizedSolution = normalizeWord(solutionWord);
    let lastRelevantGuessIndex = submittedGuesses.indexOf(normalizedSolution);
    if (lastRelevantGuessIndex === -1) {
      lastRelevantGuessIndex = submittedGuesses.length - 1;
    }

    const emptyRowsCount = maxGuesses - lastRelevantGuessIndex - 1;
    const relevantGuesses = submittedGuesses.slice(0, lastRelevantGuessIndex + 1);

    return (
      <Box h="100%" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Stack gap="xs" maw={320} mx="auto">
          {relevantGuesses.map((guess, rowIndex) => {
            const matchingWord = words.find((word) => normalizeWord(word) === guess);
            const languageMatch = !!matchingWord;

            // If there's a matching word in the language, display it; otherwise, show the submitted guess (necessary for accented words)
            const displayGuess = matchingWord || guess;
            return (
              <SubmittedRow
                key={rowIndex}
                guess={displayGuess}
                solutionWord={solutionWord}
                language={language}
                languageMatch={languageMatch}
              />
            );
          })}
          {/* Render empty rows */}
          {Array.from({ length: emptyRowsCount }).map((_, rowIndex) => (
            <Group key={rowIndex} gap="xs" wrap="nowrap">
              {Array.from({ length: 5 }).map((_, colIndex) => (
                <Box key={colIndex} style={{ flex: 1 }}>
                  <LetterTile letter="" status="unknown" />
                </Box>
              ))}
            </Group>
          ))}
        </Stack>
      </Box>
    );
  }
);

export default LanguageBoard;
