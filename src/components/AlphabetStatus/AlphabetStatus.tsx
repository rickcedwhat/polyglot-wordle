import { FC, useMemo } from 'react';
import { Box, Container, Group, Stack } from '@mantine/core';
import { getGuessStatuses, LetterStatus } from '@/utils/wordUtils';
import { AlphabetKey } from '../AlphabetKey/AlphabetKey';

interface AlphabetStatusProps {
  solution: { [key: string]: string } | null;
  guesses: string[];
  shuffledLanguages: string[];
  onKeyPress: (key: string) => void;
}

export const AlphabetStatus: FC<AlphabetStatusProps> = ({
  solution,
  guesses,
  shuffledLanguages,
  onKeyPress,
}) => {
  const topRow = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
  const middleRow = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
  const bottomRow = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

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
    <Container my="xl" p={0} w="100%" style={{ maxWidth: 600 }}>
      <Stack gap={8}>
        {/* Top Row (Q-P) */}
        <Group gap="1.5%" wrap="nowrap">
          {topRow.map((key) => (
            <Box key={key} style={{ flex: 1 }}>
              <AlphabetKey
                onClick={() => onKeyPress(key)}
                letter={key}
                statuses={letterStatusMap[key] || ['empty', 'empty', 'empty']}
              />
            </Box>
          ))}
        </Group>

        {/* Middle Row (A-L) with Spacers */}
        <Group gap="1.5%" wrap="nowrap">
          {middleRow.map((key) => (
            <Box key={key} style={{ flex: 1 }}>
              <AlphabetKey
                onClick={() => onKeyPress(key)}
                letter={key}
                statuses={letterStatusMap[key] || ['empty', 'empty', 'empty']}
              />
            </Box>
          ))}
          <Box style={{ flex: 1.5 }}>
            <AlphabetKey onClick={() => onKeyPress('enter')} letter="⏎" />
          </Box>
        </Group>

        {/* Bottom Row (Z-M) with Spacers */}
        <Group gap="1.5%" wrap="nowrap">
          {bottomRow.map((key) => (
            <Box key={key} style={{ flex: 1 }}>
              <AlphabetKey
                onClick={() => onKeyPress(key)}
                letter={key}
                statuses={letterStatusMap[key] || ['empty', 'empty', 'empty']}
              />
            </Box>
          ))}
          <Box style={{ flex: 1 }}>
            <AlphabetKey onClick={() => onKeyPress('del')} letter="←" />
          </Box>
        </Group>
      </Stack>
    </Container>
  );
};
