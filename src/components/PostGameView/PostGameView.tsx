import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { IconArrowBackUp, IconTrophy } from '@tabler/icons-react';
import { Box, Button, Center, Group, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { CurrentGuessRow } from '@/components/CurrentGuessRow/CurrentGuessRow';
import { GameBoard, type GameBoardWordPools } from '@/components/Gameboard/Gameboard';
import { Leaderboard } from '@/components/Leaderboard/Leaderboard';
import { PostGameModal } from '@/components/PostGameModal/PostGameModal';
import { ReplayBar } from '@/components/Replay/ReplayBar';
import {
  GAME_ORIGIN,
  SCORE_ORIGIN_ATTR,
  useScoreBurst,
} from '@/components/ScoreFlights/flightUtils';
import { ScoreFlights } from '@/components/ScoreFlights/ScoreFlights';
import { ScorePopups } from '@/components/ScorePopups/ScorePopups';
import { useScore } from '@/context/ScoreContext';
import { useSidebar } from '@/context/SidebarContext';
import { useChallenge } from '@/hooks/useChallenge';
import { useReplay } from '@/hooks/useReplay';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { GameDoc } from '@/types/firestore';
import { getLatestTurnScoreEvents, normalizeWord, scoringVersionOf } from '@/utils/wordUtils';
import { Score } from '../Score/Score';

interface PostGameViewProps {
  gameSession: GameDoc;
  onPlayAgain?: () => void;
}

export const PostGameView: FC<PostGameViewProps> = ({ gameSession, onPlayAgain }) => {
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(true);
  const [focusedGame, setFocusedGame] = useState<GameDoc>(gameSession);
  const { setSidebarContent } = useSidebar();
  const { challengerUser, challengerGame } = useChallenge(gameSession.gameId);

  useEffect(() => {
    setFocusedGame(gameSession);
  }, [gameSession]);

  useEffect(() => {
    setSidebarContent(<Score />);
    return () => setSidebarContent(null);
  }, [setSidebarContent]);

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
  game: Pick<GameDoc, 'words' | 'guessHistory' | 'shuffledLanguages' | 'scoringVersion'>;
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

const EMPTY_ROW = ['', '', '', '', ''];

/** The shown game's replay, with the score counter and score animations following it. */
function useGameReplay(game: PostGameLayoutProps['game']) {
  const { words: solution, guessHistory } = game;
  const version = scoringVersionOf(game);
  const { recalculateScore } = useScore();
  const { burst, fireBurst, clearBurst } = useScoreBurst();
  const burstId = useRef(0);

  const replay = useReplay(guessHistory, {
    onGuessPlayed: (step) => {
      burstId.current += 1;
      fireBurst(
        burstId.current,
        getLatestTurnScoreEvents(guessHistory.slice(0, step), solution, version)
      );
    },
    onJump: clearBurst,
  });

  useEffect(() => {
    recalculateScore(guessHistory.slice(0, replay.step), solution, version);
  }, [replay.step, guessHistory, solution, version, recalculateScore]);

  const solvedSteps = useMemo(() => {
    const solutions = Object.values(solution).map((word) => normalizeWord(word));
    return guessHistory.flatMap((guess, i) =>
      solutions.includes(normalizeWord(guess)) ? [i + 1] : []
    );
  }, [guessHistory, solution]);

  return { replay, burst, solvedSteps };
}

/** Summary button, the finished boards at full width, the replay bar, then the leaderboard. */
export const PostGameLayout: FC<PostGameLayoutProps> = ({
  game,
  viewingUserId,
  onViewOwn,
  onOpenSummary,
  leaderboard,
  wordPoolsOverride,
}) => {
  const { replay, burst, solvedSteps } = useGameReplay(game);
  const typed = replay.typedLetters;

  return (
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

      {viewingUserId && <ViewingBar userId={viewingUserId} onViewOwn={onViewOwn} />}

      <Center w="100%" style={{ overflow: 'visible' }}>
        <GameBoard
          solution={game.words}
          guesses={replay.guesses}
          shuffledLanguages={game.shuffledLanguages}
          wordPoolsOverride={wordPoolsOverride}
          scoreBurst={burst}
        />
      </Center>

      {replay.isReplaying && (
        <Box pos="relative" w="100%" maw={320} {...{ [SCORE_ORIGIN_ATTR]: GAME_ORIGIN }}>
          {burst && <ScorePopups key={burst.id} events={burst.events} />}
          {burst && <ScoreFlights burst={burst} />}
          <CurrentGuessRow
            guess={EMPTY_ROW.map((_, i) => typed?.[i] ?? '')}
            cursorIndex={typed ? Math.min(typed.length, 4) : -1}
            onTileClick={() => {}}
          />
        </Box>
      )}

      <ReplayBar replay={replay} solvedSteps={solvedSteps} />

      <Box w="100%" maw={720}>
        {leaderboard}
      </Box>
    </Stack>
  );
};
