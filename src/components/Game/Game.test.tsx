import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { SLOW_LOAD_MS } from '@/hooks/useSlow';
import { useWordPools } from '@/hooks/useWordPools';
import type { GameDoc } from '@/types/firestore';
import { Game } from './Game';

vi.mock('@/hooks/useWordPools', () => ({ useWordPools: vi.fn() }));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ currentUser: null }) }));
vi.mock('@/context/ScoreContext', () => ({
  useScoreFlightControls: () => ({ holdPoints: vi.fn() }),
  useScore: () => ({ recalculateScore: vi.fn(() => 0), holdPoints: vi.fn() }),
}));
vi.mock('@/context/SidebarContext', () => ({
  useSidebar: () => ({ setSidebarContent: vi.fn() }),
}));
vi.mock('@/hooks/useLetterStatus', () => ({
  useLetterStatus: () => ({ updateLetterStatuses: vi.fn() }),
}));
vi.mock('@/hooks/useVocabulary', () => ({ useVocabulary: () => ({}) }));
vi.mock('@/hooks/useChallenge', () => ({ useChallenge: () => ({}) }));
vi.mock('@/hooks/useLetterJumble', () => ({ useLetterJumble: () => ({}) }));
vi.mock('../PostGameModal/PostGameModal', () => ({ PostGameModal: () => null }));

const refetch = vi.fn();
const gameSession = {
  gameId: 'b3e47403d2ec4ec9beb8a41faa0b3e47',
  words: { en: 'apple', es: 'queso', fr: 'fruit' },
  difficulties: { en: 'basic', es: 'basic', fr: 'basic' },
  shuffledLanguages: ['en', 'es', 'fr'],
  guessHistory: [],
  isLiveGame: true,
} as unknown as GameDoc;

const renderGame = () =>
  render(
    <MantineProvider>
      <Game gameSession={gameSession} updateGuessHistory={vi.fn()} endGame={vi.fn()} />
    </MantineProvider>
  );

describe('Game word-pool loading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    refetch.mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it.each([false, true])('offers a retry after 12 seconds (isError=%s)', (isError) => {
    vi.mocked(useWordPools).mockReturnValue({
      data: undefined,
      isError,
      isFetching: true,
      refetch,
    } as unknown as ReturnType<typeof useWordPools>);
    const { container } = renderGame();
    expect(container.querySelector('.mantine-Loader-root')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(SLOW_LOAD_MS - 1));
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByText('This is taking longer than usual.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
    expect(container.querySelector('.mantine-Loader-root')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
    act(() => vi.advanceTimersByTime(SLOW_LOAD_MS));
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('preserves the immediate error message and retry control', () => {
    vi.mocked(useWordPools).mockReturnValue({
      data: undefined,
      isError: true,
      isFetching: false,
      refetch,
    } as unknown as ReturnType<typeof useWordPools>);
    renderGame();
    expect(
      screen.getByText("Couldn't load the word lists. Check your connection.")
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});
