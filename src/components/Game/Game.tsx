import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Center, Loader } from '@mantine/core';
import { GameBoard } from '@/components/Gameboard/Gameboard';
import { normalizeWord } from '@/utils/wordUtils';
import { AlphabetStatus } from '../AlphabetStatus/AlphabetStatus';
import { CurrentGuessRow } from '../CurrentGuessRow/CurrentGuessRow';

const MAX_GUESSES = 10;

// This component no longer needs to receive any props.
export function Game() {
  const { uuid } = useParams<{ uuid: string }>();

  // 1. State for the solution, loading, and errors now lives here.
  const [solution, setSolution] = useState<{ [key: string]: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [shuffledLanguages, setShuffledLanguages] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [allWords, setAllWords] = useState<{ en: string[]; es: string[]; fr: string[] }>({
    en: [],
    es: [],
    fr: [],
  });

  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');

  // 2. The data-fetching logic is now inside the Game component.
  useEffect(() => {
    const fetchWords = async () => {
      if (!uuid) {
        return;
      }

      try {
        // 1. Clean the UUID by removing all hyphens.
        const cleanUuid = uuid.replace(/-/g, '');

        const [enRes, esRes, frRes] = await Promise.all([
          fetch('/en.json'),
          fetch('/es.json'),
          fetch('/fr.json'),
        ]);

        const [enWords, esWords, frWords] = await Promise.all([
          enRes.json(),
          esRes.json(),
          frRes.json(),
        ]);

        setAllWords({ en: enWords, es: esWords, fr: frWords });

        const enHex = cleanUuid.substring(0, 8);
        const esHex = cleanUuid.substring(8, 16);
        const frHex = cleanUuid.substring(16, 24);

        const languages = ['en', 'es', 'fr'];
        const sortSeed = parseInt(cleanUuid.substring(24, 32), 16) || 0;

        const deterministicallyShuffled = [...languages].sort((a, b) => {
          const valA = (a.charCodeAt(0) + sortSeed) % languages.length;
          const valB = (b.charCodeAt(0) + sortSeed) % languages.length;
          return valA - valB;
        });

        setShuffledLanguages(deterministicallyShuffled);

        // 3. Apply a formula to guarantee the index is never negative.
        const enIndex = ((parseInt(enHex, 16) % enWords.length) + enWords.length) % enWords.length;
        const esIndex = ((parseInt(esHex, 16) % esWords.length) + esWords.length) % esWords.length;
        const frIndex = ((parseInt(frHex, 16) % frWords.length) + frWords.length) % frWords.length;

        setSolution({
          en: enWords[enIndex],
          es: esWords[esIndex],
          fr: frWords[frIndex],
        });
      } catch (e) {
        setError('Failed to load word lists.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchWords();
  }, [uuid]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (gameStatus !== 'playing') {
        return;
      }
      if (key === 'enter') {
        if (currentGuess.length === 5 && guesses.length < MAX_GUESSES) {
          const isValid =
            allWords.en.some((word) => normalizeWord(word) === currentGuess) ||
            allWords.es.some((word) => normalizeWord(word) === currentGuess) ||
            allWords.fr.some((word) => normalizeWord(word) === currentGuess);

          if (isValid) {
            setGuesses((prevGuesses) => [...prevGuesses, currentGuess]);
            setCurrentGuess('');
            if (
              solution &&
              guesses.includes(solution.en) &&
              guesses.includes(solution.es) &&
              guesses.includes(solution.fr)
            ) {
              setGameStatus('won');
            } else if (guesses.length >= MAX_GUESSES) {
              setGameStatus('lost');
            }
          } else {
            // Here you can add feedback for an invalid word, like a shake animation or a toast notification.
            console.log('Invalid word:', currentGuess);
          }
        }
      } else if (key === 'del' || key === 'backspace') {
        setCurrentGuess((prev) => prev.slice(0, -1));
      } else if (currentGuess.length < 5 && /^[a-zA-Z]$/.test(key)) {
        setCurrentGuess((prev) => prev + key.toLowerCase());
      }
    },
    [currentGuess, gameStatus, guesses]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ... (This logic remains the same)
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
  }, [handleKeyPress]);

  // 3. Render loading/error states before rendering the game.
  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  // FIX 1: Update the loading check to include shuffledLanguages.
  if (error || !solution || !shuffledLanguages) {
    return <Center style={{ height: '100vh' }}>{error || 'Could not load the game.'}</Center>;
  }

  return (
    <Box style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%' }}>
      <Center style={{ overflow: 'hidden' }}>
        <GameBoard
          solution={solution}
          guesses={guesses}
          shuffledLanguages={shuffledLanguages}
          allWords={allWords}
          maxGuesses={MAX_GUESSES}
        />
      </Center>
      <CurrentGuessRow guess={currentGuess} />
      <AlphabetStatus
        guesses={guesses}
        solution={solution}
        shuffledLanguages={shuffledLanguages}
        onKeyPress={handleKeyPress}
      />
    </Box>
  );
}
