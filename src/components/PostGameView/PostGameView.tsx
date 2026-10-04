import { FC, ReactNode, useEffect, useState } from 'react';
import { IconArrowBackUp, IconTrophy } from '@tabler/icons-react';
import { Box, Button, Center, Group, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { GameBoard, type GameBoardWordPools } from '@/components/Gameboard/Gameboard';
import { Leaderboard } from '@/components/Leaderboard/Leaderboard';
import { PostGameModal } from '@/components/PostGameModal/PostGameModal';
import { useScore } from '@/context/ScoreContext';
import { useSidebar } from '@/context/SidebarContext';
import { useChallenge } from '@/hooks/useChallenge';
import { useUserProfile } from '@/hooks/useUserProfile';
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
        viewingUserId={focusedGame.userId === gameSession.userId ? null : focusedGame.userId}
        onViewOwn={() => setFocusedGame(gameSession)}
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
  /** Whose boards are shown when they aren't yours. */
  viewingUserId?: string | null;
  onViewOwn?: () => void;
  onOpenSummary: () => void;
  leaderboard: ReactNode;
  /** Skip fetching dictionaries (Storybook / tests). */
  wordPoolsOverride?: GameBoardWordPools;
}

const ViewingBar: FC<{ userId: string; onViewOwn?: () => void }> = ({ userId, onViewOwn }) => {
  const { data: profile } = useUserProfile(userId);
  return (
    <Group gap="xs" wrap="nowrap" miw={0}>
      <Text size="sm" truncate>
        Viewing <b>{profile?.displayName || 'Player'}</b>&apos;s game
      </Text>
      <Button
        size="compact-xs"
        variant="light"
        leftSection={<IconArrowBackUp size={12} />}
        onClick={onViewOwn}
      >
        Back to mine
      </Button>
    </Group>
  );
};

/** Summary button, the finished boards at full width, then the leaderboard. */
export const PostGameLayout: FC<PostGameLayoutProps> = ({
  game,
  viewingUserId,
  onViewOwn,
  onOpenSummary,
  leaderboard,
  wordPoolsOverride,
}) => (
  <Stack gap="lg" align="center" w="100%" pb="xl">
    <Group justify={viewingUserId ? 'space-between' : 'flex-end'} w="100%" wrap="nowrap">
      {viewingUserId && <ViewingBar userId={viewingUserId} onViewOwn={onViewOwn} />}
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
