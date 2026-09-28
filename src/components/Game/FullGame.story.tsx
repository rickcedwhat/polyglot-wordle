import { useEffect, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  IconAdjustmentsHorizontal,
  IconHelpCircle,
  IconHome,
  IconLanguage,
  IconRefresh,
} from '@tabler/icons-react';
import { AppShell, Badge, Box, Burger, Button, Divider, Group, Stack, Text } from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { Score } from '@/components/Score/Score';
import { ScoreProvider, useScore } from '@/context/ScoreContext';
import { STORY_GAME_KEYS, STORY_GAMES, type StoryGameKey } from '@/storybook/fixtures';
import { GameReplayControls } from '@/storybook/GameReplayControls';
import { StoryGameArea } from '@/storybook/StoryGameArea';
import { useStoryGame } from '@/storybook/useStoryGame';
import { flagFor } from '@/utils/languages';

interface StoryArgs {
  game: StoryGameKey;
  showSolution: boolean;
  showReplayControls: boolean;
  slowMotion: number;
}

const meta: Meta<StoryArgs> = {
  title: 'Game/Full Game',
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    game: {
      control: {
        type: 'select',
        labels: Object.fromEntries(STORY_GAME_KEYS.map((key) => [key, STORY_GAMES[key].label])),
      },
      options: STORY_GAME_KEYS,
      description: 'Saved game to step through. Type your own guess at any step to branch.',
    },
    showSolution: { control: { type: 'boolean' } },
    showReplayControls: { control: { type: 'boolean' } },
    slowMotion: {
      control: { type: 'range', min: 1, max: 6, step: 0.5 },
      description: 'Stretch the tile + popup animations (1 = real speed).',
    },
  },
  args: {
    game: 'realGame',
    showSolution: false,
    showReplayControls: true,
    slowMotion: 1,
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

/** Visual stand-in for the real Sidebar (which needs auth, challenges and routing). */
const MockSidebar = () => (
  <Stack gap="xs" h="100%">
    <Text fw={800} size="lg">
      Polyglot Wordle
    </Text>
    <Divider />
    <Button variant="subtle" justify="flex-start" leftSection={<IconHome size={16} />}>
      Home
    </Button>
    <Button variant="subtle" justify="flex-start" leftSection={<IconRefresh size={16} />}>
      New Game
    </Button>
    <Button variant="subtle" justify="flex-start" leftSection={<IconLanguage size={16} />}>
      Languages
    </Button>
    <Button
      variant="subtle"
      justify="flex-start"
      leftSection={<IconAdjustmentsHorizontal size={16} />}
    >
      Difficulty
    </Button>
    <Button variant="subtle" justify="flex-start" leftSection={<IconHelpCircle size={16} />}>
      How to Play
    </Button>
    <Box mt="auto">
      <Score />
    </Box>
  </Stack>
);

const FullGame = ({ game: gameKey, showSolution, showReplayControls, slowMotion }: StoryArgs) => {
  const game = useStoryGame(STORY_GAMES[gameKey]);
  const { recalculateScore } = useScore();
  const [opened, { toggle }] = useDisclosure(false);
  const isMobile = useMediaQuery('(max-width: 48em)');

  useEffect(() => {
    recalculateScore(game.guesses, game.solution);
  }, [game.guesses, game.solution, recalculateScore]);

  const animationVars = {
    '--score-tile-duration': `${1100 * slowMotion}ms`,
    '--score-popup-duration': `${1800 * slowMotion}ms`,
  } as CSSProperties;

  return (
    <Box h="100vh" style={animationVars}>
      <AppShell
        h="100%"
        header={isMobile ? { height: 60 } : undefined}
        navbar={{ width: 200, breakpoint: 'sm', collapsed: { mobile: !opened } }}
        padding="md"
      >
        {isMobile && (
          <AppShell.Header p="md" style={{ display: 'flex', alignItems: 'center' }}>
            <Burger opened={opened} onClick={toggle} size="sm" />
            <Group justify="center" style={{ flex: 1 }}>
              {!opened && <Score orientation="horizontal" />}
            </Group>
            <Burger size="sm" style={{ visibility: 'hidden' }} />
          </AppShell.Header>
        )}
        <AppShell.Navbar p="md">
          <MockSidebar />
        </AppShell.Navbar>
        <AppShell.Main h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
          {(showReplayControls || showSolution) && (
            <Stack gap={6} mb="xs">
              {showSolution && (
                <Group gap="xs" justify="center">
                  {game.languages.map((lang) => (
                    <Badge key={lang} variant="light">
                      {flagFor(lang)} {game.solution[lang]}
                    </Badge>
                  ))}
                </Group>
              )}
              {showReplayControls && <GameReplayControls game={game} />}
            </Stack>
          )}
          <Box style={{ flex: 1, minHeight: 0 }}>
            <StoryGameArea game={game} />
          </Box>
        </AppShell.Main>
      </AppShell>
    </Box>
  );
};

export const Playable: Story = {
  name: 'Full Game (replayable)',
  render: (args) => (
    <ScoreProvider>
      <FullGame key={args.game} {...args} />
    </ScoreProvider>
  ),
};
