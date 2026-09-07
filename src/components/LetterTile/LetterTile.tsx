import { FC } from 'react';
import { Box } from '@mantine/core';
import { LetterStatus } from '@/utils/wordUtils';
import classes from './LetterTile.module.css';

interface LetterTileProps {
  letter: string;
  status: LetterStatus;
  hasCursor?: boolean;
  onClick?: () => void;
  isEmpty?: boolean;
}

export const LetterTile: FC<LetterTileProps> = ({
  letter,
  status,
  hasCursor,
  onClick,
  isEmpty,
}) => {
  const tileClassName = `
    ${classes.tile}
    ${isEmpty ? classes.empty : ''}
    ${onClick ? classes.clickable : ''}
  `;
  return (
    <Box
      className={tileClassName}
      data-status={status}
      onClick={onClick}
      data-has-cursor={hasCursor}
    >
      {letter}
    </Box>
  );
};
