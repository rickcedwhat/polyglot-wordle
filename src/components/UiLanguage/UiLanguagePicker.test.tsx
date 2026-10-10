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

vi.mock('firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/firestore')>()),
  doc: vi.fn(() => 'userDoc'),
  getFirestore: vi.fn(),
  updateDoc: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'me' } }),
}));
vi.mock('@/hooks/useUserProfile', () => ({
  useUserProfile: () => ({ data: profile.current }),
}));

const renderWithProviders = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>{ui}</MantineProvider>
    </QueryClientProvider>
  );

beforeEach(() => {
  localStorage.clear();
  vi.mocked(updateDoc).mockClear();
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

  it('saves a choice made before signing in to the account without asking', async () => {
    profile.current = {};
    localStorage.setItem(SAVED_KEY, 'it');
    renderWithProviders(<UiLanguageSync />);
    await waitFor(() => expect(updateDoc).toHaveBeenCalledWith('userDoc', { uiLanguage: 'it' }));
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

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
