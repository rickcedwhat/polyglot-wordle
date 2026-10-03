import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Center, Loader, Notification } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { featKey } from '@/achievements/detectFeats';
import { getGameAchievements } from '@/achievements/gameAchievements';
import { notifyFeat } from '@/components/Badges/notifyFeat';
import { GameBoard } from '@/components/Gameboard/Gameboard';
import { MAX_GUESSES } from '@/config';
import { useAuth } from '@/context/AuthContext';
import { useScore } from '@/context/ScoreContext';
import { useSidebar } from '@/context/SidebarContext';
import { useChallenge } from '@/hooks/useChallenge';
import { useLetterStatus } from '@/hooks/useLetterStatus';
import { useVocabulary } from '@/hooks/useVocabulary';
import { useWordPools } from '@/hooks/useWordPools';
import type { GameDoc } from '@/types/firestore.d.ts';
import { gamePath, languagesFromGame } from '@/utils/languages';
import {
  getLatestTurnScoreEvents,
  languagesMissingWord,
  normalizeWord,
  scoringVersionOf,
  validateGuess,
} from '@/utils/wordUtils';
import { AlphabetStatus } from '../AlphabetStatus/AlphabetStatus';
import { ChallengeBanner } from '../ChallengeBanner/ChallengeBanner';
import { CurrentGuessRow } from '../CurrentGuessRow/CurrentGuessRow';
import { PostGameModal } from '../PostGameModal/PostGameModal';
import { Score } from '../Score/Score';
import { GAME_ORIGIN, SCORE_ORIGIN_ATTR, useScoreBurst } from '../ScoreFlights/flightUtils';
import { ScoreFlights } from '../ScoreFlights/ScoreFlights';
import { ScorePopups } from '../ScorePopups/ScorePopups';
import { promptFlagMissingWord } from './promptFlagMissingWord';

/** Pressing Enter this many times in a row on a rejected word offers to flag it as missing. */
const REJECTED_ENTERS_TO_FLAG = 3;

// Define the props the component will receive
interface GameProps {
  gameSession: GameDoc;
  updateGuessHistory: (guess: string) => Promise<void>;
  endGame: (result: { isWin: boolean; score: number }) => Promise<void>;
}

