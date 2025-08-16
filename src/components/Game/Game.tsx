import { useCallback, useEffect, useState } from 'react';
import { Box, Center, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { GameBoard } from '@/components/Gameboard/Gameboard';
import { useScore } from '@/context/ScoreContext';
import { useWordPools } from '@/hooks/useWordPools';
import type { GameDoc } from '@/types/firestore.d.ts';
import { calculateScoreFromHistory, getScoreForTurn, normalizeWord } from '@/utils/wordUtils';
import { AlphabetStatus } from '../AlphabetStatus/AlphabetStatus';
import { CurrentGuessRow } from '../CurrentGuessRow/CurrentGuessRow';
import { GameOver } from '../GameOver/GameOver';

// Define the props the component will receive
interface GameProps {
  gameSession: GameDoc;
  updateGuessHistory: (guess: string) => Promise<void>;
  endGame: (result: { isWin: boolean }) => Promise<void>;
}

const MAX_GUESSES = 10;

export function Game({ gameSession, updateGuessHistory, endGame }: GameProps) {
  // 1. Get the core game state and solution from the session prop
  const { words: solution, difficulties, guessHistory } = gameSession;
  const [gameOverOpened, { open: openGameOver, close: closeGameOver }] = useDisclosure(false);
  const { setScore } = useScore();

  useEffect(() => {
    if (guessHistory && solution) {
      const initialScore = calculateScoreFromHistory(guessHistory, solution);
      setScore(initialScore);
    }
    // Run this only when the component first loads with the session data
  }, [gameSession, setScore]);

  const [activeKey, setActiveKey] = useState<string | null>(null); // 1. Add activeKey state

  // 2. Fetch the validation word lists from our globally cached hook
  const { data: wordPools, isLoading: arePoolsLoading } = useWordPools(difficulties);

  // 3. Initialize local UI state from the session
  const [guesses, setGuesses] = useState<string[]>(guessHistory);
  const [currentGuess, setCurrentGuess] = useState<string[]>(Array(5).fill(''));
  const [cursorIndex, setCursorIndex] = useState(0);

  // 4. Derive the game status from the session
  const getInitialGameStatus = () => {
    if (!gameSession.isLiveGame) {
      return gameSession.isWin ? 'won' : 'lost';
    }
    return 'playing';
  };
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>(getInitialGameStatus());
  const [scoredGreenSlots, setScoredGreenSlots] = useState({
    en: [false, false, false, false, false],
    es: [false, false, false, false, false],
    fr: [false, false, false, false, false],
  });

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

        const normalizedGuess = normalizeWord(guessString);
        const isValid =
          wordPools.en.some((word) => normalizeWord(word) === normalizedGuess) ||
          wordPools.es.some((word) => normalizeWord(word) === normalizedGuess) ||
          wordPools.fr.some((word) => normalizeWord(word) === normalizedGuess);

        if (isValid) {
          const newGuesses = [...guesses, normalizedGuess];
          setGuesses(newGuesses);
          setCurrentGuess(Array(5).fill(''));
          setCursorIndex(0);

          const guessNumber = newGuesses.length;

          // 3. Calculate score for just this turn
          const { turnScore, updatedScoredSlots } = getScoreForTurn(
            normalizedGuess,
            solution,
            guessNumber,
            scoredGreenSlots
          );

          // 4. Update state incrementally
          setScore((prevScore) => prevScore + turnScore);
          setScoredGreenSlots(updatedScoredSlots);

          await updateGuessHistory(normalizedGuess);

          const enSolved = newGuesses.includes(normalizeWord(solution.en));
          const esSolved = newGuesses.includes(normalizeWord(solution.es));
          const frSolved = newGuesses.includes(normalizeWord(solution.fr));
          const allSolutionsFound = enSolved && esSolved && frSolved;

          if (allSolutionsFound) {
            const finalBonus = 25 * (11 - guessNumber);
            setScore((prevScore) => prevScore + finalBonus);
            setGameStatus('won');
            await endGame({ isWin: true });
          } else if (newGuesses.length >= MAX_GUESSES) {
            let penalty = 0;
            if (!enSolved) {
              penalty -= 250;
            }
            if (!esSolved) {
              penalty -= 250;
            }
            if (!frSolved) {
              penalty -= 250;
            }
            setScore((prevScore) => prevScore + penalty);
            setGameStatus('lost');
            await endGame({ isWin: false });
          }
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
    [currentGuess, cursorIndex, gameStatus, guesses, scoredGreenSlots]
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
        const newGuess = [...currentGuess];
        // Clear the character at the current cursor position
        if (cursorIndex < 5) {
          newGuess[cursorIndex] = '';
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

  // Derive an array of language keys for the boards
  const shuffledLanguages = Object.keys(solution);

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
        score={guesses.length}
      />

      <Center style={{ overflow: 'hidden' }}>
        <GameBoard
          solution={solution}
          guesses={guesses}
          shuffledLanguages={shuffledLanguages}
          maxGuesses={MAX_GUESSES}
        />
      </Center>
      <CurrentGuessRow
        guess={currentGuess}
        cursorIndex={cursorIndex}
        onTileClick={handleTileClick}
      />
      <AlphabetStatus
        activeKey={activeKey}
        guesses={guesses}
        solution={solution}
        shuffledLanguages={shuffledLanguages}
        onKeyPress={handleKeyPress}
      />
    </Box>
  );
}
