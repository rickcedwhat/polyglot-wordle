import { FC, ReactNode, useEffect, useState } from 'react';
import { IconTrophy } from '@tabler/icons-react';
import { Box, Button, Center, Group, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { GameBoard, type GameBoardWordPools } from '@/components/Gameboard/Gameboard';
import { Leaderboard } from '@/components/Leaderboard/Leaderboard';
import { PostGameModal } from '@/components/PostGameModal/PostGameModal';
import { useScore } from '@/context/ScoreContext';
import { useSidebar } from '@/context/SidebarContext';
import { useChallenge } from '@/hooks/useChallenge';
import type { GameDoc } from '@/types/firestore';
import { scoringVersionOf } from '@/utils/wordUtils';
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
  const { challengerUser, challengerGame } = useChallenge(gameSession.gameId);

  useEffect(() => {
    setFocusedGame(gameSession);
  }, [gameSession]);

  useEffect(() => {
    setSidebarContent(<Score />);
    return () => setSidebarContent(null);
  }, [setSidebarContent]);

  useEffect(() => {
    if (guessHistory && solution) {
      recalculateScore(guessHistory, solution, scoringVersionOf(gameSession));
    }
  }, [guessHistory, solution, gameSession, recalculateScore]);

  return (
    <Box style={{ width: '100%', height: '100%', position: 'relative' }}>
      <PostGameModal
        opened={modalOpened}
        onClose={closeModal}
        gameSession={focusedGame}
        onPlayAgain={onPlayAgain}
        challengerUser={challengerUser}
        challengerGame={challengerGame}
      />

      <PostGameLayout
        game={focusedGame}
        onOpenSummary={openModal}
        leaderboard={
          <Leaderboard
            gameId={gameSession.gameId}
            selectedUserId={focusedGame.userId}
            onGameSelect={setFocusedGame}
          />
        }
      />
    </Box>
  );
};

interface PostGameLayoutProps {
  game: Pick<GameDoc, 'words' | 'guessHistory' | 'shuffledLanguages'>;
  onOpenSummary: () => void;
  leaderboard: ReactNode;
  /** Skip fetching dictionaries (Storybook / tests). */
  wordPoolsOverride?: GameBoardWordPools;
}

/** Summary button, the finished boards at full width, then the leaderboard. */
export const PostGameLayout: FC<PostGameLayoutProps> = ({
  game,
  onOpenSummary,
  leaderboard,
  wordPoolsOverride,
}) => (
  <Stack gap="lg" align="center" w="100%" pb="xl">
    <Group justify="flex-end" w="100%">
      <Button
        size="xs"
        variant="gradient"
        gradient={{ from: 'indigo', to: 'cyan', deg: 45 }}
        leftSection={<IconTrophy size={14} />}
        onClick={onOpenSummary}
      >
        📊 Match Summary & Stats
      </Button>
    </Group>

    <Center w="100%" style={{ overflow: 'visible' }}>
      <GameBoard
        solution={game.words}
        guesses={game.guessHistory}
        shuffledLanguages={game.shuffledLanguages}
        wordPoolsOverride={wordPoolsOverride}
      />
    </Center>

    <Box w="100%" maw={720}>
      {leaderboard}
    </Box>
  </Stack>
);
