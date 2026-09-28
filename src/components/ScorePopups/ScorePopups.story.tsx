import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge, Group, Stack } from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import { useCountUp } from '@/hooks/useCountUp';
import { STORY_GAME_KEYS, STORY_GAMES, type StoryGameKey } from '@/storybook/fixtures';
import { GameReplayControls } from '@/storybook/GameReplayControls';
import { StoryGameArea } from '@/storybook/StoryGameArea';
import { useStoryGame } from '@/storybook/useStoryGame';
import { flagFor } from '@/utils/languages';

interface StoryArgs {
  game: StoryGameKey;
  showSolution: boolean;
  slowMotion: number;
}

const meta: Meta<StoryArgs> = {
  title: 'Game/ScorePopups',
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
    showSolution: {
      control: { type: 'boolean' },
      description: 'Show the solution words.',
    },
    slowMotion: {
      control: { type: 'range', min: 1, max: 6, step: 0.5 },
      description: 'Stretch the tile + popup animations to inspect them (1 = real speed).',
    },
  },
  args: {
    game: 'realGame',
    showSolution: true,
    slowMotion: 1,
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

const PlayableGame = ({ game: gameKey, showSolution, slowMotion }: StoryArgs) => {
  const game = useStoryGame(STORY_GAMES[gameKey]);
  const displayScore = useCountUp(game.score);

  const animationVars = {
    '--score-tile-duration': `${1100 * slowMotion}ms`,
    '--score-popup-duration': `${1800 * slowMotion}ms`,
  } as CSSProperties;

  return (
    <Stack gap="xs" p="md" h="100vh" style={animationVars}>
      <Group justify="space-between" wrap="wrap" gap="xs">
        <Group gap="xs">
          {showSolution &&
            game.languages.map((lang) => (
              <Badge key={lang} variant="light" size="lg">
                {flagFor(lang)} {game.solution[lang]}
              </Badge>
            ))}
        </Group>
        <Group gap="xs">
          <Badge variant="outline" size="lg">
            Score {displayScore}
          </Badge>
          <Badge variant="outline" size="lg">
            {game.guesses.length}/{MAX_GUESSES}
          </Badge>
        </Group>
      </Group>
      <GameReplayControls game={game} />
      <StoryGameArea game={game} />
    </Stack>
  );
};

export const Playable: Story = {
  name: 'Playable Game',
  render: (args) => <PlayableGame key={args.game} {...args} />,
};
