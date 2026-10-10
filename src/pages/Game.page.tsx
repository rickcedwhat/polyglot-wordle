import { FC, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, Button, Center, Loader, Stack, Text } from '@mantine/core';
import { Game } from '@/components/Game/Game';
import { PostGameView } from '@/components/PostGameView/PostGameView';
import { useGameSession } from '@/hooks/useGameSession';
import { useSlow } from '@/hooks/useSlow';
import {
  formatLangCombo,
  gamePath,
  isGameId,
  languagesFromGame,
  parseLangCombo,
} from '@/utils/languages';

const LoadProblem: FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <Center style={{ height: '80vh' }}>
    <Stack align="center" gap="sm">
      <Text c="dimmed" ta="center">
        {message}
      </Text>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </Stack>
  </Center>
);

export const GamePage: FC = () => {
  const navigate = useNavigate();
  const { uuid, languages: langSegment } = useParams<{ languages?: string; uuid: string }>();
  const [searchParams] = useSearchParams();
  const {
    data: gameSession,
    isError,
    isFetching,
    refetch,
    updateGuessHistory,
    endGame,
  } = useGameSession();
  const { slow, restart } = useSlow(!gameSession && (!isError || isFetching));
  const retry = () => {
    restart();
    refetch();
  };

  // Canonicalize to `/game/en-it-pt/:uuid` once the session languages are known.
  useEffect(() => {
    if (!uuid || !gameSession) {
      return;
    }
    const langs = languagesFromGame(gameSession);
    const expectedCombo = formatLangCombo(langs);
    const parsed = parseLangCombo(langSegment);
    if (parsed && langSegment === expectedCombo) {
      return;
    }
    navigate(gamePath(uuid, langs, { challenger: searchParams.get('challenger') }), {
      replace: true,
    });
  }, [uuid, langSegment, gameSession, navigate, searchParams]);

  if (!uuid || !isGameId(uuid)) {
    return <LoadProblem message="This game link isn't valid." />;
  }

  if (isError && !isFetching) {
    return (
      <LoadProblem message="Couldn't load this game. Check your connection." onRetry={retry} />
    );
  }

  if (!gameSession) {
    return slow ? (
      <LoadProblem message="This is taking longer than usual." onRetry={retry} />
    ) : (
      <Center style={{ height: '80vh' }}>
        <Loader />
      </Center>
    );
  }

  if (gameSession.isLiveGame) {
    return (
      <Game gameSession={gameSession} updateGuessHistory={updateGuessHistory} endGame={endGame} />
    );
  }

  return (
    <Box h="100%" w="100%">
      <PostGameView gameSession={gameSession} />
    </Box>
  );
};
