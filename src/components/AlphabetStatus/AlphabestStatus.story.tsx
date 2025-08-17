// import { useCallback, useEffect, useState } from 'react';
// import type { Meta, StoryObj } from '@storybook/react';
// import { Box, Button, Text } from '@mantine/core';
// import { AlphabetStatus } from './AlphabetStatus';

// const meta: Meta<typeof AlphabetStatus> = {
//   title: 'Game/AlphabetStatus',
//   component: AlphabetStatus,
//   tags: ['autodocs'],
//   // 1. Configure the props that can be edited in the Controls panel
//   argTypes: {
//     guesses: {
//       control: 'object',
//       description: 'Set the starting list of submitted guesses.',
//     },
//     solution: {
//       control: 'object',
//       description: 'Set the solution words for the three languages.',
//     },
//     onKeyPress: {
//       table: {
//         disable: true,
//       },
//     },
//     shuffledLanguages: {
//       table: {
//         disable: true,
//       },
//     },
//     activeKey: {
//       table: {
//         disable: true,
//       },
//     },
//   },
// };

// export default meta;
// type Story = StoryObj<typeof AlphabetStatus>;

// interface HarnessProps {
//   initialGuesses: string[];
//   solution: {
//     en: string;
//     es: string;
//     fr: string;
//   };
// }

// // A helper component to manage the story's state
// const InteractiveKeyboardHarness = ({ initialGuesses = [], solution }: HarnessProps) => {
//   const [guesses, setGuesses] = useState<string[]>(initialGuesses);
//   const [currentGuess, setCurrentGuess] = useState('');
//   const [activeKey, setActiveKey] = useState<string | null>(null);

//   // When the controls change, reset the story's state to the new initial values
//   useEffect(() => {
//     setGuesses(initialGuesses);
//   }, [initialGuesses]);

//   const handleKeyPress = useCallback(
//     (key: string) => {
//       const lowerKey = key.toLowerCase();
//       setActiveKey(null);
//       setTimeout(() => setActiveKey(lowerKey), 10);

//       if (lowerKey === 'enter' && currentGuess.length === 5) {
//         setGuesses((prev) => [...prev, currentGuess]);
//         setCurrentGuess('');
//       } else if (lowerKey === 'del' || lowerKey === 'backspace') {
//         setCurrentGuess((prev) => prev.slice(0, -1));
//       } else if (currentGuess.length < 5 && key.length === 1) {
//         setCurrentGuess((prev) => prev + lowerKey);
//       }
//     },
//     [currentGuess]
//   );

//   const handleReset = () => {
//     setGuesses([]);
//     setCurrentGuess('');
//   };

//   useEffect(() => {
//     const handleKeyDown = (event: KeyboardEvent) => {
//       const { key } = event;
//       if (key === 'Enter') {
//         handleKeyPress('enter');
//       } else if (key === 'Backspace') {
//         handleKeyPress('del');
//       } else if (key.length === 1 && key.match(/[a-z]/i)) {
//         handleKeyPress(key);
//       }
//     };
//     window.addEventListener('keydown', handleKeyDown);
//     return () => window.removeEventListener('keydown', handleKeyDown);
//   }, [handleKeyPress]);

//   return (
//     <Box>
//       <Box p="md" mb="xl" style={{ border: '1px solid #ccc', borderRadius: '4px' }}>
//         <Text>
//           <strong>Current Guess:</strong> {currentGuess.padEnd(5, '_')}
//         </Text>
//         <Text>
//           <strong>Submitted Guesses:</strong> {JSON.stringify(guesses)}
//         </Text>
//         <Text size="xs" c="dimmed" mt="xs">
//           Type or click the keyboard. Edit props in the Controls panel below.
//         </Text>
//         <Button onClick={handleReset} variant="outline" size="xs" mt="sm">
//           Reset History
//         </Button>
//       </Box>
//       <AlphabetStatus onKeyPress={handleKeyPress} activeKey={activeKey} />
//     </Box>
//   );
// };

// export const Interactive: Story = {
//   name: 'Interactive Playground',
//   // 2. The render function receives the args from the Controls panel
//   render: (args) => {
//     const { guesses, solution } = args;
//     return (
//       <InteractiveKeyboardHarness
//         initialGuesses={guesses}
//         solution={solution as { en: string; es: string; fr: string }}
//       />
//     );
//   },
//   args: {
//     guesses: [],
//     solution: {
//       en: 'apple',
//       es: 'audio',
//       fr: 'fruit',
//     },
//   },
// };
