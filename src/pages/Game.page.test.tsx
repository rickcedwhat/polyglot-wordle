import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { useGameSession } from '@/hooks/useGameSession';
import { GamePage, SLOW_LOAD_MS } from './Game.page';

vi.mock('@/hooks/useGameSession', () => ({ useGameSession: vi.fn() }));
vi.mock('@/components/Game/Game', () => ({ Game: () => <div>live game</div> }));
vi.mock('@/components/PostGameView/PostGameView', () => ({ PostGameView: () => null }));

const GAME_ID = 'b3e47403d2ec4ec9beb8a41faa0b3e47';
const refetch = vi.fn();

const session = (overrides: Record<string, unknown>) =>
  vi.mocked(useGameSession).mockReturnValue({
    data: undefined,
    isError: false,
    isFetching: true,
    refetch,
    updateGuessHistory: vi.fn(),
    endGame: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useGameSession>);

const renderAt = (gameId: string) =>
  render(
    <MantineProvider>
      <MemoryRouter initialEntries={[`/game/${gameId}`]}>
        <Routes>
          <Route path="/game/:uuid" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    </MantineProvider>
  );

describe('GamePage loading', () => {
  beforeEach(() => refetch.mockClear());
  afterEach(() => vi.useRealTimers());

  it('shows the error with a retry instead of spinning forever', async () => {
    session({ isError: true, isFetching: false });
    renderAt(GAME_ID);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('offers a retry when loading drags on', () => {
    vi.useFakeTimers();
    session({});
    renderAt(GAME_ID);
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();

    act(() => vi.advanceTimersByTime(SLOW_LOAD_MS));
    expect(screen.getByText('This is taking longer than usual.')).toBeInTheDocument();
  });

  it('explains a broken game link', () => {
    session({ isFetching: false });
    renderAt('not-a-game');
    expect(screen.getByText("This game link isn't valid.")).toBeInTheDocument();
  });
});
