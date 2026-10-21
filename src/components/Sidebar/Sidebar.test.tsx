import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { notifications, notificationsStore } from '@mantine/notifications';
import type { ReactionNotification } from '@/utils/reactionNotifications';
import { Sidebar } from './Sidebar';

// jsdom does not provide the observer used by the help carousel.
vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
);

const actions = vi.hoisted(() => ({
  close: vi.fn(),
  newGame: vi.fn(),
  logout: vi.fn(),
  reactionToast: undefined as ((item: ReactionNotification) => void) | undefined,
}));
vi.mock('@/hooks/useReactionNotificationToasts', () => ({
  useReactionNotificationToasts: (
    _playing: boolean,
    onToast: (item: ReactionNotification) => void
  ) => {
    actions.reactionToast = onToast;
  },
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { uid: 'me', displayName: 'Test Player' },
    logout: actions.logout,
  }),
}));
vi.mock('@/context/SidebarContext', () => ({
  useSidebar: () => ({ close: actions.close, sidebarContent: <div>Live score</div> }),
}));
vi.mock('@/hooks/useChallenges', () => ({
  useChallenges: () => ({ unreadCount: 2 }),
  useChallengeResultToasts: vi.fn(),
}));
vi.mock('@/hooks/useGameActions', () => ({
  useGameActions: () => ({ createNewGame: actions.newGame, needsSetup: false }),
}));
vi.mock('@/components/GameSetup/GameSetupDialog', () => ({ GameSetupDialog: () => null }));
vi.mock('@/components/FlagsModal/FlagsModal', () => ({ FlagsModal: () => null }));
vi.mock('@/components/UiLanguage/UiLanguagePicker', () => ({
  UiLanguageModal: ({ opened }: { opened: boolean }) =>
    opened ? <div>Language picker opened</div> : null,
}));
const CurrentRoute = () => {
  const location = useLocation();
  return (
    <output data-testid="route">
      {location.pathname}
      {location.search}
    </output>
  );
};
const show = () =>
  render(
    <MantineProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/feed']}>
          <Sidebar />
          <CurrentRoute />
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>
  );
beforeEach(() => {
  vi.clearAllMocks();
  notifications.clean();
});
it('puts Home before Activity feed and navigates with the sidebar closed', () => {
  show();
  const links = screen.getAllByRole('link');
  expect(links[0]).toHaveAccessibleName('Home');
  expect(links[1]).toHaveAccessibleName('Activity feed');
  expect(links[1]).toHaveAttribute('aria-current', 'page');
  fireEvent.click(screen.getByRole('link', { name: 'Challenges 2' }));
  expect(screen.getByTestId('route')).toHaveTextContent('/challenges');
  expect(actions.close).toHaveBeenCalled();
  expect(screen.getByText('Live score')).toBeInTheDocument();
});
it('opens the chosen help topic with no topic tabs and closes the sidebar', async () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'How to play' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Scoring' }));
  expect(await screen.findByRole('heading', { name: 'Scoring' })).toBeInTheDocument();
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(actions.close).toHaveBeenCalledOnce();
});
it('keeps settings actions, profile and logout accessible', async () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Language' }));
  expect(screen.getByText('Language picker opened')).toBeInTheDocument();
  expect(actions.close).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('link', { name: 'My profile' }));
  expect(screen.getByTestId('route')).toHaveTextContent('/profile/me');
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
  expect(actions.logout).toHaveBeenCalledOnce();
});
it('starts a new game without leaving the action button focused', async () => {
  show();
  const button = screen.getByRole('button', { name: 'New game' });
  button.focus();
  fireEvent.click(button);
  expect(actions.newGame).toHaveBeenCalledOnce();
  await waitFor(() => expect(button).not.toHaveFocus());
});

it('replaces a visible reaction toast and opens the latest activity target', () => {
  show();
  const first = { id: 'first__game' } as ReactionNotification;
  const second = { id: 'second__game' } as ReactionNotification;
  act(() => actions.reactionToast!(first));
  act(() => actions.reactionToast!(second));
  const toasts = notificationsStore.getState().notifications;
  expect(toasts).toHaveLength(1);
  const message = toasts[0].message as ReactElement<{
    item: ReactionNotification;
    onOpen: () => void;
  }>;
  expect(message.props.item).toBe(second);
  act(() => message.props.onOpen());
  expect(screen.getByTestId('route')).toHaveTextContent('/feed?activity=second__game');
  expect(notificationsStore.getState().notifications).toHaveLength(0);
});
