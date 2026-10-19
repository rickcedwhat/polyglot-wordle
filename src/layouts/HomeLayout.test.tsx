import { render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { HomeLayout } from './HomeLayout';

const state = vi.hoisted(() => ({ loading: true, currentUser: null as { uid: string } | null }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => state }));
vi.mock('./GenericLayout', () => ({ GenericLayout: () => <div>Landing shell</div> }));
vi.mock('./SidebarLayout', () => ({ SidebarLayout: () => <div>Signed-in shell</div> }));
beforeEach(() => {
  state.loading = false;
  state.currentUser = null;
});
it('keeps both pages hidden until auth settles', () => {
  state.loading = true;
  render(
    <MantineProvider>
      <HomeLayout />
    </MantineProvider>
  );
  expect(screen.queryByText('Landing shell')).not.toBeInTheDocument();
  expect(screen.queryByText('Signed-in shell')).not.toBeInTheDocument();
});
it('uses the landing shell for signed-out visitors', () => {
  render(
    <MantineProvider>
      <HomeLayout />
    </MantineProvider>
  );
  expect(screen.getByText('Landing shell')).toBeInTheDocument();
});
it('switches between the landing and sidebar shells as auth changes', () => {
  const view = render(
    <MantineProvider>
      <HomeLayout />
    </MantineProvider>
  );
  state.currentUser = { uid: 'me' };
  view.rerender(
    <MantineProvider>
      <HomeLayout />
    </MantineProvider>
  );
  expect(screen.getByText('Signed-in shell')).toBeInTheDocument();
  state.currentUser = null;
  view.rerender(
    <MantineProvider>
      <HomeLayout />
    </MantineProvider>
  );
  expect(screen.getByText('Landing shell')).toBeInTheDocument();
});
