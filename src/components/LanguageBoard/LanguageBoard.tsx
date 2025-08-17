import { FC, memo } from 'react';
import { Box, Group, Stack } from '@mantine/core';
import { getGuessStatuses, normalizeWord } from '../../utils/wordUtils';
import { LetterTile } from '../LetterTile/LetterTile';
import classes from './LanguageBoard.module.css'; // Import the new CSS

interface LanguageBoardProps {
  solutionWord: string;
  submittedGuesses: string[];
  words: string[]; // This prop is needed for the validation check
  maxGuesses: number;
}

const LanguageBoard: FC<LanguageBoardProps> = memo(
  ({ solutionWord, submittedGuesses, words, maxGuesses }) => {
    const normalizedSolution = normalizeWord(solutionWord);
    const solutionIndex = submittedGuesses.indexOf(normalizedSolution);

    return (
      <Box h="100%" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Stack gap="xs" maw={320} mx="auto">
          {Array.from({ length: maxGuesses }).map((_, rowIndex) => {
            const submittedGuess = submittedGuesses[rowIndex];

            if (submittedGuess && (solutionIndex === -1 || rowIndex <= solutionIndex)) {
              const statuses = getGuessStatuses(submittedGuess, normalizedSolution);
              const matchingWord = words.find((word) => normalizeWord(word) === submittedGuess);
              const languageMatch = !!matchingWord;

              // If there's a matching word in the language, display it; otherwise, show the submitted guess (necessary for accented words)
              const displayGuess = matchingWord || submittedGuess;

              return (
                // This wrapper div gets the underline style when the word matches the language
                <div key={rowIndex} className={languageMatch ? classes.languageMatch : ''}>
                  <Group gap="xs" wrap="nowrap">
                    {displayGuess.split('').map((letter, colIndex) => (
                      <Box key={colIndex} style={{ flex: 1 }}>
                        <LetterTile letter={letter} status={statuses[colIndex]} />
                      </Box>
                    ))}
                  </Group>
                </div>
              );
            }

            // Render an empty row
            return (
              <Group key={rowIndex} gap="xs" wrap="nowrap">
                {Array.from({ length: 5 }).map((_, colIndex) => (
                  <Box key={colIndex} style={{ flex: 1 }}>
                    <LetterTile letter=" " status="unknown" />
                  </Box>
                ))}
              </Group>
            );
          })}
        </Stack>
      </Box>
    );
  }
);

export default LanguageBoard;
