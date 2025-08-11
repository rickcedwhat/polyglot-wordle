// import { FC, memo } from 'react';
// import { Box, SimpleGrid } from '@mantine/core';
// import { getGuessStatuses } from '../../utils/wordUtils';
// import { LetterTile } from '../LetterTile/LetterTile';

// interface LanguageBoardProps {
//   solutionWord: string;
//   submittedGuesses: string[];
//   words: string[];
// }

// const maxGuesses = 10;

// const LanguageBoard: FC<LanguageBoardProps> = memo(({ solutionWord, submittedGuesses, words }) => {
//   const solutionIndex = submittedGuesses.indexOf(solutionWord);

//   return (
//     <Box h="100%" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
//       <SimpleGrid cols={5} spacing="xs" style={{ width: '200px', margin: '20px auto' }}>
//         {Array.from({ length: maxGuesses }).map((_, rowIndex) => {
//           const submittedGuess = submittedGuesses[rowIndex];

//           if (submittedGuess && (solutionIndex === -1 || rowIndex <= solutionIndex)) {
//             const statuses = getGuessStatuses(submittedGuess, solutionWord);
//             const languageMatch = words.includes(submittedGuess);
//             return submittedGuess
//               .split('')
//               .map((letter, colIndex) => (
//                 <LetterTile
//                   key={`${rowIndex}-${colIndex}`}
//                   letter={letter}
//                   status={statuses[colIndex]}
//                 />
//               ));
//           }

//           return Array.from({ length: 5 }).map((__, colIndex) => (
//             <LetterTile key={`${rowIndex}-${colIndex}`} letter="" status="empty" />
//           ));
//         })}
//       </SimpleGrid>
//     </Box>
//   );
// });

// export default LanguageBoard;

import { FC, memo } from 'react';
import { normalize } from 'path';
import { Box, Group, Stack } from '@mantine/core';
import { getGuessStatuses, normalizeWord } from '../../utils/wordUtils';
import { LetterTile } from '../LetterTile/LetterTile';
import classes from './LanguageBoard.module.css'; // Import the new CSS

interface LanguageBoardProps {
  solutionWord: string;
  submittedGuesses: string[];
  words: string[]; // This prop is needed for the validation check
}

const maxGuesses = 10;

const LanguageBoard: FC<LanguageBoardProps> = memo(({ solutionWord, submittedGuesses, words }) => {
  const normalizedSolution = normalizeWord(solutionWord);
  const solutionIndex = submittedGuesses.indexOf(normalizedSolution);

  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Stack gap="xs" maw={320} mx="auto">
        {Array.from({ length: maxGuesses }).map((_, rowIndex) => {
          const submittedGuess = submittedGuesses[rowIndex];

          if (submittedGuess && (solutionIndex === -1 || rowIndex <= solutionIndex)) {
            const statuses = getGuessStatuses(submittedGuess, normalizedSolution);
            const matchingWord = words.find((word) => normalizeWord(word) === submittedGuess);
            const languageMatch = !!matchingWord;

            // If there's a matching word in the language, display it; otherwise, show the submitted guess (necessary for accented words)
            const displayGuess = matchingWord || submittedGuess;

            return (
              // This wrapper div gets the underline style when the word matches the language
              <div key={rowIndex} className={languageMatch ? classes.languageMatch : ''}>
                <Group gap="xs" wrap="nowrap">
                  {displayGuess.split('').map((letter, colIndex) => (
                    <Box key={colIndex} style={{ flex: 1 }}>
                      <LetterTile letter={letter} status={statuses[colIndex]} />
                    </Box>
                  ))}
                </Group>
              </div>
            );
          }

          // Render an empty row
          return (
            <Group key={rowIndex} gap="xs" wrap="nowrap">
              {Array.from({ length: 5 }).map((_, colIndex) => (
                <Box key={colIndex} style={{ flex: 1 }}>
                  <LetterTile letter=" " status="empty" />
                </Box>
              ))}
            </Group>
          );
        })}
      </Stack>
    </Box>
  );
});

export default LanguageBoard;
