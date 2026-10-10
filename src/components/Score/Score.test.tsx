import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { ScoreProvider } from '@/context/ScoreContext';
import { Score, ScoreHeader } from './Score';

const renderWithProviders = (ui: React.ReactNode) =>
  render(
    <MantineProvider>
      <ScoreProvider>{ui}</ScoreProvider>
    </MantineProvider>
  );

describe('Score', () => {
  it('opens the summary from the score card', () => {
    const onOpenSummary = vi.fn();
    renderWithProviders(<Score onOpenSummary={onOpenSummary} />);
    fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
    expect(onOpenSummary).toHaveBeenCalledOnce();
  });

  it('has no summary button during a live game', () => {
    renderWithProviders(<Score />);
    expect(screen.queryByRole('button', { name: 'Summary' })).not.toBeInTheDocument();
  });
});

describe('ScoreHeader', () => {
  it('shows the summary button next to the score after a game', () => {
    const onOpenSummary = vi.fn();
    renderWithProviders(<ScoreHeader menu={null} showScore onOpenSummary={onOpenSummary} />);
    fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
    expect(onOpenSummary).toHaveBeenCalledOnce();
  });

  it('hides the score and summary while the menu is open', () => {
    renderWithProviders(
      <ScoreHeader menu={<span>menu</span>} showScore={false} onOpenSummary={vi.fn()} />
    );
    expect(screen.getByText('menu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Summary' })).not.toBeInTheDocument();
  });
});
