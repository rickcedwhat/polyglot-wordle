import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { GameSetupPanel } from './GameSetupPanel';

const renderPanel = (props: Partial<Parameters<typeof GameSetupPanel>[0]> = {}) => {
  const onSubmit = vi.fn();
  render(
    <MantineProvider>
      <GameSetupPanel mode="newGame" onSubmit={onSubmit} {...props} />
    </MantineProvider>
  );
  return { onSubmit };
};

describe('GameSetupPanel', () => {
  it('caps the selection at three languages', () => {
    const { onSubmit } = renderPanel();
    expect(screen.getByRole('button', { name: /Italian/ })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /French/ }));
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();
    expect(screen.getByText('2 of 3 selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Italian/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ languages: ['en', 'es', 'it'] })
    );
  });

  it('submits the difficulty picked for each board', () => {
    const { onSubmit } = renderPanel({
      initialLanguages: ['en', 'es', 'pt'],
      initialDifficulties: { pt: 'advanced' },
    });
    fireEvent.click(screen.getAllByText('Intermediate')[0]);
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));

    expect(onSubmit).toHaveBeenCalledWith({
      languages: ['en', 'es', 'pt'],
      difficulties: expect.objectContaining({ en: 'intermediate', es: 'basic', pt: 'advanced' }),
      skipPicker: true,
    });
  });

  it('hides "use this setup every time" when challenging', () => {
    renderPanel({ mode: 'challenge' });
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send challenge & play' })).toBeEnabled();
  });
});