export function Game({ gameSession, updateGuessHistory, endGame }: GameProps) {
  // 1. Get the core game state and solution from the session prop
  const { words: solution, difficulties, guessHistory, shuffledLanguages } = gameSession;
  const scoringVersion = scoringVersionOf(gameSession);
  const [gameOverOpened, { open: openGameOver, close: closeGameOver }] = useDisclosure(false);
  const { recalculateScore, flightsInProgress, holdPoints } = useScore();
  const { updateLetterStatuses } = useLetterStatus();
  const { recordGuess, vocabulary } = useVocabulary();
  const [mountedAt] = useState(() => new Date());
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const { data: wordPools } = useWordPools(difficulties);
  const { challengerUser, challengerGame, isChallenge } = useChallenge(gameSession.gameId);
  const [guesses, setGuesses] = useState<string[]>(guessHistory);
  const [currentGuess, setCurrentGuess] = useState<string[]>(Array(5).fill(''));
  const [cursorIndex, setCursorIndex] = useState(0);
  const [isInvalidGuess, setIsInvalidGuess] = useState(false);
  const rejectedStreak = useRef({ guess: '', count: 0 });
  const { setSidebarContent } = useSidebar();
  const { currentUser } = useAuth();
  const [rematchNotice, setRematchNotice] = useState<string | null>(null);
  const { burst: scoreBurst, fireBurst } = useScoreBurst();

  // Drop any held flight points if we leave mid-flight.
  useEffect(() => () => holdPoints(0, {}), [holdPoints]);

  // Rematch from Challenges inbox: copy share link once the new game exists
  useEffect(() => {
    const raw = sessionStorage.getItem('polyglot_pending_rematch');
    if (!raw || !currentUser || !gameSession.gameId) {
      return;
    }
    try {
      const pending = JSON.parse(raw) as { opponentName?: string };
      const url = `${window.location.origin}${gamePath(
        gameSession.gameId,
        languagesFromGame(gameSession),
        { challenger: currentUser.uid }
      )}`;
      navigator.clipboard.writeText(url).then(
        () => {
          setRematchNotice(
            `Rematch link copied — send to ${pending.opponentName || 'your friend'}`
          );
          sessionStorage.removeItem('polyglot_pending_rematch');
          window.setTimeout(() => setRematchNotice(null), 6000);
        },
        () => {
          setRematchNotice('Could not copy the rematch link. Please try sharing it manually.');
          sessionStorage.removeItem('polyglot_pending_rematch');
          window.setTimeout(() => setRematchNotice(null), 6000);
        }
      );
    } catch {
      sessionStorage.removeItem('polyglot_pending_rematch');
    }
  }, [currentUser, gameSession.gameId]);

  const currentScore = useMemo(
    () => recalculateScore(guesses, solution, scoringVersion),
    [guesses, solution, scoringVersion, recalculateScore]
  );

  useEffect(() => {
    setSidebarContent(<Score />);
    return () => setSidebarContent(null);
  }, [setSidebarContent]);

  useEffect(() => {
    // This effect now syncs all state when the game session loads
    if (guessHistory && solution) {
      setGuesses(guessHistory);
      // 1. Recalculate the score based on the loaded history
      recalculateScore(guessHistory, solution, scoringVersion);

      // 2. ALSO, update the letter statuses based on the loaded history
      updateLetterStatuses({ guesses: guessHistory, solution, shuffledLanguages });
    }
  }, [
    guessHistory,
    solution,
    scoringVersion,
    recalculateScore,
    updateLetterStatuses,
    shuffledLanguages,
  ]);

  const getInitialGameStatus = () => {
    if (!gameSession.isLiveGame) {
      return gameSession.isWin ? 'won' : 'lost';
    }
    return 'playing';
  };
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>(getInitialGameStatus());

  const activeGameSession: GameDoc = useMemo(
    () => ({
      ...gameSession,
      guessHistory: guesses,
      score: gameSession.score ?? currentScore,
      isWin:
        gameStatus === 'won' ? true : gameStatus === 'lost' ? false : (gameSession.isWin ?? false),
      isLiveGame: gameStatus === 'playing',
    }),
    [gameSession, guesses, currentScore, gameStatus]
  );

  const handleTileClick = (index: number) => {
    setCursorIndex(Math.max(0, Math.min(4, index)));
  };

  // Let the final guess's score flights land before showing the results.
  const waitForFlights = Boolean(scoreBurst?.fly);
  useEffect(() => {
    if (gameStatus === 'playing' || flightsInProgress) {
      return undefined;
    }
    const timer = window.setTimeout(openGameOver, waitForFlights ? 600 : 0);
    return () => window.clearTimeout(timer);
  }, [gameStatus, flightsInProgress, waitForFlights, openGameOver]);

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

      if (lowerKey !== 'enter') {
        rejectedStreak.current = { guess: '', count: 0 };
      }

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

        const { isValid, matchedLangs, solutionLangs } = validateGuess({
          guess: guessString,
          masterPools: wordPools.master,
          solution,
          previousGuesses: guesses,
        });

        if (isValid) {
          // Record discovered word into player's personal vocabulary with language-specific solved tagging
          recordGuess({
            guess: guessString,
            matchedLangs,
            solutionLangs,
            isSolution: solutionLangs.length > 0,
          });

          const newGuesses = [...guesses, guessString];
          setGuesses(newGuesses);
          // Score and held flight points must update together so the counter doesn't dip.
          const finalScore = recalculateScore(newGuesses, solution, scoringVersion);
          fireBurst(
            newGuesses.length,
            getLatestTurnScoreEvents(newGuesses, solution, scoringVersion)
          );
          setCurrentGuess(Array(5).fill(''));
          setCursorIndex(0);
          const fallbacks = { startedAt: mountedAt };
          const featsBefore = new Set(
            getGameAchievements(
              { ...gameSession, guessHistory: guesses },
              vocabulary,
              fallbacks,
              wordPools.dictionaries
            ).feats.map(featKey)
          );
          getGameAchievements(
            { ...gameSession, guessHistory: newGuesses },
            vocabulary,
            fallbacks,
            wordPools.dictionaries
          )
            .feats.filter((feat) => !featsBefore.has(featKey(feat)))
            .forEach(notifyFeat);
          await updateGuessHistory(guessString);
          updateLetterStatuses({ guesses: newGuesses, solution, shuffledLanguages });

          const normGuesses = newGuesses.map(normalizeWord);
          const allSolutionsFound = shuffledLanguages.every((lang) =>
            normGuesses.includes(normalizeWord(solution[lang]!))
          );

          if (allSolutionsFound) {
            setGameStatus('won');
            await endGame({ isWin: true, score: finalScore });
          } else if (newGuesses.length >= MAX_GUESSES) {
            setGameStatus('lost');
            await endGame({ isWin: false, score: finalScore });
          }
        } else {
          // not a valid word or was already used before
          const alreadyGuessed = guesses.map(normalizeWord).includes(normalizeWord(guessString));
          const streak = rejectedStreak.current;
          if (alreadyGuessed) {
            const missingFrom = languagesMissingWord({
              guess: guessString,
              masterPools: wordPools.master,
              solution,
            });
            if (missingFrom.length > 0) {
              promptFlagMissingWord(guessString, missingFrom);
            }
          } else {
            rejectedStreak.current =
              streak.guess === guessString
                ? { guess: guessString, count: streak.count + 1 }
                : { guess: guessString, count: 1 };
            if (rejectedStreak.current.count >= REJECTED_ENTERS_TO_FLAG) {
              rejectedStreak.current = { guess: '', count: 0 };
              promptFlagMissingWord(guessString, shuffledLanguages);
            }
          }
          setIsInvalidGuess(true);
          setTimeout(() => {
            setIsInvalidGuess(false);
          }, 500);
        }
      } else if (lowerKey === 'del' || lowerKey === 'backspace') {
        const newGuess = [...currentGuess];
        if (newGuess[cursorIndex]) {
          // Current tile has a letter: clear it
          newGuess[cursorIndex] = '';
          setCurrentGuess(newGuess);
        } else if (cursorIndex > 0) {
          // Current tile is empty: step back and clear previous tile
          const newCursorIndex = cursorIndex - 1;
          newGuess[newCursorIndex] = '';
          setCurrentGuess(newGuess);
          setCursorIndex(newCursorIndex);
        }
      } else if (/^[a-z]$/.test(lowerKey)) {
        const newGuess = [...currentGuess];
        newGuess[cursorIndex] = lowerKey;
        setCurrentGuess(newGuess);
        setCursorIndex(Math.min(4, cursorIndex + 1));
      }
    },
    [
      currentGuess,
      cursorIndex,
      endGame,
      fireBurst,
      gameSession,
      gameStatus,
      mountedAt,
      vocabulary,
      guessHistory,
      guesses,
      scoringVersion,
      recalculateScore,
      recordGuess,
      shuffledLanguages,
      solution,
      updateGuessHistory,
      updateLetterStatuses,
      wordPools,
    ]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      // Prevent default scrolling for arrow keys
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
      }

      // Handle cursor movement
      if (event.key === 'ArrowLeft') {
        setCursorIndex((prev) => Math.max(0, prev - 1));
        return;
      }
      if (event.key === 'ArrowRight') {
        setCursorIndex((prev) => Math.min(4, prev + 1));
        return;
      }

      if (event.key === 'Delete') {
        event.preventDefault();
        const newGuess = [...currentGuess];
        newGuess[cursorIndex] = '';
        setCurrentGuess(newGuess);
        return;
      }

      const { key } = event;
      if (key === 'Enter') {
        if (!event.repeat) {
          handleKeyPress('enter');
        }
      } else if (key === 'Backspace') {
        handleKeyPress('del');
      } else if (key.length === 1 && key.match(/[a-z]/i)) {
        handleKeyPress(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGuess, cursorIndex, handleKeyPress]); // The dependencies are correct

  // Render a loading state while the static word pools are being fetched for the first time
  if (!wordPools) {
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
      <PostGameModal
        opened={gameOverOpened}
        onClose={closeGameOver}
        gameSession={activeGameSession}
        challengerUser={challengerUser}
        challengerGame={challengerGame}
      />

      <Box
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          overflow: 'visible',
        }}
      >
        {isChallenge && challengerGame && (
          <ChallengeBanner challengerUser={challengerUser} challengerGame={challengerGame} />
        )}
        {rematchNotice && (
          <Notification
            color="blue"
            mb="sm"
            maw={420}
            withCloseButton
            onClose={() => setRematchNotice(null)}
            title="Rematch ready"
          >
            {rematchNotice}
          </Notification>
        )}
        <Center style={{ overflow: 'visible', width: '100%' }}>
          <GameBoard
            solution={solution}
            guesses={guesses}
            shuffledLanguages={shuffledLanguages}
            scoreBurst={scoreBurst}
          />
        </Center>
      </Box>
      <Box pos="relative" {...{ [SCORE_ORIGIN_ATTR]: GAME_ORIGIN }}>
        {scoreBurst && <ScorePopups key={scoreBurst.id} events={scoreBurst.events} />}
        {scoreBurst && <ScoreFlights burst={scoreBurst} />}
        <CurrentGuessRow
          guess={currentGuess}
          cursorIndex={cursorIndex}
          onTileClick={handleTileClick}
          isInvalid={isInvalidGuess}
        />
      </Box>
      <AlphabetStatus activeKey={activeKey} onKeyPress={handleKeyPress} />
    </Box>
  );
}
