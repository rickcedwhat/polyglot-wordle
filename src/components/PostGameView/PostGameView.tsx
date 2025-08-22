import { FC, useEffect, useState } from 'react';
import { Box, Grid } from '@mantine/core';
import { GameBoard } from '@/components/Gameboard/Gameboard';
import { Leaderboard } from '@/components/Leaderboard/Leaderboard';
import type { GameDoc } from '@/types/firestore';

interface PostGameViewProps {
  gameSession: GameDoc;
}

export const PostGameView: FC<PostGameViewProps> = ({ gameSession }) => {
  // This state will hold the game data for the board being displayed on the left.
  // It defaults to the player's own game.
  const [focusedGame, setFocusedGame] = useState<GameDoc>(gameSession);

  // When the gameSession prop changes (e.g., new game), reset the focus
  useEffect(() => {
    setFocusedGame(gameSession);
  }, [gameSession]);

  return (
    <Grid gutter="xl">
      <Grid.Col span={{ base: 12, md: 9 }}>
        <Box
        // style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}>
        >
          <GameBoard
            solution={focusedGame.words}
            guesses={focusedGame.guessHistory}
            shuffledLanguages={focusedGame.shuffledLanguages}
          />
        </Box>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 3 }}>
        <Leaderboard
          gameId={gameSession.gameId}
          selectedUserId={focusedGame.userId}
          onGameSelect={setFocusedGame} // Pass the setter to the leaderboard
        />
      </Grid.Col>
    </Grid>
  );
};
