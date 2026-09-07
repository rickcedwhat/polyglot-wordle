import { FC } from 'react';
import { SimpleGrid } from '@mantine/core';
import { useLetterStatus } from '@/hooks/useLetterStatus';
import { LetterTile } from '../LetterTile/LetterTile';
import classes from './CurrentGuessRow.module.css';

interface CurrentGuessRowProps {
  guess: string[]; // Now an array
  cursorIndex: number;
  onTileClick: (index: number) => void;
  isInvalid?: boolean;
}

export const CurrentGuessRow: FC<CurrentGuessRowProps> = ({
  guess,
  cursorIndex,
  onTileClick,
  isInvalid,
}) => {
  const { letterStatusMap } = useLetterStatus();

  const rowClassName = `${classes.row} ${isInvalid ? classes.shake : ''}`;

  return (
    <SimpleGrid
      className={rowClassName}
      cols={5}
      spacing="xs"
      style={{ width: '320px', margin: '20px auto' }}
    >
      {guess.map((letter, i) => {
        const isAbsentEverywhere =
          letter && letterStatusMap[letter]?.every((langStatus) => langStatus === 'absent');
        const letterStatus = isAbsentEverywhere ? 'absent' : 'unknown';

        return (
          <LetterTile
            key={i}
            letter={letter}
            isEmpty={!letter}
            status={letterStatus}
            hasCursor={i === cursorIndex}
            onClick={() => onTileClick(i)}
          />
        );
      })}
    </SimpleGrid>
  );
};
