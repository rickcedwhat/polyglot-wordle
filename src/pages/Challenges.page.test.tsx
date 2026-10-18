import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { beforeEach, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { ChallengesPage } from './Challenges.page';

const state = vi.hoisted(() => ({
  challenges: [] as { gameId: string; createdBy: string; source: string }[],
  remove: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('@/hooks/useChallenges', () => ({
  useChallenges: () => ({
    challenges: state.challenges,
    needsYou: [],
    waiting: [],
    archive: [],
    isLoading: false,
    isError: false,
  }),
}));
vi.mock('@/hooks/useSharedInvites', () => ({
  useSharedInvites: () => ({
    invites: [
      { gameId: 'puzzle', languages: ['en', 'es', 'fr'], createdAt: Timestamp.fromMillis(1) },
    ],
    isLoading: false,
    isError: false,
    remove: state.remove,
  }),
}));
vi.mock('@/components/ChallengeFriendModal/ChallengeFriendModal', () => ({
  ChallengeFriendModal: () => null,
}));
vi.mock('@/utils/shareUtils', () => ({ shareChallengeLink: vi.fn() }));
beforeEach(() => {
  state.challenges = [];
  state.remove.mockClear();
});
it('shows a shared link in Waiting before an opponent starts', async () => {
  render(
    <MantineProvider>
      <ChallengesPage />
    </MantineProvider>
  );
  expect(screen.getByText('Link shared')).toBeInTheDocument();
  expect(screen.getByText('Waiting for someone to join')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Share again' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect(state.remove).toHaveBeenCalledWith('puzzle');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Remove' })).toBeEnabled());
});
it('replaces the open reminder when recipients start playing the shared puzzle', () => {
  state.challenges = [
    { gameId: 'puzzle', createdBy: 'me', source: 'share' },
    { gameId: 'puzzle', createdBy: 'me', source: 'share' },
  ];
  render(
    <MantineProvider>
      <ChallengesPage />
    </MantineProvider>
  );
  expect(screen.queryByText('Link shared')).not.toBeInTheDocument();
});
it('keeps the reminder when another player has shared the same puzzle', () => {
  state.challenges = [{ gameId: 'puzzle', createdBy: 'someone-else', source: 'share' }];
  render(
    <MantineProvider>
      <ChallengesPage />
    </MantineProvider>
  );
  expect(screen.getByText('Link shared')).toBeInTheDocument();
});
