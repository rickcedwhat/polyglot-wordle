import { useCallback, useEffect, useState } from 'react';
import { Box, Center, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { GameBoard } from '@/components/Gameboard/Gameboard';
import { MAX_GUESSES } from '@/config';
import { useScore } from '@/context/ScoreContext';
import { useSidebar } from '@/context/SidebarContext';
import { useLetterStatus } from '@/hooks/useLetterStatus';
import { useWordPools } from '@/hooks/useWordPools';
import type { GameDoc } from '@/types/firestore.d.ts';
import { normalizeWord } from '@/utils/wordUtils';
import { AlphabetStatus } from '../AlphabetStatus/AlphabetStatus';
import { CurrentGuessRow } from '../CurrentGuessRow/CurrentGuessRow';
import { GameOver } from '../GameOver/GameOver';
import { Score } from '../Score/Score';

// Define the props the component will receive
interface GameProps {
  gameSession: GameDoc;
  updateGuessHistory: (guess: string) => Promise<void>;
  endGame: (result: { isWin: boolean; score: number }) => Promise<void>;
}

export function Game({ gameSession, updateGuessHistory, endGame }: GameProps) {
  // 1. Get the core game state and solution from the session prop
  const { words: solution, difficulties, guessHistory, shuffledLanguages } = gameSession;
  const [gameOverOpened, { open: openGameOver, close: closeGameOver }] = useDisclosure(false);
  const { recalculateScore } = useScore();
  const { updateLetterStatuses } = useLetterStatus();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const { data: wordPools, isLoading: arePoolsLoading } = useWordPools(difficulties);
  const [guesses, setGuesses] = useState<string[]>(guessHistory);
  const [currentGuess, setCurrentGuess] = useState<string[]>(Array(5).fill(''));
  const [cursorIndex, setCursorIndex] = useState(0);
  const [isInvalidGuess, setIsInvalidGuess] = useState(false);
  const { setSidebarContent } = useSidebar();

  useEffect(() => {
    setSidebarContent(<Score />);
    return () => setSidebarContent(null);
  }, [setSidebarContent]);

  useEffect(() => {
    // This effect now syncs all state when the game session loads
    if (guessHistory && solution) {
      // 1. Recalculate the score based on the loaded history
      recalculateScore(guessHistory, solution);

      // 2. ALSO, update the letter statuses based on the loaded history
      updateLetterStatuses({ guesses: guessHistory, solution, shuffledLanguages });
    }
  }, [guessHistory, solution, recalculateScore, updateLetterStatuses]);

  const getInitialGameStatus = () => {
    if (!gameSession.isLiveGame) {
      return gameSession.isWin ? 'won' : 'lost';
    }
    return 'playing';
  };
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>(getInitialGameStatus());

  const handleTileClick = (index: number) => {
    setCursorIndex(index);
  };

  useEffect(() => {
    if (gameStatus !== 'playing') {
      openGameOver();
    }
  }, [gameStatus, openGameOver]);

  const handleKeyPress = useCallback(
    async (key: string) => {
      if (gameStatus !== 'playing') {
        return;
      }

      const lowerKey = key.toLowerCase();
      setActiveKey(null);
      setTimeout(() => {
        setActiveKey(lowerKey);
      }, 10);

      if (lowerKey === 'enter') {
        const guessString = currentGuess.join('');
        if (guessString.length !== 5 || guesses.length >= MAX_GUESSES) {
          return;
        }

        // Ensure wordPools have loaded before allowing a guess to be submitted
        if (!wordPools) {
          console.error('Word validation lists are not available yet.');
          return;
        }

        const isValid =
          (wordPools.master.en.some((word) => normalizeWord(word) === guessString) ||
            wordPools.master.es.some((word) => normalizeWord(word) === guessString) ||
            wordPools.master.fr.some((word) => normalizeWord(word) === guessString)) &&
          guessHistory.includes(guessString) === false;

        if (isValid) {
          const newGuesses = [...guesses, guessString];
          setGuesses(newGuesses);
          setCurrentGuess(Array(5).fill(''));
          setCursorIndex(0);
          await updateGuessHistory(guessString);
          updateLetterStatuses({ guesses: newGuesses, solution, shuffledLanguages });

          const finalScore = recalculateScore(newGuesses, solution);

          const enSolved = newGuesses.includes(normalizeWord(solution.en));
          const esSolved = newGuesses.includes(normalizeWord(solution.es));
          const frSolved = newGuesses.includes(normalizeWord(solution.fr));
          const allSolutionsFound = enSolved && esSolved && frSolved;

          if (allSolutionsFound) {
            setGameStatus('won');
            await endGame({ isWin: true, score: finalScore });
          } else if (newGuesses.length >= MAX_GUESSES) {
            setGameStatus('lost');
            await endGame({ isWin: false, score: finalScore });
          }
        } else {
          // not a valid word or was already used before
          // add animation
          setIsInvalidGuess(true);
          setTimeout(() => {
            setIsInvalidGuess(false);
          }, 500);
        }
      } else if (lowerKey === 'del' || lowerKey === 'backspace') {
        const newGuess = [...currentGuess];
        const newCursorIndex = Math.max(0, cursorIndex - 1);
        newGuess[newCursorIndex] = ''; // Clear the character at the new cursor position
        setCurrentGuess(newGuess);
        setCursorIndex(newCursorIndex);
      } else if (cursorIndex < 5 && /^[a-z]$/.test(lowerKey)) {
        const newGuess = [...currentGuess];
        newGuess[cursorIndex] = lowerKey; // Insert letter at the cursor
        setCurrentGuess(newGuess);
        setCursorIndex(Math.min(5, cursorIndex + 1)); // Move cursor forward
      }
    },
    [currentGuess, cursorIndex, gameStatus, guesses]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent the default browser action for some keys
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
      }

      // Handle cursor movement
      if (event.key === 'ArrowLeft') {
        setCursorIndex((prev) => Math.max(0, prev - 1));
        return; // Stop after handling
      }
      if (event.key === 'ArrowRight') {
        setCursorIndex((prev) => Math.min(5, prev + 1));
        return; // Stop after handling
      }

      if (event.key === 'Delete') {
        event.preventDefault();
        const newGuess = [...currentGuess];
        // Use splice to remove the character at the cursor's position
        if (cursorIndex < 5) {
          newGuess.splice(cursorIndex, 1);
          // Add an empty string to the end to keep the array's length at 5
          newGuess.push('');
        }
        setCurrentGuess(newGuess);
        return; // Stop after handling
      }

      // Delegate other keys to your main handler
      const { key } = event;
      if (key === 'Enter') {
        handleKeyPress('enter');
      } else if (key === 'Backspace') {
        handleKeyPress('del');
      } else if (key.length === 1 && key.match(/[a-z]/i)) {
        handleKeyPress(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]); // The dependencies are correct

  // Render a loading state while the static word pools are being fetched
  if (arePoolsLoading) {
    return (
      <Center style={{ height: '80vh' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Box
      style={{
        position: 'relative',
        display: 'grid',
        gridTemplateRows: '1fr auto',
        height: '100%',
      }}
    >
      <GameOver
        opened={gameOverOpened}
        onClose={closeGameOver}
        status={gameStatus === 'playing' ? 'won' : gameStatus}
      />

      <Center style={{ overflow: 'visible' }}>
        <GameBoard solution={solution} guesses={guesses} shuffledLanguages={shuffledLanguages} />
      </Center>
      <CurrentGuessRow
        guess={currentGuess}
        cursorIndex={cursorIndex}
        onTileClick={handleTileClick}
        isInvalid={isInvalidGuess}
      />
      <AlphabetStatus activeKey={activeKey} onKeyPress={handleKeyPress} />
    </Box>
  );
}
