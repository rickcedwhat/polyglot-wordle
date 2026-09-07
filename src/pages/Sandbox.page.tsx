import { FC, useState } from 'react';
import { IconCheck, IconDice, IconRefresh, IconSettings } from '@tabler/icons-react';
import { Timestamp } from 'firebase/firestore';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Game } from '@/components/Game/Game';
import { PostGameView } from '@/components/PostGameView/PostGameView';
import type { GameDoc } from '@/types/firestore';
import { normalizeWord } from '@/utils/wordUtils';

export const SandboxPage: FC = () => {
  const [opened, { toggle: toggleSettings }] = useDisclosure(true);
  const [enWord, setEnWord] = useState('apple');
  const [esWord, setEsWord] = useState('queso');
  const [frWord, setFrWord] = useState('fruit');
  const [shuffledLanguages, setShuffledLanguages] = useState<('en' | 'es' | 'fr')[]>([
    'en',
    'es',
    'fr',
  ]);
  const [gameKey, setGameKey] = useState(0);

  const [session, setSession] = useState<GameDoc>({
    userId: 'sandbox-user',
    gameId: 'sandbox-mode',
    words: {
      en: enWord,
      es: esWord,
      fr: frWord,
    },
    difficulties: {
      en: 'basic',
      es: 'basic',
      fr: 'basic',
    },
    shuffledLanguages: ['en', 'es', 'fr'],
    isLiveGame: true,
    guessHistory: [],
    isWin: null,
    score: 0,
    startedAt: Timestamp.now(),
    completedAt: null,
  });

  const handleApplyWords = (
    newEn = enWord,
    newEs = esWord,
    newFr = frWord,
    newLangs = shuffledLanguages
  ) => {
    const cleanEn = normalizeWord(newEn.trim()) || 'apple';
    const cleanEs = normalizeWord(newEs.trim()) || 'queso';
    const cleanFr = normalizeWord(newFr.trim()) || 'fruit';

    setEnWord(cleanEn);
    setEsWord(cleanEs);
    setFrWord(cleanFr);

    setSession({
      userId: 'sandbox-user',
      gameId: 'sandbox-mode',
      words: {
        en: cleanEn,
        es: cleanEs,
        fr: cleanFr,
      },
      difficulties: {
        en: 'basic',
        es: 'basic',
        fr: 'basic',
      },
      shuffledLanguages: newLangs,
      isLiveGame: true,
      guessHistory: [],
      isWin: null,
      score: 0,
      startedAt: Timestamp.now(),
      completedAt: null,
    });
    setGameKey((prev) => prev + 1);
  };

  const handleRandomize = async () => {
    try {
      const [enRes, esRes, frRes] = await Promise.all([
        fetch('/en.json').then((r) => r.json()),
        fetch('/es.json').then((r) => r.json()),
        fetch('/fr.json').then((r) => r.json()),
      ]);

      const pickRandom = (dict: Record<string, unknown>) => {
        const keys = Object.keys(dict);
        return keys[Math.floor(Math.random() * keys.length)];
      };

      const randEn = pickRandom(enRes);
      const randEs = pickRandom(esRes);
      const randFr = pickRandom(frRes);

      setEnWord(randEn);
      setEsWord(randEs);
      setFrWord(randFr);
      handleApplyWords(randEn, randEs, randFr);
    } catch (e) {
      console.error('Failed to randomize words:', e);
    }
  };

  const handleCycleLanguages = () => {
    const permutations: ('en' | 'es' | 'fr')[][] = [
      ['en', 'es', 'fr'],
      ['es', 'fr', 'en'],
      ['fr', 'en', 'es'],
      ['es', 'en', 'fr'],
      ['fr', 'es', 'en'],
      ['en', 'fr', 'es'],
    ];
    const currentIndex = permutations.findIndex((p) => p.join('-') === shuffledLanguages.join('-'));
    const nextLangs = permutations[(currentIndex + 1) % permutations.length];
    setShuffledLanguages(nextLangs);
    handleApplyWords(enWord, esWord, frWord, nextLangs);
  };

  const updateGuessHistory = async (guess: string) => {
    setSession((prev) => ({
      ...prev,
      guessHistory: [...prev.guessHistory, guess],
    }));
  };

  const endGame = async (result: { isWin: boolean; score: number }) => {
    setSession((prev) => ({
      ...prev,
      isLiveGame: false,
      isWin: result.isWin,
      score: result.score,
      completedAt: Timestamp.now(),
    }));
  };

  return (
    <Container size="md" py="md">
      <Paper p="sm" withBorder mb="md" radius="md" bg="var(--mantine-color-dark-7)">
        <Group justify="space-between" align="center">
          <Group gap="xs">
            <Badge color="yellow" variant="filled" size="md">
              🛠️ UI Sandbox Mode
            </Badge>
            <Text size="xs" c="dimmed">
              (Testing mode · No login required)
            </Text>
          </Group>

          <Group gap="xs">
            <Tooltip label="Randomize 3 Words">
              <Button
                size="xs"
                variant="light"
                color="teal"
                leftSection={<IconDice size={14} />}
                onClick={handleRandomize}
              >
                Randomize
              </Button>
            </Tooltip>

            <Tooltip label="Cycle Board Column Order">
              <Button size="xs" variant="light" color="indigo" onClick={handleCycleLanguages}>
                Columns: {shuffledLanguages.map((l) => l.toUpperCase()).join(' | ')}
              </Button>
            </Tooltip>

            <Tooltip label="Reset Game Board">
              <Button
                size="xs"
                variant="light"
                color="orange"
                leftSection={<IconRefresh size={14} />}
                onClick={() => handleApplyWords()}
              >
                Reset Board
              </Button>
            </Tooltip>

            <ActionIcon variant="subtle" color="gray" onClick={toggleSettings}>
              <IconSettings size={18} />
            </ActionIcon>
          </Group>
        </Group>

        <Collapse in={opened} mt="sm">
          <Paper p="xs" withBorder radius="sm" bg="var(--mantine-color-dark-8)">
            <Stack gap="xs">
              <Text size="xs" fw={600} c="dimmed">
                Target Solution Words:
              </Text>
              <Group gap="xs" grow>
                <TextInput
                  size="xs"
                  label="🇬🇧 English Word"
                  value={enWord}
                  maxLength={5}
                  onChange={(e) => setEnWord(e.currentTarget.value)}
                />
                <TextInput
                  size="xs"
                  label="🇪🇸 Spanish Word"
                  value={esWord}
                  maxLength={5}
                  onChange={(e) => setEsWord(e.currentTarget.value)}
                />
                <TextInput
                  size="xs"
                  label="🇫🇷 French Word"
                  value={frWord}
                  maxLength={5}
                  onChange={(e) => setFrWord(e.currentTarget.value)}
                />
              </Group>
              <Group justify="flex-end">
                <Button
                  size="xs"
                  color="blue"
                  leftSection={<IconCheck size={14} />}
                  onClick={() => handleApplyWords()}
                >
                  Apply Custom Words
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Collapse>
      </Paper>

      <Box>
        {session.isLiveGame ? (
          <Game
            key={gameKey}
            gameSession={session}
            updateGuessHistory={updateGuessHistory}
            endGame={endGame}
          />
        ) : (
          <Stack align="center" gap="md">
            <PostGameView gameSession={session} />
            <Button
              variant="filled"
              color="blue"
              leftSection={<IconRefresh size={16} />}
              onClick={() => handleApplyWords()}
            >
              Play Again in Sandbox
            </Button>
          </Stack>
        )}
      </Box>
    </Container>
  );
};
