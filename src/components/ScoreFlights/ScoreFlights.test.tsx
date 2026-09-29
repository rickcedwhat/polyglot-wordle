import { StrictMode, type ReactNode } from 'react';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScoreProvider, useScore } from '@/context/ScoreContext';
import { useScoreBurst } from './flightUtils';
import { ScoreFlights } from './ScoreFlights';

// Let tests land individual flights independently of browser animation timing.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      onAnimationComplete,
    }: {
      children: ReactNode;
      onAnimationComplete: () => void;
    }) => (
      <button type="button" onClick={onAnimationComplete}>
        {children}
      </button>
    ),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <StrictMode>
    <ScoreProvider>{children}</ScoreProvider>
  </StrictMode>
);

describe('overlapping score flights', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 100,
      bottom: 50,
      width: 100,
      height: 50,
      toJSON: () => ({}),
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.mocked(HTMLElement.prototype.getBoundingClientRect).mockRestore();
  });

  it.each([0, 5000])('keeps earlier flights held when a burst follows after %i ms', (delay) => {
    function Harness() {
      const { burst, fireBurst, clearBurst } = useScoreBurst();
      const { heldPoints, flightsInProgress } = useScore();
      return (
        <>
          <div data-score-target />
          <div data-score-origin="en" />
          <output data-testid="held">{heldPoints}</output>
          <output data-testid="flying">{String(flightsInProgress)}</output>
          <button
            type="button"
            onClick={() => fireBurst(1, [{ kind: 'green', points: 25, lang: 'en', index: 0 }])}
          >
            First
          </button>
          <button
            type="button"
            onClick={() => fireBurst(2, [{ kind: 'yellow', points: 5, lang: 'en', index: 1 }])}
          >
            Second
          </button>
          <button type="button" onClick={() => fireBurst(3, [])}>
            Empty
          </button>
          <button type="button" onClick={clearBurst}>
            Reset
          </button>
          {burst && <ScoreFlights burst={burst} />}
        </>
      );
    }
    render(<Harness />, { wrapper });
    fireEvent.click(screen.getByText('First'));
    // Cover a new burst both before launch and while the earlier flight is in the air.
    act(() => vi.advanceTimersByTime(delay));
    fireEvent.click(screen.getByText('Second'));
    fireEvent.click(screen.getByText('Empty'));
    expect(screen.getByTestId('held')).toHaveTextContent('30');
    act(() => vi.runAllTimers());
    expect(screen.getByText('+25')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByTestId('held')).toHaveTextContent('30');

    fireEvent.click(screen.getByText('+5'));
    expect(screen.getByTestId('held')).toHaveTextContent('25');
    expect(screen.getByTestId('flying')).toHaveTextContent('true');
    expect(screen.getByText('+25')).toBeInTheDocument();
    fireEvent.click(screen.getByText('+25'));
    expect(screen.getByTestId('held')).toHaveTextContent('0');
    expect(screen.getByTestId('flying')).toHaveTextContent('false');

    fireEvent.click(screen.getByText('First'));
    fireEvent.click(screen.getByText('Reset'));
    act(() => vi.runAllTimers());
    expect(screen.queryByText('+25')).not.toBeInTheDocument();
    expect(screen.getByTestId('held')).toHaveTextContent('0');
    expect(screen.getByTestId('flying')).toHaveTextContent('false');
  });

  it('isolates repeated releases, tracks net-zero holds, and clears all bursts on reset', () => {
    const { result } = renderHook(useScore, { wrapper });
    act(() => {
      result.current.holdPoints(1, { en: 25 });
      result.current.holdPoints(2, { en: 5, game: -30 });
    });
    expect(result.current.heldPoints).toBe(0);
    expect(result.current.flightsInProgress).toBe(true);
    act(() => {
      result.current.releasePoints(1, 'en');
      result.current.releasePoints(1, 'en');
      result.current.releasePoints(99, 'en');
    });
    expect(result.current.heldPoints).toBe(-25);
    expect(result.current.flightsInProgress).toBe(true);
    act(() => result.current.holdPoints(0, {}));
    expect(result.current.heldPoints).toBe(0);
    expect(result.current.flightsInProgress).toBe(false);
    act(() => result.current.releasePoints(2, 'en'));
    expect(result.current.heldPoints).toBe(0);
  });
});
