import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useQueryClient } from '@tanstack/react-query';
import { MockAuth } from '@/storybook/MockAuth';
import type { GameDoc } from '@/types/firestore';
import { ChallengeFriendModal } from './ChallengeFriendModal';

const FRIENDS = [
  { id: 'alex', displayName: 'Alex Rivera' },
  { id: 'sam', displayName: 'Sam Okafor' },
  { id: 'marido', displayName: 'Marido' },
  { id: 'kim', displayName: 'Kim Tanaka' },
];

/** Seeds the friends list, friend profiles and the player's language prefs. */
const SeedFriends = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  useState(() => {
    queryClient.setQueryData(
      ['friendships', 'me'],
      FRIENDS.map(({ id }) => ({ id, status: 'accepted', direction: null }))
    );
    FRIENDS.forEach(({ id, displayName }) => {
      queryClient.setQueryData(['userProfile', id], { displayName, photoURL: '' });
      // Marido already played story-game, so they show as "Played".
      queryClient.setQueryData(['friendPlayed', id, 'story-game'], id === 'marido');
    });
    // Sam was already challenged on story-game, so they show as "Challenged".
    queryClient.setQueryData(
      ['challenges', 'me'],
      [
        {
          id: 'me_story-game_sam',
          gameId: 'story-game',
          createdBy: 'me',
          participantIds: ['me', 'sam'],
          participants: {
            me: {
              displayName: 'You',
              photoURL: '',
              score: 7,
              rsvp: 'accepted',
              completedAt: null,
              resultSeenAt: null,
            },
            sam: {
              displayName: 'Sam Okafor',
              photoURL: '',
              score: null,
              rsvp: 'pending',
              completedAt: null,
              resultSeenAt: null,
            },
          },
          source: 'friend_invite',
          type: 'direct',
          maxPlayers: 2,
          winnerId: null,
          status: 'pending',
        },
      ]
    );
    queryClient.setQueryData(['userProfile', 'me'], {
      displayName: 'You',
      languagePrefs: { languages: ['en', 'es', 'pt'], skipPicker: false },
      difficultyPrefs: { en: 'basic', es: 'basic', fr: 'basic', it: 'basic', pt: 'basic' },
    });
  });
  return children;
};

const meta: Meta<typeof ChallengeFriendModal> = {
  title: 'Challenges/Challenge a friend',
  component: ChallengeFriendModal,
  args: { opened: true, onClose: () => {} },
  decorators: [
    (Story) => (
      <MockAuth>
        <SeedFriends>
          <Story />
        </SeedFriends>
      </MockAuth>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChallengeFriendModal>;

/** From the post-game screen: challenge on the game you just finished. */
export const OnThisGame: Story = {
  args: { game: { gameId: 'story-game' } as GameDoc },
};

/** From the Challenges tab: pick friends, then languages for a new game. */
export const NewGame: Story = {};

/** From a friend's profile or Rematch: straight to the language step. */
export const NewGameWithFriend: Story = {
  args: { friend: { id: 'marido', displayName: 'Marido', photoURL: '' } },
};
