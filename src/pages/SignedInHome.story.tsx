import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { useQueryClient } from '@tanstack/react-query';
import { Timestamp } from 'firebase/firestore';
import { Route, Routes } from 'react-router-dom';
import { AuthContext, useAuth } from '@/context/AuthContext';
import { SidebarProvider } from '@/context/SidebarContext';
import { SidebarLayout } from '@/layouts/SidebarLayout';
import { MockAuth } from '@/storybook/MockAuth';
import type { ChallengeDoc, GameDoc, UserDoc } from '@/types/firestore';
import { buildTimeline, reactionKey, type ActivityRecord } from '@/utils/activityTimeline';
import { SignedInHomePage } from './SignedInHome.page';

const PROFILES = {
  alex: { displayName: 'Alex Rivera', photoURL: '', pinnedGames: [] } as unknown as UserDoc,
  sam: { displayName: 'Sam Okafor', photoURL: '', pinnedGames: [] } as unknown as UserDoc,
};
const games: (GameDoc & { id: string })[] = ['alex', 'sam'].map((userId, i) => ({
  id: `${userId}_home-${i}`,
  userId,
  gameId: `home-${i}`,
  words: { en: 'apple', es: 'rubia', fr: 'merci' },
  difficulties: { en: 'basic', es: 'basic', fr: 'basic' },
  shuffledLanguages: ['en', 'es', 'fr'],
  guessHistory: i === 0 ? ['crane', 'apple', 'rubia', 'merci'] : ['apple', 'rubia', 'merci'],
  isLiveGame: false,
  isWin: true,
  score: i === 0 ? 1240 : 1530,
  scoringVersion: 3,
  startedAt: Timestamp.fromMillis(1792252800000),
  completedAt: Timestamp.fromMillis(1792253400000),
}));

const SignedInHomeStory = ({
  state = 'active',
}: {
  state?: 'active' | 'caught-up' | 'first-visit';
}) => {
  const client = useQueryClient();
  const auth = useAuth();
  useState(() => {
    client.setDefaultOptions({
      queries: {
        retry: false,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    });
    for (const [id, profile] of Object.entries(PROFILES)) {
      client.setQueryData(['userProfile', id], profile);
      client.setQueryData(['vocabulary', id], { en: {}, es: {}, fr: {}, it: {}, pt: {} });
    }
    client.setQueryData(['userProfile', 'me'], {
      displayName: 'Cedrick',
      photoURL: '',
      pinnedGames: [],
      languagePrefs: { languages: ['en', 'es', 'pt'], skipPicker: false },
    });
    client.setQueryData(['friendships', 'me'], []);
    client.setQueryData(['playedGame', 'me', 'home-0'], null);
    client.setQueryData(['playedGame', 'me', 'home-1'], { ...games[1], userId: 'me' });
    client.setQueryData(
      ['headToHead', 'home-1', 'me', 'sam'],
      [{ ...games[1], userId: 'me' }, games[1]]
    );
    const records: ActivityRecord[] = [
      ...Array.from({ length: 5 }, (_, i) => ({
        type: 'game' as const,
        game: { ...games[0], id: `alex_home-${i}`, gameId: `home-${i}` },
      })),
      {
        type: 'certification',
        certification: {
          id: 'cert_sam_pt_2',
          userId: 'sam',
          lang: 'pt',
          level: 2,
          wordCount: 150,
          createdAt: Timestamp.fromMillis(1792257000000),
        },
      },
      {
        type: 'game',
        game: {
          ...games[1],
          activity: {
            feats: [],
            firstGame: false,
            personalBest: true,
            streak: null,
          },
        },
      },
    ];
    for (const entry of buildTimeline(records)) {
      if (entry.type !== 'games') {
        const target =
          entry.type === 'certification'
            ? { kind: entry.type, sourceId: entry.certification.id, ownerId: entry.userId }
            : { kind: entry.type, sourceId: entry.game.id, ownerId: entry.userId };
        client.setQueryData(['activityReactions', reactionKey(target), 'me'], []);
      }
    }
    records.forEach((record) => {
      if (record.type === 'game') {
        const playedKey = ['playedGame', 'me', record.game.gameId];
        if (client.getQueryData(playedKey) === undefined) {
          client.setQueryData(playedKey, null);
        }
        client.setQueryData(['activityReactions', `${record.game.id}__game`, 'me'], []);
      }
    });
    client.setQueryData(['activityTimeline', 'me'], {
      pages: [{ records: state === 'first-visit' ? [] : records }],
      pageParams: [undefined],
    });
    const participant = (displayName: string, score: number | null) => ({
      displayName,
      score,
      photoURL: '',
      rsvp: 'accepted' as const,
      completedAt: score === null ? null : Timestamp.fromMillis(1792253400000),
    });
    const challenges: (ChallengeDoc & { id: string })[] = ['alex', 'sam'].map((id, i) => ({
      id: `home-challenge-${i}`,
      gameId: `home-${i}`,
      createdAt: Timestamp.fromMillis(1792252800000),
      createdBy: id,
      source: 'friend_invite',
      type: 'direct',
      maxPlayers: 2,
      status: i === 0 ? 'pending' : 'completed',
      participantIds: ['me', id],
      winnerId: i === 0 ? null : 'tie',
      participants: {
        me: {
          ...participant('Cedrick', i === 0 ? null : 1530),
          rsvp: i === 0 ? 'pending' : 'accepted',
        },
        [id]: participant(PROFILES[id as keyof typeof PROFILES].displayName, i === 0 ? 1240 : 1530),
      },
    }));
    client.setQueryData(['challenges', 'me'], state === 'active' ? challenges : []);
  });
  return (
    <AuthContext.Provider
      value={{
        ...auth,
        currentUser: auth.currentUser ? { ...auth.currentUser, displayName: 'Cedrick' } : null,
      }}
    >
      <SidebarProvider>
        <Routes>
          <Route element={<SidebarLayout />}>
            <Route path="*" element={<SignedInHomePage />} />
          </Route>
        </Routes>
      </SidebarProvider>
    </AuthContext.Provider>
  );
};
const meta: Meta<typeof SignedInHomeStory> = {
  title: 'Home/Signed-in home',
  component: SignedInHomeStory,
  parameters: { layout: 'fullscreen', fullBleed: true },
  decorators: [
    (Story) => (
      <MockAuth>
        <Story />
      </MockAuth>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof SignedInHomeStory>;
export const WithChallenges: Story = {};
export const AllCaughtUp: Story = { args: { state: 'caught-up' } };
export const FirstVisit: Story = { args: { state: 'first-visit' } };
