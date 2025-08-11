import { FC, useState } from 'react';
import { Box, Container, Group, SimpleGrid } from '@mantine/core';
import LanguageBoard from '../LanguageBoard/LanguageBoard';
import MiniBoard from '../MiniBoard/MiniBoard';

interface GameBoardProps {
  solution: { [key: string]: string };
  guesses: string[];
  shuffledLanguages: string[];
  allWords: { [key: string]: string[] };
  maxGuesses: number;
}

export const GameBoard: FC<GameBoardProps> = ({
  solution,
  guesses,
  shuffledLanguages,
  allWords,
  maxGuesses,
}) => {
  const [activeIndex, setActiveIndex] = useState(1);
  return (
    <Container size="lg" h="100%">
      <Group hiddenFrom="md" h="100%" justify="center" align="center" wrap="nowrap" gap="xs">
        {shuffledLanguages.map((lang, index) => {
          const isActive = index === activeIndex;
          const boardProps = {
            solutionWord: solution[lang],
            submittedGuesses: guesses,
            words: allWords[lang],
            maxGuesses,
          };
          return (
            <Box
              key={lang}
              onClick={() => setActiveIndex(index)}
              w={isActive ? 'auto' : 50} // Give inactive boards a fixed width
              style={{
                flexGrow: isActive ? 1 : 0, // Allow the active board to expand
                flexShrink: 1,
                opacity: isActive ? 1 : 0.4,
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {isActive ? <LanguageBoard {...boardProps} /> : <MiniBoard {...boardProps} />}
            </Box>
          );
        })}
      </Group>

      {/* Desktop-only Grid Layout */}
      <SimpleGrid visibleFrom="md" cols={3} h="100%" spacing="xl" verticalSpacing={50}>
        {shuffledLanguages.map((lang) => (
          <LanguageBoard
            key={lang}
            solutionWord={solution[lang]}
            submittedGuesses={guesses}
            words={allWords[lang]}
            maxGuesses={maxGuesses}
          />
        ))}
      </SimpleGrid>
    </Container>
  );
};
