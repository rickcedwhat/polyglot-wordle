import { FC, useEffect, useState } from 'react';
import {
  IconCheck,
  IconCopy,
  IconFlag,
  IconFlagFilled,
  IconHelpCircle,
  IconMoodSad,
  IconRefresh,
  IconTrophy,
} from '@tabler/icons-react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Collapse,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import { useDefinition } from '@/hooks/useDefinition';
import { useFlaggedWords } from '@/hooks/useFlaggedWords';
import { useLanguageFlags } from '@/hooks/useLanguageFlags';
import { GameDoc, Language } from '@/types/firestore';
import { formatDefinition, normalizeWord } from '@/utils/wordUtils';

interface PostGameModalProps {
  opened: boolean;
  onClose: () => void;
  gameSession: GameDoc;
  onPlayAgain?: () => void;
}

const WordSummaryCard: FC<{
  lang: Language;
  solutionWord: string;
  guessHistory: string[];
}> = ({ lang, solutionWord, guessHistory }) => {
  const [expanded, setExpanded] = useState(false);
  const { flags } = useLanguageFlags();
  const { isFlagged, toggleFlag } = useFlaggedWords();

  const normSolution = normalizeWord(solutionWord);
  const solvedIndex = guessHistory.map(normalizeWord).indexOf(normSolution);
  const isSolved = solvedIndex !== -1;

  const { data, isLoading, isError, refetch } = useDefinition(lang, normSolution);
  const flagged = data ? isFlagged(lang, normSolution) : false;

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleToggle = () => {
    if (!expanded && !data) {
      refetch();
    }
    setExpanded((prev) => !prev);
  };

  const langLabel = lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : 'French';

  return (
    <Paper p="xs" withBorder radius="md" bg="var(--mantine-color-dark-8)">
      <Stack gap="xs">
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Text size="lg">{flags[lang]}</Text>
            <Box>
              <Text size="xs" fw={700} c="dimmed">
                {langLabel.toUpperCase()}
              </Text>
              <Text size="md" fw={800} style={{ letterSpacing: '1px', textTransform: 'uppercase' }}>
                {data?.display || solutionWord}
              </Text>
            </Box>
          </Group>

          <Group gap="xs">
            {isSolved ? (
              <Badge color="teal" variant="light" size="sm">
                ✓ Turn {solvedIndex + 1}
              </Badge>
            ) : (
              <Badge color="red" variant="light" size="sm">
                ❌ Unsolved
              </Badge>
            )}
            <Button
              size="compact-xs"
              variant="subtle"
              color="indigo"
              leftSection={<IconHelpCircle size={12} />}
              onClick={handleToggle}
            >
              {expanded ? 'Hide' : 'Definition'}
            </Button>
          </Group>
        </Group>

        <Collapse in={expanded}>
          <Paper p="xs" withBorder radius="sm" bg="var(--mantine-color-dark-7)" mt={4}>
            {isLoading && <Loader size="xs" />}
            {isError && (
              <Text size="xs" c="red.4">
                Definition not found in {langLabel} dictionary.
              </Text>
            )}
            {data && (
              <Stack gap={4}>
                <Group justify="space-between" align="center">
                  <Group gap={6} align="baseline">
                    <Text size="xs" fw={700} c="teal.4">
                      {data.display || normSolution}
                    </Text>
                    <Text size="xs" c="dimmed" fs="italic">
                      ({data.pos})
                    </Text>
                    {data.d !== undefined && (
                      <Badge size="xs" variant="outline" color="teal">
                        d: {data.d}
                      </Badge>
                    )}
                  </Group>
                  <Tooltip label={flagged ? 'Unflag word' : 'Flag word for AI discussion'}>
                    <ActionIcon
                      size="xs"
                      variant={flagged ? 'filled' : 'light'}
                      color="red"
                      onClick={() =>
                        toggleFlag({
                          lang,
                          wordKey: normSolution,
                          display: data.display || normSolution,
                          pos: data.pos,
                          d: data.d,
                          def: data.def,
                        })
                      }
                    >
                      {flagged ? <IconFlagFilled size={12} /> : <IconFlag size={12} />}
                    </ActionIcon>
                  </Tooltip>
                </Group>
                <Text size="xs" style={{ lineHeight: 1.35 }}>
                  • {formatDefinition(data.def)}
                </Text>
              </Stack>
            )}
          </Paper>
        </Collapse>
      </Stack>
    </Paper>
  );
};

export const PostGameModal: FC<PostGameModalProps> = ({
  opened,
  onClose,
  gameSession,
  onPlayAgain,
}) => {
  const [copied, setCopied] = useState(false);
  const { words, guessHistory, isWin, score } = gameSession;

  const solvedCount = (['en', 'es', 'fr'] as Language[]).filter((l) =>
    guessHistory.map(normalizeWord).includes(normalizeWord(words[l]))
  ).length;

  const handleCopyShare = () => {
    const text = `Polyglot Wordle ${guessHistory.length}/${MAX_GUESSES}\nScore: ${score || 0} pts (${solvedCount}/3 Solved)\n${isWin ? '🏆 Victory!' : '❌ Game Over'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="md"
      title={
        <Group gap="xs">
          <ThemeIcon color={isWin ? 'yellow' : 'gray'} variant="light" radius="xl" size="sm">
            {isWin ? <IconTrophy size={14} /> : <IconMoodSad size={14} />}
          </ThemeIcon>
          <Text fw={700} size="md">
            {isWin ? 'Match Summary & Results' : 'Game Over — Solutions Revealed'}
          </Text>
        </Group>
      }
    >
      <Stack gap="md">
        {/* Banner */}
        <Paper p="xs" radius="md" bg={isWin ? 'teal.9' : 'dark.7'} withBorder>
          <Group justify="space-between" align="center">
            <Box>
              <Text size="sm" fw={700} c={isWin ? 'teal.1' : 'gray.2'}>
                {isWin
                  ? `🎉 Victory! All 3 Solved in ${guessHistory.length}/${MAX_GUESSES} turns`
                  : `❌ ${solvedCount}/3 Languages Solved in ${guessHistory.length}/${MAX_GUESSES} turns`}
              </Text>
              <Text size="xs" c="dimmed">
                Final Score: {score || 0} pts
              </Text>
            </Box>
            <Badge color={isWin ? 'teal' : 'red'} size="lg">
              {score || 0} PTS
            </Badge>
          </Group>
        </Paper>

        {/* Target Words & Definitions */}
        <Stack gap="xs">
          <Text size="xs" fw={700} c="dimmed">
            TARGET WORDS & DEFINITIONS
          </Text>
          {(['en', 'es', 'fr'] as Language[]).map((lang) => (
            <WordSummaryCard
              key={lang}
              lang={lang}
              solutionWord={words[lang]}
              guessHistory={guessHistory}
            />
          ))}
        </Stack>

        {/* Action Controls */}
        <Group justify="space-between" mt="xs">
          <Button
            size="xs"
            variant="light"
            color="indigo"
            leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            onClick={handleCopyShare}
          >
            {copied ? 'Copied Summary!' : 'Copy Summary'}
          </Button>

          <Group gap="xs">
            {onPlayAgain && (
              <Button
                size="xs"
                variant="filled"
                color="blue"
                leftSection={<IconRefresh size={14} />}
                onClick={() => {
                  onClose();
                  onPlayAgain();
                }}
              >
                Play Again
              </Button>
            )}
            <Button size="xs" variant="default" onClick={onClose}>
              Close & View Boards
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
};
