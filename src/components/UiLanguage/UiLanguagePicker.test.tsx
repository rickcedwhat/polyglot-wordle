import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { updateDoc } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { GameSetupPanel } from '@/components/GameSetup/GameSetupPanel';
import i18n from '@/i18n';
import { SAVED_KEY } from '@/i18n/uiLanguage';
import { UiLanguageSync } from './UiLanguagePicker';

const profile = vi.hoisted(() => ({ current: {} as { uiLanguage?: string } }));
const auth = vi.hoisted(() => ({ currentUser: { uid: 'me' } as { uid: string } | null }));

vi.mock('firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/firestore')>()),
  doc: vi.fn(() => 'userDoc'),
  getFirestore: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => auth,
}));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({ data: profile.current }),
}));

const renderWithProviders = (ui: React.ReactNode) => {
  const client = new QueryClient();
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>
        <MantineProvider>{children}</MantineProvider>
      </QueryClientProvider>
    ),
  });
};

beforeEach(() => {
  localStorage.clear();
  vi.mocked(updateDoc).mockClear();
  auth.currentUser = { uid: 'me' };
  profile.current = {};
});

afterEach(async () => {
  await act(() => i18n.changeLanguage('en'));
});

describe('UiLanguageSync', () => {
  it('switches to the language saved on the account', async () => {
    profile.current = { uiLanguage: 'fr' };
    renderWithProviders(<UiLanguageSync />);
    await waitFor(() => expect(i18n.language).toBe('fr'));
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('applies a changed profile language for the same user without writing to the account', async () => {
    profile.current = { uiLanguage: 'fr' };
    const { rerender } = renderWithProviders(<UiLanguageSync />);
    await waitFor(() => expect(i18n.language).toBe('fr'));

    await act(() => i18n.changeLanguage('it'));
    profile.current = { uiLanguage: 'fr' };
    rerender(<UiLanguageSync />);
    expect(i18n.language).toBe('it');

    profile.current = { uiLanguage: 'es' };
    rerender(<UiLanguageSync />);
    await waitFor(() => expect(i18n.language).toBe('es'));
    expect(localStorage.getItem(SAVED_KEY)).toBe('es');
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('reapplies the account language after signing out and back in as the same user', async () => {
    profile.current = { uiLanguage: 'fr' };
    const { rerender } = renderWithProviders(<UiLanguageSync />);
    await waitFor(() => expect(i18n.language).toBe('fr'));

    auth.currentUser = null;
    rerender(<UiLanguageSync />);
    await act(() => i18n.changeLanguage('en'));

    auth.currentUser = { uid: 'me' };
    rerender(<UiLanguageSync />);
    await waitFor(() => expect(i18n.language).toBe('fr'));
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('saves a choice made before signing in to the account without asking', async () => {
    profile.current = {};
    localStorage.setItem(SAVED_KEY, 'it');
    const { rerender } = renderWithProviders(<UiLanguageSync />);
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith('userDoc', { uiLanguage: 'it' }));

    await act(async () => {
      profile.current = {};
      rerender(<UiLanguageSync />);
    });
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it.each(['Escape', 'overlay', 'close control'])(
    'dismisses via %s without saving',
    async (via) => {
      const { rerender } = renderWithProviders(<UiLanguageSync />);
      fireEvent.click(await screen.findByRole('radio', { name: 'Español' }));
      if (via === 'Escape') {
        fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      } else {
        const control = document.querySelector(
          via === 'overlay' ? '.mantine-Modal-overlay' : '.mantine-Modal-close'
        );
        expect(control).not.toBeNull();
        fireEvent.click(control!);
      }
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      profile.current = {};
      rerender(<UiLanguageSync />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(i18n.language).toBe('en');
      expect(localStorage.getItem(SAVED_KEY)).toBeNull();
      expect(updateDoc).not.toHaveBeenCalled();
    }
  );

  it('asks once when no language was ever chosen, and saves the answer', async () => {
    profile.current = {};
    renderWithProviders(<UiLanguageSync />);
    fireEvent.click(await screen.findByRole('radio', { name: 'Español' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith('userDoc', { uiLanguage: 'es' }));
    expect(i18n.language).toBe('es');
    expect(localStorage.getItem(SAVED_KEY)).toBe('es');
  });
});

it('renders the game setup in the chosen language', async () => {
  await act(() => i18n.changeLanguage('es'));
  renderWithProviders(<GameSetupPanel mode="newGame" onSubmit={() => {}} />);
  expect(
    screen.getByText('Elige tres idiomas y luego una dificultad para cada tablero.')
  ).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Empezar partida' })).toBeInTheDocument();
  expect(screen.getByText('Inglés')).toBeInTheDocument();
});
