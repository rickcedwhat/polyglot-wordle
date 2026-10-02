import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as firestore from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import * as authContext from '@/context/AuthContext';
import { showToast } from '@/utils/toast';
import { GameSetupDialog } from './GameSetupDialog';

const createNewGame = vi.fn();

vi.mock('@/utils/toast', () => ({ showToast: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: vi.fn() }));
vi.mock('@/hooks/useGameActions', () => ({ useGameActions: () => ({ createNewGame }) }));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({
    data: {
      languagePrefs: { languages: ['en', 'es', 'pt'], skipPicker: false },
      difficultyPrefs: { en: 'basic', es: 'advanced', fr: 'basic', it: 'basic', pt: 'basic' },
    },
  }),
}));
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return { ...actual, getFirestore: vi.fn(() => ({})), doc: vi.fn(), updateDoc: vi.fn() };
});

describe('GameSetupDialog', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    createNewGame.mockResolvedValue(true);
    vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);
    vi.mocked(authContext.useAuth).mockReturnValue({
      currentUser: { uid: 'user_1' },
    } as ReturnType<typeof authContext.useAuth>);
  });

  const renderDialog = (mode: 'newGame' | 'settings') => {
    const onClose = vi.fn();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MantineProvider>
          <GameSetupDialog opened onClose={onClose} mode={mode} />
        </MantineProvider>
      </QueryClientProvider>
    );
    return { onClose };
  };

  it('saves languages and difficulty together, then starts the game', async () => {
    vi.mocked(firestore.updateDoc).mockResolvedValue(undefined);
    const { onClose } = renderDialog('newGame');
    fireEvent.click(await screen.findByRole('button', { name: 'Start game' }));

    await waitFor(() =>
      expect(createNewGame).toHaveBeenCalledWith({
        languages: ['en', 'es', 'pt'],
        difficulties: expect.objectContaining({ es: 'advanced' }),
      })
    );
    expect(firestore.updateDoc).toHaveBeenCalledWith(undefined, {
      languagePrefs: { languages: ['en', 'es', 'pt'], skipPicker: false },
      difficultyPrefs: expect.objectContaining({ es: 'advanced' }),
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('warns and still starts the game when saving fails', async () => {
    vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('save failed'));
    const { onClose } = renderDialog('newGame');
    fireEvent.click(await screen.findByRole('button', { name: 'Start game' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createNewGame).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(
      { message: 'Could not save your game setup preferences.', color: 'orange' },
      { immediate: true }
    );
  });

  it('keeps settings open with an error when saving fails', async () => {
    vi.mocked(firestore.updateDoc).mockRejectedValue(new Error('save failed'));
    const { onClose } = renderDialog('settings');
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save your game setup. Please try again.'
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(createNewGame).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('waits for creation before closing and prevents another submission while pending', async () => {
    let finishCreation!: (created: boolean) => void;
    createNewGame.mockReturnValueOnce(
      new Promise<boolean>((resolve) => {
        finishCreation = resolve;
      })
    );
    const { onClose } = renderDialog('newGame');
    const submit = await screen.findByRole('button', { name: 'Start game' });
    fireEvent.click(submit);

    await waitFor(() => expect(createNewGame).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(createNewGame).toHaveBeenCalledTimes(1);

    await act(async () => finishCreation(true));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('keeps the dialog open after creation fails and lets the player retry', async () => {
    createNewGame.mockResolvedValueOnce(false);
    const { onClose } = renderDialog('newGame');
    const submit = await screen.findByRole('button', { name: 'Start game' });
    fireEvent.click(submit);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not start your game. Please try again.'
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(createNewGame).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('closes settings after saving without starting a game', async () => {
    const { onClose } = renderDialog('settings');
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(createNewGame).not.toHaveBeenCalled();
  });
});
