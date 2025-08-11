import { FC, useMemo } from 'react';
import { Box, Container, Group, Stack } from '@mantine/core';
import { getGuessStatuses, LetterStatus } from '@/utils/wordUtils';
import { AlphabetKey } from '../AlphabetKey/AlphabetKey';

interface AlphabetStatusProps {
  solution: { [key: string]: string } | null;
  guesses: string[];
  shuffledLanguages: string[];
}

export const AlphabetStatus: FC<AlphabetStatusProps> = ({
  solution,
  guesses,
  shuffledLanguages,
}) => {
  const alphabetLayout = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ];

  const letterStatusMap = useMemo(() => {
    const statuses: { [key: string]: LetterStatus[] } = {};
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';

    // 1. Initialize every letter with three 'empty' statuses.
    for (const letter of alphabet) {
      statuses[letter] = ['empty', 'empty', 'empty'];
    }

    if (!solution || !shuffledLanguages) {
      return statuses;
    }

    // 2. Loop through each language in the shuffled order.
    shuffledLanguages.forEach((langKey, langIndex) => {
      const solutionWord = solution[langKey];
      // 3. For each language, check all guesses made so far.
      guesses.forEach((guess) => {
        const guessResult = getGuessStatuses(guess, solutionWord);
        // 4. Update the status map for each letter in the guess.
        guess.split('').forEach((letter, letterIndex) => {
          const currentStatus = statuses[letter][langIndex];
          const newStatus = guessResult[letterIndex];

          // 5. Only upgrade a letter's status (correct > present > absent)
          if (newStatus === 'correct') {
            statuses[letter][langIndex] = 'correct';
          } else if (newStatus === 'present' && currentStatus !== 'correct') {
            statuses[letter][langIndex] = 'present';
          } else if (newStatus === 'absent' && currentStatus === 'empty') {
            statuses[letter][langIndex] = 'absent';
          }
        });
      });
    });

    return statuses;
  }, [guesses, solution, shuffledLanguages]);

  return (
    <Container my="xl">
      <Stack gap="sm">
        {alphabetLayout.map((row, rowIndex) => (
          <Group key={rowIndex} justify="center" gap="xs">
            {row.map((key) => {
              return (
                <Box key={key} w={45}>
                  <AlphabetKey
                    letter={key}
                    statuses={letterStatusMap[key] || ['empty', 'empty', 'empty']}
                  />
                </Box>
              );
            })}
          </Group>
        ))}
      </Stack>
    </Container>
  );
};
