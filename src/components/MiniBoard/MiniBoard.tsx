import { FC, memo } from 'react';
import { SimpleGrid, Stack } from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import { getGuessStatuses, normalizeWord } from '../../utils/wordUtils';
import { MiniTile } from '../MiniTile/MiniTile';

interface MiniBoardProps {
  solutionWord: string;
  submittedGuesses: string[];
}

const MiniBoard: FC<MiniBoardProps> = memo(({ solutionWord, submittedGuesses }) => {
  const normalizedSolution = normalizeWord(solutionWord);
  const solutionIndex = submittedGuesses.indexOf(normalizedSolution);
  return (
    <Stack gap={4}>
      {Array.from({ length: MAX_GUESSES }).map((_, rowIndex) => {
        const guess = submittedGuesses[rowIndex];
        if (guess && (solutionIndex === -1 || rowIndex <= solutionIndex)) {
          const statuses = guess ? getGuessStatuses(guess, solutionWord) : Array(5).fill('empty');
          return (
            <SimpleGrid key={rowIndex} cols={5} spacing={4}>
              {statuses.map((status, colIndex) => (
                <MiniTile key={colIndex} status={status} />
              ))}
            </SimpleGrid>
          );
        }
        return (
          <SimpleGrid key={rowIndex} cols={5} spacing={4}>
            {Array.from({ length: 5 }).map((_, colIndex) => (
              <MiniTile key={colIndex} status="unknown" />
            ))}
          </SimpleGrid>
        );
      })}
    </Stack>
  );
});

export default MiniBoard;
