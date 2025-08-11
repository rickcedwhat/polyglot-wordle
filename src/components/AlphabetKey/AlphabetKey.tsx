import { FC } from 'react';
import { Box } from '@mantine/core';
import { LetterStatus } from '@/utils/wordUtils';
import classes from './AlphabetKey.module.css';

interface AlphabetKeyProps {
  letter: string;
  statuses: LetterStatus[];
}

export const AlphabetKey: FC<AlphabetKeyProps> = ({ letter, statuses }) => {
  return (
    <Box className={classes.key}>
      <div className={classes.dotsContainer}>
        {statuses.map((status, index) => (
          <div key={index} className={classes.dot} data-status={status} />
        ))}
      </div>
      {letter}
    </Box>
  );
};
