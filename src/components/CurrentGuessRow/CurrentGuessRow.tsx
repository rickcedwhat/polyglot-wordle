import { FC } from 'react';
import { SimpleGrid } from '@mantine/core';
import { LetterTile } from '../LetterTile/LetterTile';

interface CurrentGuessRowProps {
  guess: string;
}

export const CurrentGuessRow: FC<CurrentGuessRowProps> = ({ guess }) => {
  const letters = guess.padEnd(5, ' ').split('');

  return (
    // Revert to a simple, fixed-width, centered style
    <SimpleGrid cols={5} spacing="xs" style={{ width: '320px', margin: '20px auto' }}>
      {letters.map((letter, index) => (
        <LetterTile key={index} letter={letter} status="empty" />
      ))}
    </SimpleGrid>
  );
};
