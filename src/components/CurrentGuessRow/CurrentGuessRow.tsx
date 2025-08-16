import { FC } from 'react';
import { SimpleGrid } from '@mantine/core';
import { LetterTile } from '../LetterTile/LetterTile';

interface CurrentGuessRowProps {
  guess: string[]; // Now an array
  cursorIndex: number;
  onTileClick: (index: number) => void;
}

export const CurrentGuessRow: FC<CurrentGuessRowProps> = ({ guess, cursorIndex, onTileClick }) => {
  return (
    <SimpleGrid cols={5} spacing="xs" style={{ width: '320px', margin: '20px auto' }}>
      {guess.map((letter, i) => (
        <LetterTile
          key={i}
          letter={letter}
          status="empty"
          hasCursor={i === cursorIndex}
          onClick={() => onTileClick(i)}
        />
      ))}
    </SimpleGrid>
  );
  // const letters = guess.padEnd(5, ' ').split('');

  // return (
  //   // Revert to a simple, fixed-width, centered style
  //   <SimpleGrid cols={5} spacing="xs" style={{ width: '320px', margin: '20px auto' }}>
  //     {letters.map((letter, index) => (
  //       <LetterTile key={index} letter={letter} status="empty" />
  //     ))}
  //   </SimpleGrid>
  // );
};
