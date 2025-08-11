import { FC, memo } from 'react';
import { SimpleGrid, Stack } from '@mantine/core';
import { getGuessStatuses } from '../../utils/wordUtils';
import { MiniTile } from '../MiniTile/MiniTile';

interface MiniBoardProps {
  solutionWord: string;
  submittedGuesses: string[];
  maxGuesses: number;
}

const MiniBoard: FC<MiniBoardProps> = memo(({ solutionWord, submittedGuesses, maxGuesses }) => {
  return (
    <Stack gap={4}>
      {Array.from({ length: maxGuesses }).map((_, rowIndex) => {
        const guess = submittedGuesses[rowIndex];
        const statuses = guess ? getGuessStatuses(guess, solutionWord) : Array(5).fill('empty');
        return (
          <SimpleGrid key={rowIndex} cols={5} spacing={4}>
            {statuses.map((status, colIndex) => (
              <MiniTile key={colIndex} status={status} />
            ))}
          </SimpleGrid>
        );
      })}
    </Stack>
  );
});

export default MiniBoard;
