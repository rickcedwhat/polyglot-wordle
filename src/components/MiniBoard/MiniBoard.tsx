import { FC, memo } from 'react';
import { Box, Group, Stack } from '@mantine/core'; // 1. Use Group instead of SimpleGrid
import { MAX_GUESSES } from '@/config';
import { getGuessStatuses, normalizeWord } from '../../utils/wordUtils';
import { MiniTile } from '../MiniTile/MiniTile';
import classes from './MiniBoard.module.css';

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
            // 2. Use a Group for the row
            <Group key={rowIndex} gap={4} wrap="nowrap">
              {statuses.map((status, colIndex) => (
                <Box key={colIndex} className={classes.miniTileWrapper}>
                  <MiniTile key={colIndex} status={status} />
                </Box>
              ))}
            </Group>
          );
        }

        // Also use a Group for the empty rows
        return (
          <Group key={rowIndex} gap={4} wrap="nowrap">
            {Array.from({ length: 5 }).map((_, colIndex) => (
              <Box key={colIndex} className={classes.miniTileWrapper}>
                <MiniTile key={colIndex} status="unknown" />
              </Box>
            ))}
          </Group>
        );
      })}
    </Stack>
  );
});

export default MiniBoard;
