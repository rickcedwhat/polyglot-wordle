import { FC, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Box, Center, Loader, Text } from '@mantine/core';
import { Game } from '@/components/Game/Game';
import { PostGameView } from '@/components/PostGameView/PostGameView';
import { useGameSession } from '@/hooks/useGameSession';
import { formatLangCombo, gamePath, languagesFromGame, parseLangCombo } from '@/utils/languages';

export const GamePage: FC = () => {
  const navigate = useNavigate();
  const { uuid, languages: langSegment } = useParams<{ languages?: string; uuid: string }>();
  const [searchParams] = useSearchParams();
  const { data: gameSession, isLoading, isError, updateGuessHistory, endGame } = useGameSession();

  // Canonicalize to `/game/en-it-pt/:uuid` once the session languages are known.
  useEffect(() => {
    if (!uuid || !gameSession) {
      return;
    }
    const langs = languagesFromGame(gameSession);
    const expectedCombo = formatLangCombo(langs);
    const parsed = parseLangCombo(langSegment);
    if (parsed && formatLangCombo(parsed) === expectedCombo) {
      return;
    }
    navigate(gamePath(uuid, langs, { challenger: searchParams.get('challenger') }), {
      replace: true,
    });
  }, [uuid, langSegment, gameSession, navigate, searchParams]);

  if (isLoading || !gameSession) {
    return (
      <Center style={{ height: '80vh' }}>
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center>
        <Text c="red">Error loading game session.</Text>
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
