import type { ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { HomePage } from './Home.page';

const state = vi.hoisted(() => ({
  currentUser: null as { uid: string } | null,
  signInWithGoogle: vi.fn(),
}));
vi.mock('@mantine/carousel', () => ({
  Carousel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => state }));
vi.mock('./SignedInHome.page', () => ({ SignedInHomePage: () => <div>Player home</div> }));
vi.mock('@/components/HowToPlayModal/HelpSlides', () => ({
  HowToPlaySlides: () => <div>Landing instructions</div>,
}));
it('shows the landing page and login action when signed out, then switches to player Home', () => {
  const view = render(
    <MantineProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </MantineProvider>
  );
  expect(screen.getByText('Landing instructions')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Log in' }));
  expect(state.signInWithGoogle).toHaveBeenCalledOnce();
  state.currentUser = { uid: 'me' };
  view.rerender(
    <MantineProvider>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </MantineProvider>
  );
  expect(screen.getByText('Player home')).toBeInTheDocument();
  expect(screen.queryByText('Landing instructions')).not.toBeInTheDocument();
});
