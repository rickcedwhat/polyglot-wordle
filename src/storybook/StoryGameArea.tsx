import { Box, Center, Loader, Text } from '@mantine/core';
import { AlphabetStatus } from '@/components/AlphabetStatus/AlphabetStatus';
import { CurrentGuessRow } from '@/components/CurrentGuessRow/CurrentGuessRow';
import { GameBoard } from '@/components/Gameboard/Gameboard';
import { GAME_ORIGIN, SCORE_ORIGIN_ATTR } from '@/components/ScoreFlights/flightUtils';
import { ScoreFlights } from '@/components/ScoreFlights/ScoreFlights';
import { ScorePopups } from '@/components/ScorePopups/ScorePopups';
import type { StoryGame } from './useStoryGame';

/** Boards + guess row + keyboard, laid out like the real Game component. */
export function StoryGameArea({ game }: { game: StoryGame }) {
  if (!game.wordPools) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Box style={{ display: 'grid', gridTemplateRows: '1fr auto', height: '100%', minHeight: 0 }}>
      <Box pt="xl" style={{ display: 'flex', justifyContent: 'center', overflow: 'visible' }}>
        <GameBoard
          key={game.fixture.label}
          solution={game.solution}
          guesses={game.guesses}
          shuffledLanguages={game.languages}
          wordPoolsOverride={game.wordPools}
          scoreBurst={game.burst}
        />
      </Box>
      <Box>
        {game.isOver && (
          <Text ta="center" fw={700} c={game.solvedAll ? 'green' : 'red'}>
            {game.solvedAll ? 'All words solved!' : 'Out of guesses'}
          </Text>
        )}
        <Box pos="relative" {...{ [SCORE_ORIGIN_ATTR]: GAME_ORIGIN }}>
          {game.burst && <ScorePopups key={game.burst.id} events={game.burst.events} />}
          {game.burst && <ScoreFlights key={game.burst.id} burst={game.burst} />}
          <CurrentGuessRow
            guess={game.currentGuess}
            cursorIndex={game.cursorIndex}
            onTileClick={game.setCursorIndex}
            isInvalid={game.isInvalid}
          />
        </Box>
        <AlphabetStatus activeKey={game.activeKey} onKeyPress={game.handleKeyPress} />
      </Box>
    </Box>
  );
}
