import { FC } from 'react';
import { Container, SimpleGrid } from '@mantine/core';
import LanguageBoard from '../LanguageBoard/LanguageBoard';

interface GameBoardProps {
  solution: { [key: string]: string };
  guesses: string[];
  shuffledLanguages: string[];
  allWords: { [key: string]: string[] };
}

export const GameBoard: FC<GameBoardProps> = ({
  solution,
  guesses,
  shuffledLanguages,
  allWords,
}) => {
  return (
    <Container size="lg" h="100%" style={{ display: 'flex', alignItems: 'center' }}>
      <SimpleGrid
        cols={shuffledLanguages.length}
        spacing="3rem"
        verticalSpacing="xl"
        style={{ width: '100%' }}
        h="100%"
      >
        {shuffledLanguages.map((lang) => (
          <LanguageBoard
            key={lang}
            solutionWord={solution[lang]}
            submittedGuesses={guesses}
            words={allWords[lang]}
          />
        ))}
      </SimpleGrid>
    </Container>
  );
};
