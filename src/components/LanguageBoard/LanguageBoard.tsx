import { FC, memo, useEffect, useState } from 'react';
import { IconFlag, IconFlagFilled } from '@tabler/icons-react';
import {
  ActionIcon,
  Box,
  Group,
  Loader,
  Popover,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import { useDefinition } from '@/hooks/useDefinition';
import { useFlaggedWords } from '@/hooks/useFlaggedWords';
import { useLanguageFlags } from '@/hooks/useLanguageFlags';
import { Language } from '@/types/firestore';
import { Dictionary, formatDefinition, getGuessStatuses, normalizeWord } from '@/utils/wordUtils';
import { LetterTile } from '../LetterTile/LetterTile';
import classes from './LanguageBoard.module.css';

interface LanguageBoardProps {
  language: Language;
  solutionWord: string;
  submittedGuesses: string[];
  words: string[];
  dictionary?: Dictionary;
  candidateLanguages?: Language[];
  isConfirmed?: boolean;
  hideFlags?: boolean;
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
  const { isFlagged, toggleFlag } = useFlaggedWords();

  // Close the popover automatically whenever any key is pressed (typing a guess, backspace, etc.)
  useEffect(() => {
    if (!opened) {
      return;
    }

    const handleKeyDown = () => {
      setOpened(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [opened]);

  const handleClick = () => {
    if (languageMatch) {
      refetch();
      setOpened((prev) => !prev);
    }
  };

  const flagged = data ? isFlagged(language, guess) : false;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom"
      withArrow
      shadow="md"
      width={280}
      closeOnClickOutside
      closeOnEscape
    >
      <Popover.Target>
        <UnstyledButton
          onClick={handleClick}
          className={`${classes.rowButton} ${languageMatch ? classes.languageMatch : ''}`}
          style={{ cursor: languageMatch ? 'pointer' : 'default', width: '100%', display: 'block' }}
        >
          <Group gap="xs" wrap="nowrap" grow w="100%">
            {guess.split('').map((letter, colIndex) => (
              <Box key={colIndex} style={{ flex: 1 }} className={classes.tileWrapper}>
                <LetterTile letter={letter.toUpperCase()} status={statuses[colIndex]} />
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
        {data && (
          <Stack gap={2}>
            <Group justify="space-between" align="center">
              <Group gap={6} align="baseline">
                <Text size="sm" fw={700}>
                  {data.display}
                </Text>
                <Text size="xs" c="dimmed" fs="italic">
                  ({data.pos})
                </Text>
              </Group>
              <Tooltip label={flagged ? 'Unflag word' : 'Flag word for AI discussion'}>
                <ActionIcon
                  size="xs"
                  variant={flagged ? 'filled' : 'light'}
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFlag({
                      lang: language,
                      wordKey: guess,
                      display: data.display || guess,
                      pos: data.pos,
                      d: data.d,
                      def: data.def,
                    });
                  }}
                >
                  {flagged ? <IconFlagFilled size={12} /> : <IconFlag size={12} />}
                </ActionIcon>
              </Tooltip>
            </Group>
            <Text size="sm" style={{ lineHeight: 1.35 }}>
              • {formatDefinition(data.def)}
            </Text>
          </Stack>
        )}
      </Popover.Dropdown>
    </Popover>
  );
};

// 2. The main LanguageBoard component.
const LanguageBoard: FC<LanguageBoardProps> = memo(
  ({
    language,
    solutionWord,
    submittedGuesses,
    words,
    dictionary,
    candidateLanguages = ['en', 'es', 'fr'] as Language[],
    isConfirmed: _isConfirmed = false,
    hideFlags = false,
  }) => {
    const { flags } = useLanguageFlags();

    const normalizedSolution = normalizeWord(solutionWord);
    let lastRelevantGuessIndex = submittedGuesses.indexOf(normalizedSolution);
    if (lastRelevantGuessIndex === -1) {
      lastRelevantGuessIndex = submittedGuesses.length - 1;
    }

    const emptyRowsCount = MAX_GUESSES - lastRelevantGuessIndex - 1;
    const relevantGuesses = submittedGuesses.slice(0, lastRelevantGuessIndex + 1);

    // Target row index for displaying the flag chip:
    // Align with the latest guess row, or row 0 (top-aligned) if no guesses yet.
    const targetRowIndex = relevantGuesses.length === 0 ? 0 : relevantGuesses.length - 1;

    if (hideFlags) {
      return (
        <Box
          h="100%"
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
          <Stack gap="xs" style={{ width: '100%' }} mx="auto">
            {relevantGuesses.map((guess, rowIndex) => {
              const normGuess = normalizeWord(guess);
              const matchingWordKey = words.find((word) => normalizeWord(word) === normGuess);
              const languageMatch = !!matchingWordKey;

              const dictEntry =
                dictionary?.[normGuess] ||
                (matchingWordKey ? dictionary?.[matchingWordKey] : undefined);
              const displayGuess =
                dictEntry?.display ||
                (matchingWordKey && dictionary?.[matchingWordKey]?.display) ||
                matchingWordKey ||
                guess;

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
            {Array.from({ length: emptyRowsCount }).map((_, rowIndex) => (
              <Group key={rowIndex} gap="xs" wrap="nowrap" grow w="100%">
                {Array.from({ length: 5 }).map((_, colIndex) => (
                  <Box key={colIndex} style={{ flex: 1 }} className={classes.tileWrapper}>
                    <LetterTile letter="" status="unknown" />
                  </Box>
                ))}
              </Group>
            ))}
          </Stack>
        </Box>
      );
    }

    return (
      <Box h="100%" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Stack gap="xs" style={{ width: '100%' }} mx="auto">
          {relevantGuesses.map((guess, rowIndex) => {
            const normGuess = normalizeWord(guess);
            const matchingWordKey = words.find((word) => normalizeWord(word) === normGuess);
            const languageMatch = !!matchingWordKey;

            // Preserve accents: check dictionary entry display property (e.g. 'baños' instead of 'banos')
            const dictEntry =
              dictionary?.[normGuess] ||
              (matchingWordKey ? dictionary?.[matchingWordKey] : undefined);
            const displayGuess =
              dictEntry?.display ||
              (matchingWordKey && dictionary?.[matchingWordKey]?.display) ||
              matchingWordKey ||
              guess;

            const showFlagHere = rowIndex === targetRowIndex;

            return (
              <Group key={rowIndex} gap={4} wrap="nowrap" align="center" style={{ width: '100%' }}>
                <Box style={{ flex: 1, minWidth: 0 }}>
                  <SubmittedRow
                    guess={displayGuess}
                    solutionWord={solutionWord}
                    language={language}
                    languageMatch={languageMatch}
                  />
                </Box>
                <Box
                  style={{
                    width: 22,
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {showFlagHere && (
                    <Box
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        userSelect: 'none',
                        pointerEvents: 'none',
                      }}
                    >
                      {candidateLanguages.map((cand) => (
                        <Text
                          key={cand}
                          size="md"
                          style={{
                            fontSize: '1rem',
                            lineHeight: 1,
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                          }}
                        >
                          {flags[cand as Language]}
                        </Text>
                      ))}
                    </Box>
                  )}
                </Box>
              </Group>
            );
          })}
          {/* Render empty rows */}
          {Array.from({ length: emptyRowsCount }).map((_, rowIndex) => {
            const actualRowIndex = relevantGuesses.length + rowIndex;
            const showFlagHere = relevantGuesses.length === 0 && actualRowIndex === 0;

            return (
              <Group key={rowIndex} gap={4} wrap="nowrap" align="center" style={{ width: '100%' }}>
                <Group gap="xs" wrap="nowrap" grow style={{ flex: 1, minWidth: 0 }}>
                  {Array.from({ length: 5 }).map((_, colIndex) => (
                    <Box key={colIndex} style={{ flex: 1 }} className={classes.tileWrapper}>
                      <LetterTile letter="" status="unknown" />
                    </Box>
                  ))}
                </Group>
                <Box
                  style={{
                    width: 22,
                    flexShrink: 0,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  {showFlagHere && (
                    <Box
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        userSelect: 'none',
                        pointerEvents: 'none',
                      }}
                    >
                      {candidateLanguages.map((cand) => (
                        <Text
                          key={cand}
                          size="md"
                          style={{
                            fontSize: '1rem',
                            lineHeight: 1,
                            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                          }}
                        >
                          {flags[cand as Language]}
                        </Text>
                      ))}
                    </Box>
                  )}
                </Box>
              </Group>
            );
          })}
        </Stack>
      </Box>
    );
  }
);

export default LanguageBoard;
