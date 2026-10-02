import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { GameSetupModal } from './GameSetupModal';
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

  it.each(['languages', 'difficulty', 'skipPicker'])(
    'preserves %s edits when the profile loads',
    (field) => {
      const onSubmit = vi.fn();
      const panel = (loaded: boolean) => (
        <MantineProvider>
          <GameSetupPanel
            mode="newGame"
            onSubmit={onSubmit}
            resetKey={loaded ? 'loaded' : 'loading'}
            initialLanguages={loaded ? ['en', 'es', 'pt'] : undefined}
            initialDifficulties={loaded ? { en: 'advanced' } : undefined}
          />
        </MantineProvider>
      );
      const { rerender } = render(panel(false));
      if (field === 'languages') {
        fireEvent.click(screen.getByRole('button', { name: /French/ }));
        fireEvent.click(screen.getByRole('button', { name: /Italian/ }));
      } else if (field === 'difficulty') {
        fireEvent.click(screen.getAllByText('Intermediate')[0]);
      } else {
        fireEvent.click(screen.getByRole('switch'));
      }
      rerender(panel(true));
      fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
      expect(onSubmit).toHaveBeenCalledWith({
        languages: field === 'languages' ? ['en', 'es', 'it'] : ['en', 'es', 'fr'],
        difficulties: expect.objectContaining({
          en: field === 'difficulty' ? 'intermediate' : 'basic',
        }),
        skipPicker: field === 'skipPicker',
      });
    }
  );

  it('seeds an untouched picker when the profile loads and resets edits on reopen', () => {
    const onSubmit = vi.fn();
    const modal = (opened: boolean, loaded: boolean) => (
      <MantineProvider>
        <GameSetupModal
          opened={opened}
          onClose={vi.fn()}
          mode="newGame"
          onSubmit={onSubmit}
          resetKey={loaded ? 'loaded' : 'loading'}
          initialLanguages={loaded ? ['en', 'es', 'pt'] : undefined}
          initialDifficulties={loaded ? { en: 'advanced' } : undefined}
          initialSkipPicker={loaded}
        />
      </MantineProvider>
    );
    const { rerender } = render(modal(true, false));
    rerender(modal(true, true));
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    const savedSetup = {
      languages: ['en', 'es', 'pt'],
      difficulties: expect.objectContaining({ en: 'advanced' }),
      skipPicker: true,
    };
    expect(onSubmit).toHaveBeenLastCalledWith(savedSetup);

    fireEvent.click(screen.getByRole('button', { name: /Portuguese/ }));
    fireEvent.click(screen.getByRole('button', { name: /Italian/ }));
    fireEvent.click(screen.getAllByText('Intermediate')[0]);
    fireEvent.click(screen.getByRole('switch'));
    rerender(modal(false, true));
    rerender(modal(true, true));
    fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
    expect(onSubmit).toHaveBeenLastCalledWith(savedSetup);
  });
});
