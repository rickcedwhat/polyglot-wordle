import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Badge, Group, Stack } from '@mantine/core';
import { MAX_GUESSES } from '@/config';
import { useCountUp } from '@/hooks/useCountUp';
import {
  replayArgTypes,
  replayDefaultArgs,
  useReplayArgsUpdater,
  useReplayStoryGame,
  type ReplayArgs,
  type UpdateReplayArgs,
} from '@/storybook/replayArgs';
import { StoryGameArea } from '@/storybook/StoryGameArea';
import { flagFor } from '@/utils/languages';

interface StoryArgs extends ReplayArgs {
  showSolution: boolean;
  slowMotion: number;
}

const meta: Meta<StoryArgs> = {
  title: 'Game/ScorePopups',
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    ...replayArgTypes,
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
    ...replayDefaultArgs,
    showSolution: true,
    slowMotion: 1,
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

const PlayableGame = ({ updateArgs, ...args }: StoryArgs & { updateArgs: UpdateReplayArgs }) => {
  const { showSolution, slowMotion } = args;
  const game = useReplayStoryGame(args, updateArgs);
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
      <StoryGameArea game={game} />
    </Stack>
  );
};

export const Playable: Story = {
  name: 'Playable Game',
  render: function Render(args) {
    const updateArgs = useReplayArgsUpdater();
    return <PlayableGame key={args.game} {...args} updateArgs={updateArgs} />;
  },
};
