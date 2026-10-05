import { FC, useEffect, useMemo, useState } from 'react';
import {
  IconCheck,
  IconFlag,
  IconFlagFilled,
  IconHelpCircle,
  IconMoodSad,
  IconPlayerPlay,
  IconRefresh,
  IconShare,
  IconSwords,
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
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import { useRecordDefinitionRead } from '@/context/AchievementsContext';
import { useAuth } from '@/context/AuthContext';
import { ChallengerProfile } from '@/hooks/useChallenge';
import { useDefinition } from '@/hooks/useDefinition';
import { useFlaggedWords } from '@/hooks/useFlaggedWords';
import { useGameAchievements } from '@/hooks/useGameAchievements';
import { useLanguageFlags } from '@/hooks/useLanguageFlags';
import { GameDoc, Language } from '@/types/firestore';
import { labelFor, languagesFromGame } from '@/utils/languages';
import { shareGameResult } from '@/utils/shareUtils';
import { calculateScoreFromHistory, normalizeWord, scoringVersionOf } from '@/utils/wordUtils';
import { EarnedThisGame } from '../Badges/GameAchievements';
import { ChallengeFriendModal } from '../ChallengeFriendModal/ChallengeFriendModal';
import { FormattedDefinition } from '../FormattedDefinition/FormattedDefinition';
import { ProfileLink } from '../ProfileLink/ProfileLink';

interface PostGameModalProps {
  opened: boolean;
  onClose: () => void;
  gameSession: GameDoc;
  onPlayAgain?: () => void;
  challengerUser?: ChallengerProfile | null;
  challengerGame?: GameDoc | null;
  /** Opens the turn-by-turn head-to-head replay against the challenger. */
  onWatchDuel?: () => void;
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
  const recordDefinitionRead = useRecordDefinitionRead();

  useEffect(() => {
    if (expanded && data) {
      recordDefinitionRead(lang, normSolution);
    }
  }, [expanded, data, lang, normSolution, recordDefinitionRead]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleToggle = () => {
    if (!expanded && !data) {
      refetch();
    }
    setExpanded((prev) => !prev);
  };

  const langLabel = labelFor(lang);

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
                <FormattedDefinition def={data.def} size="xs" />
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
  onWatchDuel,
  challengerUser,
  challengerGame,
}) => {
  const { words, guessHistory, isWin, score } = gameSession;
  const { currentUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [challengeOpened, setChallengeOpened] = useState(false);

  const languages = languagesFromGame(gameSession);
  const solvedCount = languages.filter((l) =>
    guessHistory.map(normalizeWord).includes(normalizeWord(words[l]!))
  ).length;

  const effectiveIsWin = isWin ?? solvedCount === languages.length;
  const calculatedScore = useMemo(
    () => calculateScoreFromHistory(guessHistory, words, scoringVersionOf(gameSession)),
    [guessHistory, words, gameSession]
  );
  const effectiveScore = score ?? calculatedScore;
  const { feats, levelUps } = useGameAchievements(gameSession);

  const handleShare = async () => {
    setIsSharing(true);
    setShareError(false);
    try {
      await shareGameResult({
        gameSession: {
          ...gameSession,
          score: effectiveScore,
          isWin: effectiveIsWin,
        },
        currentUserId: currentUser?.uid,
        onCopied: () => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to share game result:', err);
      setShareError(true);
      setTimeout(() => setShareError(false), 3000);
    } finally {
      setIsSharing(false);
    }
  };

  const myScore = effectiveScore;
  const theirScore = challengerGame?.score ?? 0;
  const hasChallenger = !!challengerGame?.completedAt;
  const challengerStillPlaying = !!challengerGame && !challengerGame.completedAt;
  const isChallengerWin = myScore > theirScore;
  const isChallengerLoss = myScore < theirScore;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      size="md"
      title={
        <Group gap="xs">
          <ThemeIcon
            color={effectiveIsWin ? 'yellow' : 'gray'}
            variant="light"
            radius="xl"
            size="sm"
          >
            {effectiveIsWin ? <IconTrophy size={14} /> : <IconMoodSad size={14} />}
          </ThemeIcon>
          <Text fw={700} size="md">
            {effectiveIsWin ? 'Match Summary & Results' : 'Game Over — Solutions Revealed'}
          </Text>
        </Group>
      }
    >
      <Stack gap="md">
        {/* Banner */}
        <Paper p="xs" radius="md" bg={effectiveIsWin ? 'teal.9' : 'dark.7'} withBorder>
          <Group justify="space-between" align="center">
            <Box>
              <Text size="sm" fw={700} c={effectiveIsWin ? 'teal.1' : 'gray.2'}>
                {effectiveIsWin
                  ? `🎉 Victory! All ${languages.length} Solved in ${guessHistory.length}/${MAX_GUESSES} turns`
                  : `❌ ${solvedCount}/${languages.length} Languages Solved in ${guessHistory.length}/${MAX_GUESSES} turns`}
              </Text>
              <Text size="xs" c={effectiveIsWin ? 'teal.1' : 'gray.4'} fw={600} opacity={0.9}>
                Final Score: {effectiveScore} pts
              </Text>
            </Box>
            <Badge color={effectiveIsWin ? 'teal' : 'red'} size="lg">
              {effectiveScore} PTS
            </Badge>
          </Group>
        </Paper>

        {/* Head-to-Head Showdown (if challenge mode) */}
        {hasChallenger && (
          <Paper
            p="xs"
            radius="md"
            withBorder
            bg="dark.8"
            style={{
              borderColor: isChallengerWin
                ? 'var(--mantine-color-teal-6)'
                : isChallengerLoss
                  ? 'var(--mantine-color-red-6)'
                  : 'var(--mantine-color-yellow-6)',
            }}
          >
            <Group justify="space-between" align="center" mb={6}>
              <Group gap={6}>
                <IconSwords size={16} color="var(--mantine-color-yellow-4)" />
                <Text size="xs" fw={700} c="dimmed">
                  HEAD-TO-HEAD SHOWDOWN
                </Text>
              </Group>
              <Badge
                color={isChallengerWin ? 'teal' : isChallengerLoss ? 'red' : 'yellow'}
                variant="light"
                size="sm"
              >
                {isChallengerWin ? '🏆 You Won!' : isChallengerLoss ? '🥈 Defeated' : '🤝 Tied'}
              </Badge>
            </Group>

            <SimpleGrid cols={2} spacing="xs">
              <Paper p="xs" radius="sm" bg="dark.7" withBorder>
                <Text size="xs" c="dimmed">
                  You
                </Text>
                <Text size="sm" fw={800} c={isChallengerWin ? 'teal.4' : 'gray.1'}>
                  {myScore} pts
                </Text>
                <Text size="xs" c="dimmed">
                  {guessHistory.length}/{MAX_GUESSES} turns
                </Text>
              </Paper>

              <Paper p="xs" radius="sm" bg="dark.7" withBorder>
                <ProfileLink userId={challengerGame.userId}>
                  <Text size="xs" c="dimmed">
                    {challengerUser?.displayName || 'Challenger'}
                  </Text>
                </ProfileLink>
                <Text size="sm" fw={800} c={isChallengerLoss ? 'teal.4' : 'gray.1'}>
                  {theirScore} pts
                </Text>
                <Text size="xs" c="dimmed">
                  {challengerGame.guessHistory.length}/{MAX_GUESSES} turns
                </Text>
              </Paper>
            </SimpleGrid>
            {onWatchDuel && (
              <Button
                fullWidth
                mt="xs"
                size="xs"
                variant="light"
                leftSection={<IconPlayerPlay size={14} />}
                onClick={onWatchDuel}
              >
                Watch the replay
              </Button>
            )}
          </Paper>
        )}

        {challengerStillPlaying && (
          <Paper p="xs" radius="md" withBorder bg="dark.8">
            <Group gap={6}>
              <IconSwords size={16} color="var(--mantine-color-yellow-4)" />
              <Text size="xs" c="dimmed">
                <ProfileLink userId={challengerGame?.userId}>
                  {challengerUser?.displayName || 'Your opponent'}
                </ProfileLink>{' '}
                hasn&apos;t finished yet. You&apos;ll see the result in Challenges.
              </Text>
            </Group>
          </Paper>
        )}

        <EarnedThisGame feats={feats} levelUps={levelUps} />

        {/* Target Words & Definitions */}
        <Stack gap="xs">
          <Text size="xs" fw={700} c="dimmed">
            TARGET WORDS & DEFINITIONS
          </Text>
          {languages.map((lang) => (
            <WordSummaryCard
              key={lang}
              lang={lang}
              solutionWord={words[lang]!}
              guessHistory={guessHistory}
            />
          ))}
        </Stack>

        {/* Action Controls */}
        <Group justify="flex-end" mt="xs" gap="xs">
          {currentUser && (
            <Button
              size="xs"
              variant="filled"
              color="grape"
              leftSection={<IconSwords size={14} />}
              onClick={() => setChallengeOpened(true)}
            >
              Challenge a friend
            </Button>
          )}
          <Button
            size="xs"
            variant="filled"
            color={shareError ? 'red' : copied ? 'teal' : 'blue'}
            leftSection={
              shareError ? (
                <IconMoodSad size={14} />
              ) : copied ? (
                <IconCheck size={14} />
              ) : (
                <IconShare size={14} />
              )
            }
            onClick={handleShare}
            loading={isSharing}
          >
            {shareError ? 'Share Failed' : copied ? 'Copied!' : 'Share'}
          </Button>
          {onPlayAgain && (
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconRefresh size={14} />}
              onClick={() => {
                onClose();
                onPlayAgain();
              }}
            >
              Play Again
            </Button>
          )}
        </Group>
      </Stack>
      <ChallengeFriendModal
        opened={challengeOpened}
        onClose={() => setChallengeOpened(false)}
        game={gameSession}
        excludeIds={challengerGame ? [challengerGame.userId] : []}
      />
    </Modal>
  );
};
