import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import i18n from '@/i18n';
import { NewGameButton } from './NewGameButton';

const state = vi.hoisted(() => ({ needsSetup: false, createNewGame: vi.fn(), toast: vi.fn() }));
vi.mock('@/hooks/useGameActions', () => ({ useGameActions: () => state }));
vi.mock('@/utils/toast', () => ({ showToast: state.toast }));
vi.mock('../GameSetup/GameSetupDialog', () => ({
  GameSetupDialog: ({ opened }: { opened: boolean }) => (opened ? <div>Setup is open</div> : null),
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.needsSetup = false;
  state.createNewGame.mockResolvedValue(true);
});
it('reports a failed direct start and allows retrying', async () => {
  state.createNewGame.mockResolvedValueOnce(false);
  render(
    <MantineProvider>
      <NewGameButton />
    </MantineProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'New game' }));
  await waitFor(() =>
    expect(state.toast).toHaveBeenCalledWith(
      { message: i18n.t('setup.startFailed'), color: 'red' },
      { immediate: true }
    )
  );
  await waitFor(() => expect(screen.getByRole('button', { name: 'New game' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'New game' }));
  await waitFor(() => expect(state.createNewGame).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByRole('button', { name: 'New game' })).toBeEnabled());
  expect(state.toast).toHaveBeenCalledTimes(1);
});
it('disables repeat clicks while a direct start is pending', async () => {
  let finish!: (value: boolean) => void;
  state.createNewGame.mockReturnValue(
    new Promise<boolean>((resolve) => {
      finish = resolve;
    })
  );
  render(
    <MantineProvider>
      <NewGameButton />
    </MantineProvider>
  );
  const button = screen.getByRole('button', { name: 'New game' });
  fireEvent.click(button);
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(state.createNewGame).toHaveBeenCalledOnce();
  finish(true);
  await waitFor(() => expect(button).toBeEnabled());
  expect(state.toast).not.toHaveBeenCalled();
});
it('still opens setup without starting a game when setup is needed', () => {
  state.needsSetup = true;
  render(
    <MantineProvider>
      <NewGameButton />
    </MantineProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'New game' }));
  expect(screen.getByText('Setup is open')).toBeInTheDocument();
  expect(state.createNewGame).not.toHaveBeenCalled();
  expect(state.toast).not.toHaveBeenCalled();
});
