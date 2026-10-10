import { useState } from 'react';
import { Box, Center, Loader, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { AlphabetStatus } from '@/components/AlphabetStatus/AlphabetStatus';
import gameClasses from '@/components/Game/Game.module.css';
import { GameBoard } from '@/components/Gameboard/Gameboard';
import { GuessInputWithHelp } from '@/components/LetterJumble/GuessInputWithHelp';
import { GAME_ORIGIN, SCORE_ORIGIN_ATTR } from '@/components/ScoreFlights/flightUtils';
import { ScoreFlights } from '@/components/ScoreFlights/ScoreFlights';
import { ScorePopups } from '@/components/ScorePopups/ScorePopups';
import { useLetterJumble } from '@/hooks/useLetterJumble';
import type { StoryGame } from './useStoryGame';

/** Boards + guess row + keyboard, laid out like the real Game component. */
export function StoryGameArea({ game }: { game: StoryGame }) {
  const isNarrow = useMediaQuery('(max-width: 48em)') ?? false;
  const [activeBoard, setActiveBoard] = useState(1);
  const [wideTarget, setWideTarget] = useState(0);
  const jumble = useLetterJumble({
    guesses: game.guesses,
    solution: game.solution,
    shuffledLanguages: game.languages,
    preferredBoard: isNarrow ? activeBoard : wideTarget,
    currentGuess: game.currentGuess,
    setCurrentGuess: game.setCurrentGuess,
    onNoArrangement: game.shake,
    enabled: !game.isOver,
  });

  if (!game.wordPools) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Box
      style={{
        display: 'grid',
        gridTemplateRows: 'minmax(0, 1fr) auto',
        flex: 1,
        height: '100%',
        minHeight: 0,
      }}
    >
      <Center className={gameClasses.boardArea}>
        <GameBoard
          key={game.fixture.label}
          solution={game.solution}
          guesses={game.guesses}
          shuffledLanguages={game.languages}
          wordPoolsOverride={game.wordPools}
          scoreBurst={game.burst}
          onActiveIndexChange={(index) => {
            setActiveBoard(index);
            setWideTarget(index);
          }}
          targetIndex={jumble.targetBoard}
        />
      </Center>
      <Box>
        {game.isOver && (
          <Text ta="center" fw={700} c={game.solvedAll ? 'green' : 'red'}>
            {game.solvedAll ? 'All words solved!' : 'Out of guesses'}
          </Text>
        )}
        <Box pos="relative" {...{ [SCORE_ORIGIN_ATTR]: GAME_ORIGIN }}>
          {game.burst && <ScorePopups key={game.burst.id} events={game.burst.events} />}
          {game.burst && <ScoreFlights burst={game.burst} />}
          <GuessInputWithHelp
            guess={game.currentGuess}
            cursorIndex={game.cursorIndex}
            isInvalid={game.isInvalid}
            onTileClick={game.setCursorIndex}
            jumble={jumble}
            onClear={() => {
              game.setCurrentGuess(Array(5).fill(''));
              game.setCursorIndex(0);
            }}
          />
        </Box>
        <AlphabetStatus activeKey={game.activeKey} onKeyPress={game.handleKeyPress} />
      </Box>
    </Box>
  );
}
