import { FC } from 'react';
import { Box } from '@mantine/core';
import { LetterStatus } from '@/utils/wordUtils';
import classes from './LetterTile.module.css';

interface LetterTileProps {
  letter: string;
  status: LetterStatus;
}

export const LetterTile: FC<LetterTileProps> = ({ letter, status }) => {
  return (
    <Box className={classes.tile} data-status={status}>
      {letter}
    </Box>
  );
};
