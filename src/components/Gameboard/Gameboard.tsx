// import { FC, useState } from 'react';
// import { Box, Container, Group, SimpleGrid } from '@mantine/core';
// import { useWordPools } from '@/hooks/useWordPools';
// import { Language } from '@/types/firestore';
// import LanguageBoard from '../LanguageBoard/LanguageBoard';
// import MiniBoard from '../MiniBoard/MiniBoard';

// interface GameBoardProps {
//   solution: { [key: string]: string };
//   guesses: string[];
//   shuffledLanguages: Language[];
// }

// export const GameBoard: FC<GameBoardProps> = ({ solution, guesses, shuffledLanguages }) => {
//   const [activeIndex, setActiveIndex] = useState(1);
//   const { data: wordPools, isLoading: arePoolsLoading } = useWordPools({
//     en: 'advanced',
//     es: 'advanced',
//     fr: 'advanced',
//   });

//   if (arePoolsLoading || !wordPools) {
//     return <div>Loading...</div>;
//   }

//   return (
//     <Container size="lg" h="100%">
//       <Group hiddenFrom="md" h="100%" justify="center" align="center" wrap="nowrap" gap="xs">
//         {shuffledLanguages.map((lang, index) => {
//           const isActive = index === activeIndex;
//           const boardProps = {
//             solutionWord: solution[lang],
//             submittedGuesses: guesses,
//             words: wordPools.master[lang as Language],
//             language: lang,
//           };
//           return (
//             <Box
//               key={lang}
//               onClick={() => setActiveIndex(index)}
//               w={isActive ? 'auto' : 50} // Give inactive boards a fixed width
//               style={{
//                 flexGrow: isActive ? 1 : 0, // Allow the active board to expand
//                 flexShrink: 1,
//                 opacity: isActive ? 1 : 0.4,
//                 transition: 'all 0.2s ease-in-out',
//               }}
//             >
//               {isActive ? <LanguageBoard {...boardProps} /> : <MiniBoard {...boardProps} />}
//             </Box>
//           );
//         })}
//       </Group>

//       {/* Desktop-only Grid Layout */}
//       <SimpleGrid visibleFrom="md" cols={3} h="100%" spacing="xl" verticalSpacing={50}>
//         {shuffledLanguages.map((lang) => (
//           <LanguageBoard
//             key={lang}
//             language={lang}
//             solutionWord={solution[lang]}
//             submittedGuesses={guesses}
//             words={wordPools.master[lang as Language]}
//           />
//         ))}
//       </SimpleGrid>
//     </Container>
//   );
// };
import { FC, useState } from 'react';
import cx from 'clsx';
import { Box, Group } from '@mantine/core';
import { useWordPools } from '@/hooks/useWordPools';
import { Language } from '@/types/firestore';
import LanguageBoard from '../LanguageBoard/LanguageBoard';
import classes from './Gameboard.module.css';

interface GameBoardProps {
  solution: { [key: string]: string };
  guesses: string[];
  shuffledLanguages: Language[];
}

export const GameBoard: FC<GameBoardProps> = ({ solution, guesses, shuffledLanguages }) => {
  // 1. Add state to track which board is active
  const [activeIndex, setActiveIndex] = useState(1);
  const { data: wordPools, isLoading: arePoolsLoading } = useWordPools({
    en: 'advanced',
    es: 'advanced',
    fr: 'advanced',
  });

  if (arePoolsLoading || !wordPools) {
    return <div>Loading boards...</div>;
  }

  return (
    <Group
      className={classes.boardContainer}
      wrap="nowrap"
      gap="md"
      justify="center"
      align="center"
    >
      {shuffledLanguages.map((lang, index) => {
        // 2. Determine if the current board is the active one
        const isActive = index === activeIndex;

        return (
          // 3. Wrap each board in a clickable Box
          <Box
            key={lang}
            className={cx(classes.boardWrapper, { [classes.active]: isActive })}
            onClick={() => setActiveIndex(index)}
          >
            <LanguageBoard
              language={lang}
              solutionWord={solution[lang]}
              submittedGuesses={guesses}
              words={wordPools.master[lang as Language]}
            />
          </Box>
        );
      })}
    </Group>
  );
};
