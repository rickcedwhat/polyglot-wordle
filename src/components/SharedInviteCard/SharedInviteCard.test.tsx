import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Timestamp } from 'firebase/firestore';
import { beforeEach, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { shareChallengeLink } from '@/utils/shareUtils';
import { SharedInviteCard } from './SharedInviteCard';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: { uid: 'me' } }) }));
vi.mock('@/utils/shareUtils', () => ({ shareChallengeLink: vi.fn().mockResolvedValue(undefined) }));
const invite = {
  gameId: 'puzzle',
  languages: ['en', 'es', 'fr'] as const,
  createdAt: Timestamp.fromMillis(1),
};
beforeEach(() => {
  vi.mocked(shareChallengeLink).mockClear();
});
it('shares the same puzzle again', async () => {
  render(
    <MantineProvider>
      <SharedInviteCard
        invite={{ ...invite, languages: [...invite.languages] }}
        onRemove={vi.fn()}
      />
    </MantineProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Share again' }));
  await waitFor(() =>
    expect(shareChallengeLink).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: 'puzzle', currentUserId: 'me' })
    )
  );
});
it('keeps the card and shows a retryable error when removal fails', async () => {
  render(
    <MantineProvider>
      <SharedInviteCard
        invite={{ ...invite, languages: [...invite.languages] }}
        onRemove={vi.fn().mockRejectedValue(new Error('Offline'))}
      />
    </MantineProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect(await screen.findByText('That didn’t work. Please try again.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove' })).toBeEnabled();
});
