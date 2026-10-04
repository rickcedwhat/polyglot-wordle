import { FC, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Box,
  Center,
  Group,
  Loader,
  Paper,
  Progress,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { GameBoard } from '@/components/Gameboard/Gameboard';
import LanguageBoard from '@/components/LanguageBoard/LanguageBoard';
import MiniBoard from '@/components/MiniBoard/MiniBoard';
import { useReplay } from '@/hooks/useReplay';
import { useWordPools } from '@/hooks/useWordPools';
import { STORY_GAMES } from '@/storybook/fixtures';
import type { Language } from '@/types/firestore';
import { flagFor } from '@/utils/languages';
import { calculateScoreFromHistory, normalizeWord } from '@/utils/wordUtils';
import { ReplayBar } from './ReplayBar';

const PUZZLE = STORY_GAMES.quickWin;
const LANGS = PUZZLE.languages;
const SOLUTION = PUZZLE.words as Record<string, string>;

const PLAYERS = [
  { id: 'me', name: 'You', color: 'blue', guesses: PUZZLE.guesses },
  {
    id: 'alex',
    name: 'Alex',
    color: 'orange',
    guesses: ['audio', 'queso', 'plate', 'fruit', 'apple'],
  },
] as const;

type Player = (typeof PLAYERS)[number];
type Layout = 'pairs' | 'stacked' | 'swap';

const TURNS = Math.max(...PLAYERS.map((p) => p.guesses.length));
/** useReplay steps through turns; the labels are only typed out invisibly. */
const TURN_LABELS = Array.from({ length: TURNS }, (_, i) => String(i + 1));

const guessesAt = (player: Player, turn: number) => player.guesses.slice(0, turn) as string[];

const solvedLangs = (guesses: string[]) =>
  LANGS.filter((lang) => guesses.map(normalizeWord).includes(normalizeWord(SOLUTION[lang])));

/** "You 640 ▬▬▬|▬▬ 980 Alex", with each player's solved flags lighting up. */
const ScoreRace: FC<{ turn: number }> = ({ turn }) => {
  const [me, alex] = PLAYERS.map((player) => {
    const guesses = guessesAt(player, turn);
    return {
      player,
      score: calculateScoreFromHistory(guesses, SOLUTION),
      solved: solvedLangs(guesses),
    };
  });
  const total = Math.max(1, me.score + alex.score);
  const side = ({ player, score, solved }: typeof me, align: 'left' | 'right') => (
    <Stack gap={2} align={align === 'left' ? 'flex-start' : 'flex-end'}>
      <Text size="sm" fw={700} c={player.color}>
        {align === 'left' ? `${player.name} ${score}` : `${score} ${player.name}`}
      </Text>
      <Group gap={2}>
        {LANGS.map((lang) => (
          <Text
            key={lang}
            size="sm"
            style={{
              opacity: solved.includes(lang) ? 1 : 0.2,
              transition: 'opacity 300ms, transform 300ms',
              transform: solved.includes(lang) ? 'scale(1.15)' : 'none',
            }}
          >
            {flagFor(lang)}
          </Text>
        ))}
      </Group>
    </Stack>
  );
  return (
    <Group w="100%" maw={720} wrap="nowrap" gap="sm" align="center">
      {side(me, 'left')}
      <Progress.Root size="lg" radius="xl" style={{ flex: 1 }}>
        <Progress.Section
          value={(me.score / total) * 100}
          color={me.player.color}
          style={{ transition: 'width 600ms ease' }}
        />
        <Progress.Section
          value={(alex.score / total) * 100}
          color={alex.player.color}
          style={{ transition: 'width 600ms ease' }}
        />
      </Progress.Root>
      {side(alex, 'right')}
    </Group>
  );
};

function useBoardsData() {
  const { data: wordPools } = useWordPools(
    Object.fromEntries(LANGS.map((lang) => [lang, 'advanced' as const]))
  );
  return wordPools;
}

/** Each language shows your board and theirs next to each other. */
const PairsLayout: FC<{ turn: number }> = ({ turn }) => {
  const wordPools = useBoardsData();
  const isNarrow = useMediaQuery('(max-width: 48em)') ?? false;
  const [lang, setLang] = useState<Language>(LANGS[1]);
  if (!wordPools) {
    return <Loader />;
  }
  const shown = isNarrow ? [lang] : LANGS;
  return (
    <Stack w="100%" align="center" gap="sm">
      {isNarrow && (
        <SegmentedControl
          value={lang}
          onChange={(value) => setLang(value as Language)}
          data={LANGS.map((l) => ({ value: l, label: flagFor(l) }))}
        />
      )}
      <Group w="100%" gap="md" justify="center" wrap="nowrap" align="flex-start">
        {shown.map((l) => (
          <Paper key={l} withBorder radius="md" p="xs" style={{ flex: '1 1 0', maxWidth: 420 }}>
            {!isNarrow && (
              <Text ta="center" mb={4}>
                {flagFor(l)}
              </Text>
            )}
            <Group gap="xs" wrap="nowrap" align="flex-start">
              {PLAYERS.map((player) => (
                <Stack key={player.id} gap={4} style={{ flex: '1 1 0', minWidth: 0 }}>
                  <Text size="xs" fw={700} ta="center" c={player.color}>
                    {player.name}
                  </Text>
                  <LanguageBoard
                    language={l}
                    solutionWord={SOLUTION[l]}
                    submittedGuesses={guessesAt(player, turn)}
                    words={wordPools.master[l] ?? []}
                    dictionary={wordPools.dictionaries[l]}
                    candidateLanguages={[l]}
                    hideFlags
                  />
                </Stack>
              ))}
            </Group>
          </Paper>
        ))}
      </Group>
    </Stack>
  );
};

/** Your boards at full size, theirs as mini boards above. */
const StackedLayout: FC<{ turn: number }> = ({ turn }) => {
  const [me, alex] = PLAYERS;
  return (
    <Stack w="100%" align="center" gap="sm">
      <Group gap="lg" justify="center" wrap="nowrap">
        <Text size="sm" fw={700} c={alex.color}>
          {alex.name}
        </Text>
        {LANGS.map((lang) => (
          <Stack key={lang} gap={2} align="center">
            <Text size="xs">{flagFor(lang)}</Text>
            <MiniBoard solutionWord={SOLUTION[lang]} submittedGuesses={guessesAt(alex, turn)} />
          </Stack>
        ))}
      </Group>
      <Text size="sm" fw={700} c={me.color}>
        {me.name}
      </Text>
      <GameBoard solution={SOLUTION} guesses={guessesAt(me, turn)} shuffledLanguages={LANGS} />
    </Stack>
  );
};

/** One set of boards; a switch picks whose boards they are at the current turn. */
const SwapLayout: FC<{ turn: number }> = ({ turn }) => {
  const [playerId, setPlayerId] = useState<Player['id']>('me');
  const player = PLAYERS.find((p) => p.id === playerId)!;
  return (
    <Stack w="100%" align="center" gap="sm">
      <SegmentedControl
        value={playerId}
        onChange={(value) => setPlayerId(value as Player['id'])}
        data={PLAYERS.map((p) => ({ value: p.id, label: p.name }))}
        color={player.color}
      />
      <GameBoard solution={SOLUTION} guesses={guessesAt(player, turn)} shuffledLanguages={LANGS} />
    </Stack>
  );
};

const LAYOUTS: Record<Layout, FC<{ turn: number }>> = {
  pairs: PairsLayout,
  stacked: StackedLayout,
  swap: SwapLayout,
};

const HeadToHeadMockup: FC<{ layout: Layout }> = ({ layout }) => {
  const replay = useReplay(TURN_LABELS);
  const Boards = LAYOUTS[layout];
  return (
    <Center>
      <Stack w="100%" maw={1100} align="center" gap="md" py="md">
        <ScoreRace turn={replay.step} />
        <Box w="100%">
          <Boards turn={replay.step} />
        </Box>
        <ReplayBar replay={replay} solvedSteps={[]} />
      </Stack>
    </Center>
  );
};

const meta: Meta<typeof HeadToHeadMockup> = {
  title: 'Replay/Head-to-head (mockups)',
  component: HeadToHeadMockup,
  parameters: { viewport: { defaultViewport: 'laptop' } },
};

export default meta;
type Story = StoryObj<typeof HeadToHeadMockup>;

/** Your board and theirs side by side for each language; phones pick a language. */
export const PairsByLanguage: Story = { name: 'Pairs by language', args: { layout: 'pairs' } };

/** Your boards full size, theirs as mini boards above, race bar on top. */
export const Stacked: Story = { args: { layout: 'stacked' } };

/** One set of boards with a You / Alex switch. */
export const Swap: Story = { args: { layout: 'swap' } };
