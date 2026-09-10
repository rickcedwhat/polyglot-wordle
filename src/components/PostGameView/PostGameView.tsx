import { FC, useEffect, useState } from 'react';
import { IconTrophy } from '@tabler/icons-react';
import { Box, Button, Grid, Group } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { GameBoard } from '@/components/Gameboard/Gameboard';
import { Leaderboard } from '@/components/Leaderboard/Leaderboard';
import { PostGameModal } from '@/components/PostGameModal/PostGameModal';
import { useScore } from '@/context/ScoreContext';
import { useSidebar } from '@/context/SidebarContext';
import type { GameDoc } from '@/types/firestore';
import { Score } from '../Score/Score';

interface PostGameViewProps {
  gameSession: GameDoc;
  onPlayAgain?: () => void;
}

export const PostGameView: FC<PostGameViewProps> = ({ gameSession, onPlayAgain }) => {
  const { words: solution, guessHistory } = gameSession;
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(true);
  const [focusedGame, setFocusedGame] = useState<GameDoc>(gameSession);
  const { recalculateScore } = useScore();
  const { setSidebarContent } = useSidebar();

  useEffect(() => {
    setFocusedGame(gameSession);
  }, [gameSession]);

  useEffect(() => {
    setSidebarContent(<Score />);
    return () => setSidebarContent(null);
  }, [setSidebarContent]);

  useEffect(() => {
    if (guessHistory && solution) {
      recalculateScore(guessHistory, solution);
    }
  }, [guessHistory, solution, recalculateScore]);

  return (
    <Box style={{ width: '100%', height: '100%', position: 'relative' }}>
      <PostGameModal
        opened={modalOpened}
        onClose={closeModal}
        gameSession={focusedGame}
        onPlayAgain={onPlayAgain}
      />

      <Group
        justify="flex-end"
        p="xs"
        style={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}
      >
        <Button
          size="xs"
          variant="gradient"
          gradient={{ from: 'indigo', to: 'cyan', deg: 45 }}
          leftSection={<IconTrophy size={14} />}
          onClick={openModal}
        >
          📊 Match Summary & Stats
        </Button>
      </Group>

      <Grid gutter="xl" style={{ width: '100%', height: '100%', alignItems: 'center' }}>
        <Grid.Col
          span={{ base: 12, md: 9 }}
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <GameBoard
              solution={focusedGame.words}
              guesses={focusedGame.guessHistory}
              shuffledLanguages={focusedGame.shuffledLanguages}
              hideFlags
            />
          </Box>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Leaderboard
            gameId={gameSession.gameId}
            selectedUserId={focusedGame.userId}
            onGameSelect={setFocusedGame}
          />
        </Grid.Col>
      </Grid>
    </Box>
  );
};
