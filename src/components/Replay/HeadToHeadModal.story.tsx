import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@mantine/core';
import { DUEL_LANGUAGES, DUEL_PLAYERS, DUEL_WORDS } from '@/storybook/duelFixture';
import type { GameDoc } from '@/types/firestore';
import { HeadToHeadModal, type HeadToHeadSide } from './HeadToHeadModal';

const GAME_ID = 'story-duel';
const SIDES: [HeadToHeadSide, HeadToHeadSide] = [
  { userId: 'me', name: 'You', photoURL: DUEL_PLAYERS[0].photoURL },
  { userId: 'thiery', name: 'Thiery', photoURL: DUEL_PLAYERS[1].photoURL },
];

/** Seeds both players' game docs so the modal skips Firestore. */
const Demo = () => {
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(true);
  useState(() =>
    queryClient.setQueryData(
      ['headToHead', GAME_ID, 'me', 'thiery'],
      DUEL_PLAYERS.map(
        (p) =>
          ({
            userId: p.id,
            gameId: GAME_ID,
            words: DUEL_WORDS,
            shuffledLanguages: DUEL_LANGUAGES,
            guessHistory: p.guesses,
            scoringVersion: 2,
          }) as unknown as GameDoc
      )
    )
  );
  return (
    <>
      <Button onClick={() => setOpened(true)}>Watch the replay</Button>
      <HeadToHeadModal
        opened={opened}
        onClose={() => setOpened(false)}
        gameId={GAME_ID}
        sides={SIDES}
      />
    </>
  );
};

const meta: Meta<typeof Demo> = { title: 'Replay/Head-to-head modal', component: Demo };

export default meta;
type Story = StoryObj<typeof Demo>;

/** What opens from Showdown, the post-game Head-to-Head panel, and a friend's game. */
export const YouVsThiery: Story = { name: 'You vs Thiery' };

export const Phone: Story = {
  name: 'You vs Thiery on a phone',
  parameters: { viewport: { defaultViewport: 'phone' } },
};
