import { FC, useEffect, useState } from 'react';
import {
  IconAdjustmentsHorizontal,
  IconBooks,
  IconCheck,
  IconDice,
  IconFlag,
  IconFlagFilled,
  IconRefresh,
  IconSettings,
} from '@tabler/icons-react';
import { Timestamp } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Center,
  Collapse,
  Container,
  Drawer,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { FlagsModal } from '@/components/FlagsModal/FlagsModal';
import { Game } from '@/components/Game/Game';
import { PostGameView } from '@/components/PostGameView/PostGameView';
import { useFlaggedWords } from '@/hooks/useFlaggedWords';
import { useSandboxDrawer } from '@/hooks/useSandboxDrawer';
import type { GameDoc } from '@/types/firestore';
import { formatDefinition, normalizeWord, WordEntry } from '@/utils/wordUtils';

const SANDBOX_STORAGE_KEY = 'polyglot_sandbox_state_v1';

interface SavedSandboxState {
  enWord: string;
  esWord: string;
  frWord: string;
  shuffledLanguages: ('en' | 'es' | 'fr')[];
  guessHistory: string[];
  isLiveGame: boolean;
  isWin: boolean | null;
  score: number | null;
}

const getInitialSandboxState = (): SavedSandboxState => {
  try {
    const saved = localStorage.getItem(SANDBOX_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // Ignore storage parse error
  }
  return {
    enWord: 'apple',
    esWord: 'queso',
    frWord: 'fruit',
    shuffledLanguages: ['en', 'es', 'fr'],
    guessHistory: [],
    isLiveGame: true,
    isWin: null,
    score: 0,
  };
};

export const SandboxPage: FC = () => {
  const { opened: panelOpened, close: closePanel } = useSandboxDrawer();
  const [opened, { toggle: toggleSettings }] = useDisclosure(false);
  const [flagsModalOpened, { open: openFlagsModal, close: closeFlagsModal }] = useDisclosure(false);
  const { isFlagged, toggleFlag } = useFlaggedWords();
  const initial = getInitialSandboxState();

  const [enWord, setEnWord] = useState(initial.enWord);
  const [esWord, setEsWord] = useState(initial.esWord);
  const [frWord, setFrWord] = useState(initial.frWord);
  const [shuffledLanguages, setShuffledLanguages] = useState<('en' | 'es' | 'fr')[]>(
    initial.shuffledLanguages
  );
  const [gameKey, setGameKey] = useState(0);

  const [searchWord, setSearchWord] = useState('bonus');
  const [inspectLang, setInspectLang] = useState<'en' | 'es' | 'fr'>('en');
  const [dictCache, setDictCache] = useState<
    Record<'en' | 'es' | 'fr', Record<string, WordEntry> | null>
  >({
    en: null,
    es: null,
    fr: null,
  });

  useEffect(() => {
    Promise.all([
      fetch('/en.json').then((r) => r.json()),
      fetch('/es.json').then((r) => r.json()),
      fetch('/fr.json').then((r) => r.json()),
    ])
      .then(([en, es, fr]) => {
        setDictCache({ en, es, fr });
      })
      .catch(() => {});
  }, []);

  const normalizedSearch = normalizeWord(searchWord.trim());

  const getLangStatus = (lang: 'en' | 'es' | 'fr'): boolean | null => {
    if (!normalizedSearch) {
      return null;
    }
    const dict = dictCache[lang];
    if (!dict) {
      return null;
    }
    return Boolean(dict[normalizedSearch]);
  };

  const getInspectedEntry = (lang: 'en' | 'es' | 'fr'): WordEntry | null => {
    if (!normalizedSearch) {
      return null;
    }
    const dict = dictCache[lang];
    if (!dict) {
      return null;
    }
    return dict[normalizedSearch] || null;
  };

  const [session, setSession] = useState<GameDoc>({
    userId: 'sandbox-user',
    gameId: 'sandbox-mode',
    words: {
      en: initial.enWord,
      es: initial.esWord,
      fr: initial.frWord,
    },
    difficulties: {
      en: 'advanced',
      es: 'advanced',
      fr: 'advanced',
    },
    shuffledLanguages: initial.shuffledLanguages,
    isLiveGame: initial.isLiveGame,
    guessHistory: initial.guessHistory,
    isWin: initial.isWin,
    score: initial.score,
    startedAt: Timestamp.now(),
    completedAt: null,
  });

  const saveToStorage = (updatedSession: GameDoc) => {
    try {
      const stateToSave: SavedSandboxState = {
        enWord: updatedSession.words.en,
        esWord: updatedSession.words.es,
        frWord: updatedSession.words.fr,
        shuffledLanguages: updatedSession.shuffledLanguages,
        guessHistory: updatedSession.guessHistory,
        isLiveGame: updatedSession.isLiveGame,
        isWin: updatedSession.isWin,
        score: updatedSession.score,
      };
      localStorage.setItem(SANDBOX_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      // Ignore storage write error
    }
  };

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

    const newSession: GameDoc = {
      userId: 'sandbox-user',
      gameId: 'sandbox-mode',
      words: {
        en: cleanEn,
        es: cleanEs,
        fr: cleanFr,
      },
      difficulties: {
        en: 'advanced',
        es: 'advanced',
        fr: 'advanced',
      },
      shuffledLanguages: newLangs,
      isLiveGame: true,
      guessHistory: [],
      isWin: null,
      score: 0,
      startedAt: Timestamp.now(),
      completedAt: null,
    };
    setSession(newSession);
    saveToStorage(newSession);
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
      // Ignore random fetch error
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
    setSession((prev) => {
      const nextSession = {
        ...prev,
        guessHistory: [...prev.guessHistory, guess],
      };
      saveToStorage(nextSession);
      return nextSession;
    });
  };

  const endGame = async (result: { isWin: boolean; score: number }) => {
    setSession((prev) => {
      const nextSession = {
        ...prev,
        isLiveGame: false,
        isWin: result.isWin,
        score: result.score,
        completedAt: Timestamp.now(),
      };
      saveToStorage(nextSession);
      return nextSession;
    });
  };

  return (
    <Box h="100%" w="100%" style={{ position: 'relative' }}>
      {/* Main Game Screen */}
      <Box h="100%" w="100%">
        {session.isLiveGame ? (
          <Game
            key={gameKey}
            gameSession={session}
            updateGuessHistory={updateGuessHistory}
            endGame={endGame}
          />
        ) : (
          <Box h="100%" w="100%" style={{ display: 'flex', flexDirection: 'column' }}>
            <Box style={{ flex: 1, minHeight: 0, width: '100%' }}>
              <PostGameView gameSession={session} onPlayAgain={() => handleApplyWords()} />
            </Box>
            <Center p="md">
              <Button
                variant="filled"
                color="blue"
                leftSection={<IconRefresh size={16} />}
                onClick={() => handleApplyWords()}
              >
                Play Again in Sandbox
              </Button>
            </Center>
          </Box>
        )}
      </Box>

      {/* Slide-over Sandbox Tools Drawer */}
      <Drawer
        opened={panelOpened}
        onClose={closePanel}
        title={
          <Group gap="xs">
            <Badge color="yellow" variant="filled" size="md">
              🛠️ UI Sandbox Tools
            </Badge>
          </Group>
        }
        position="left"
        size="md"
      >
        <Stack gap="md">
          {/* Controls Panel */}
          <Paper p="sm" withBorder radius="md" bg="var(--mantine-color-dark-8)">
            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed">
                BOARD CONTROLS
              </Text>
              <Group gap="xs" wrap="wrap">
                <Button
                  size="xs"
                  variant="light"
                  color="teal"
                  leftSection={<IconDice size={14} />}
                  onClick={handleRandomize}
                >
                  Randomize
                </Button>

                <Button size="xs" variant="light" color="indigo" onClick={handleCycleLanguages}>
                  Columns: {shuffledLanguages.map((l) => l.toUpperCase()).join(' | ')}
                </Button>

                <Button
                  size="xs"
                  variant="light"
                  color="orange"
                  leftSection={<IconRefresh size={14} />}
                  onClick={() => handleApplyWords()}
                >
                  Reset Board
                </Button>

                <Button
                  size="xs"
                  variant="light"
                  color="pink"
                  leftSection={<IconFlag size={14} />}
                  onClick={openFlagsModal}
                >
                  Custom Flags
                </Button>

                <ActionIcon variant="subtle" color="gray" onClick={toggleSettings}>
                  <IconSettings size={18} />
                </ActionIcon>
              </Group>

              <Collapse in={opened} mt="xs">
                <Paper p="xs" withBorder radius="sm" bg="var(--mantine-color-dark-7)">
                  <Stack gap="xs">
                    <Text size="xs" fw={600} c="dimmed">
                      Target Solution Words:
                    </Text>
                    <Stack gap="xs">
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
                    </Stack>
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
            </Stack>
          </Paper>

          {/* Definition Inspector */}
          <Paper p="sm" withBorder radius="md" bg="var(--mantine-color-dark-8)">
            <Stack gap="xs">
              <Group justify="space-between" align="center">
                <Text size="xs" fw={700} c="blue.4">
                  📖 LIVE DEFINITION INSPECTOR
                </Text>
                <Button
                  component={Link}
                  to="/dictionaries"
                  size="xs"
                  variant="subtle"
                  color="indigo"
                  leftSection={<IconBooks size={14} />}
                >
                  Dictionaries (/dictionaries)
                </Button>
              </Group>

              <TextInput
                size="xs"
                placeholder="Type word to inspect (e.g. bonus, queso)..."
                value={searchWord}
                onChange={(e) => setSearchWord(e.currentTarget.value)}
              />

              <Group gap={6}>
                {[
                  { key: 'en' as const, flag: '🇬🇧', label: 'EN' },
                  { key: 'es' as const, flag: '🇪🇸', label: 'ES' },
                  { key: 'fr' as const, flag: '🇫🇷', label: 'FR' },
                ].map((item) => {
                  const isSelected = inspectLang === item.key;
                  const status = getLangStatus(item.key);

                  let color = 'gray';
                  let badge = '';
                  if (status === true) {
                    color = 'teal';
                    badge = '✓';
                  } else if (status === false) {
                    color = 'red';
                    badge = '✕';
                  }

                  const variant = isSelected ? 'filled' : status !== null ? 'light' : 'default';

                  return (
                    <Button
                      key={item.key}
                      size="xs"
                      color={color}
                      variant={variant}
                      onClick={() => setInspectLang(item.key)}
                      style={{
                        fontWeight: isSelected ? 700 : 500,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {item.flag} {item.label}
                      {badge && (
                        <Text component="span" ml={5} size="xs" fw={700}>
                          {badge}
                        </Text>
                      )}
                    </Button>
                  );
                })}
              </Group>

              {normalizedSearch && (
                <>
                  {getInspectedEntry(inspectLang) ? (
                    (() => {
                      const entry = getInspectedEntry(inspectLang)!;
                      const flagged = isFlagged(inspectLang, normalizedSearch);
                      return (
                        <Paper
                          p="xs"
                          mt="xs"
                          withBorder
                          radius="sm"
                          bg="var(--mantine-color-dark-7)"
                          style={{
                            borderColor: flagged
                              ? 'var(--mantine-color-red-6)'
                              : 'var(--mantine-color-teal-8)',
                          }}
                        >
                          <Stack gap={2}>
                            <Group justify="space-between" align="center">
                              <Group gap={6} align="baseline">
                                <Text size="sm" fw={700} c="teal.4">
                                  {entry.display || normalizedSearch}
                                </Text>
                                <Text size="xs" c="dimmed" fs="italic">
                                  ({entry.pos})
                                </Text>
                                <Badge size="xs" variant="outline" color="teal">
                                  d: {entry.d}
                                </Badge>
                              </Group>
                              <Tooltip label={flagged ? 'Unflag word' : 'Flag word for discussion'}>
                                <ActionIcon
                                  size="xs"
                                  variant={flagged ? 'filled' : 'light'}
                                  color="red"
                                  onClick={() =>
                                    toggleFlag({
                                      lang: inspectLang,
                                      wordKey: normalizedSearch,
                                      display: entry.display || normalizedSearch,
                                      pos: entry.pos,
                                      d: entry.d,
                                      def: entry.def,
                                    })
                                  }
                                >
                                  {flagged ? <IconFlagFilled size={12} /> : <IconFlag size={12} />}
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                            <Text size="sm" style={{ lineHeight: 1.35 }}>
                              • {formatDefinition(entry.def)}
                            </Text>
                          </Stack>
                        </Paper>
                      );
                    })()
                  ) : (
                    <Paper
                      p="xs"
                      mt="xs"
                      withBorder
                      radius="sm"
                      bg="var(--mantine-color-dark-7)"
                      style={{ borderColor: 'var(--mantine-color-red-9)' }}
                    >
                      <Group gap="xs">
                        <Text size="sm" c="red.4" fw={600}>
                          ✕ &quot;{searchWord.trim()}&quot; is not found in the{' '}
                          {inspectLang.toUpperCase()} dictionary.
                        </Text>
                      </Group>
                    </Paper>
                  )}
                </>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Drawer>

      <FlagsModal opened={flagsModalOpened} onClose={closeFlagsModal} />
    </Box>
  );
};
