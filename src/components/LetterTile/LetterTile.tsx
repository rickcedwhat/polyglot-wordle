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
  /** Briefly show these points on the tile before revealing the letter. */
  points?: number;
  revealDelayMs?: number;
}

export const LetterTile: FC<LetterTileProps> = ({
  letter,
  status,
  hasCursor,
  onClick,
  isEmpty,
  points,
  revealDelayMs = 0,
}) => {
  const isScored = points != null && points > 0;
  const tileClassName = `
    ${classes.tile}
    ${isEmpty ? classes.empty : ''}
    ${onClick ? classes.clickable : ''}
    ${isScored ? classes.scored : ''}
  `;
  return (
    <Box
      className={tileClassName}
      data-status={status}
      onClick={onClick}
      data-has-cursor={hasCursor}
      style={isScored ? { animationDelay: `${revealDelayMs}ms` } : undefined}
    >
      {isScored ? (
        <>
          <span className={classes.pointsLayer} style={{ animationDelay: `${revealDelayMs}ms` }}>
            +{points}
          </span>
          <span className={classes.letterLayer} style={{ animationDelay: `${revealDelayMs}ms` }}>
            {letter}
          </span>
        </>
      ) : (
        letter
      )}
    </Box>
  );
};
