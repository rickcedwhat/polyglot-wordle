import type { Meta, StoryObj } from '@storybook/react';
import { Box, Stack, Text } from '@mantine/core';
import type { Language } from '@/types/firestore';
import type { Dictionary } from '@/utils/wordUtils';
import { GameBoard, type GameBoardWordPools } from './Gameboard';

const SOLUTION = { en: 'apple', es: 'queso', fr: 'fruit' };
const SHUFFLED: Language[] = ['en', 'es', 'fr'];

const entry = (display: string, def: string): Dictionary[string] => ({
  display,
  d: 0.2,
  pos: 'noun',
  def,
  reviewed: true,
});

/** Minimal dictionaries so Storybook does not fetch public/*.json */
const buildPools = (): GameBoardWordPools => {
  const words = ['apple', 'crane', 'queso', 'fruit', 'audio', 'pilot', 'flame', 'melon'];
  const dictionaries = {
    en: Object.fromEntries(words.map((w) => [w, entry(w, `English gloss for ${w}.`)])),
    es: Object.fromEntries(words.map((w) => [w, entry(w, `Spanish gloss for ${w}.`)])),
    fr: Object.fromEntries(words.map((w) => [w, entry(w, `French gloss for ${w}.`)])),
  } as Record<Language, Dictionary>;

  return {
    dictionaries,
    master: {
      en: Object.keys(dictionaries.en),
      es: Object.keys(dictionaries.es),
      fr: Object.keys(dictionaries.fr),
    },
  };
};

const WORD_POOLS = buildPools();

const WIDTHS = [
  { label: 'Mobile 375', width: 375 },
  { label: 'Tablet 768', width: 768 },
  { label: 'Desktop 1100', width: 1100 },
] as const;

const ACTIVE_LABELS = ['Left active', 'Center active', 'Right active'] as const;

function BoardFrame({
  width,
  label,
  activeIndex,
  guesses,
}: {
  width: number;
  label: string;
  activeIndex: number;
  guesses: string[];
}) {
  return (
    <Box
      style={{
        width,
        flexShrink: 0,
        border: '1px solid var(--mantine-color-dark-4)',
        borderRadius: 8,
        padding: 12,
        background: 'var(--mantine-color-body)',
      }}
    >
      <Text size="xs" fw={600} mb={8}>
        {label} · {ACTIVE_LABELS[activeIndex]}
      </Text>
      <GameBoard
        solution={SOLUTION}
        shuffledLanguages={SHUFFLED}
        guesses={guesses}
        initialActiveIndex={activeIndex}
        wordPoolsOverride={WORD_POOLS}
      />
    </Box>
  );
}

const meta: Meta<typeof GameBoard> = {
  title: 'Game/GameBoard',
  component: GameBoard,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    solution: SOLUTION,
    shuffledLanguages: SHUFFLED,
    guesses: [],
    hideFlags: false,
    initialActiveIndex: 1,
    wordPoolsOverride: WORD_POOLS,
  },
};

export default meta;
type Story = StoryObj<typeof GameBoard>;

/** Interactive single board — use Controls + click side boards */
export const Playground: Story = {
  name: 'Playground',
  args: {
    initialActiveIndex: 1,
    guesses: ['crane'],
  },
  decorators: [
    (Story) => (
      <Box px="sm" py="md" maw={720} mx="auto">
        <Text size="xs" c="dimmed" mb="sm">
          Active board tiles must stay larger than inactive mini boards. Click a side board to
          switch focus.
        </Text>
        <Story />
      </Box>
    ),
  ],
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

/**
 * Full regression matrix: three viewport widths × three active-board states.
 * Open this before shipping layout CSS changes.
 */
export const LayoutMatrix: Story = {
  name: 'Layout matrix (sizes × active)',
  render: () => (
    <Stack gap="xl" p="md" style={{ overflowX: 'auto' }}>
      <Text size="sm" c="dimmed" maw={720}>
        Compare active vs mini tile size across widths and which board is focused. Active tiles
        should always read larger than the inactive boards in the same row.
      </Text>
      {WIDTHS.map(({ label, width }) => (
        <Stack key={width} gap="md">
          <Text fw={700} size="sm">
            {label}
          </Text>
          <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {[0, 1, 2].map((activeIndex) => (
              <BoardFrame
                key={`${width}-${activeIndex}`}
                width={width}
                label={label}
                activeIndex={activeIndex}
                guesses={['crane', 'audio']}
              />
            ))}
          </Box>
        </Stack>
      ))}
    </Stack>
  ),
};

export const MidGameCandidatesMobile: Story = {
  name: 'Mid-game candidates · Mobile',
  args: {
    initialActiveIndex: 1,
    guesses: ['crane', 'pilot', 'flame'],
  },
  decorators: [
    (Story) => (
      <Box px="sm" py="md" style={{ width: 375, margin: '0 auto' }}>
        <Story />
      </Box>
    ),
  ],
};
