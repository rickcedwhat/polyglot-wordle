import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { JumbleRow } from './JumbleRow';

const setup = () => {
  const onTileClick = vi.fn();
  render(
    <MantineProvider>
      <JumbleRow
        slots={[{ letter: 'a', lock: 'kept' }]}
        cursorIndex={0}
        onTileClick={onTileClick}
      />
    </MantineProvider>
  );
  const slot = screen.getByRole('button', { name: 'Slot 1: a' });
  slot.focus();
  return { slot, onTileClick };
};

describe('JumbleRow keyboard activation', () => {
  it('prevents Space scrolling and the window shortcut, then activates on release', () => {
    const { slot, onTileClick } = setup();
    const windowShortcut = vi.fn();
    window.addEventListener('keydown', windowShortcut);
    try {
      const keyDown = createEvent.keyDown(slot, { key: ' ' });
      fireEvent(slot, keyDown);
      expect(keyDown.defaultPrevented).toBe(true);
      expect(windowShortcut).not.toHaveBeenCalled();
      expect(onTileClick).not.toHaveBeenCalled();

      fireEvent.keyUp(slot, { key: ' ' });
      expect(onTileClick).toHaveBeenCalledExactlyOnceWith(0);
    } finally {
      window.removeEventListener('keydown', windowShortcut);
    }
  });

  it('preserves Enter activation on keydown without activating again on keyup', () => {
    const { slot, onTileClick } = setup();
    fireEvent.keyDown(slot, { key: 'Enter' });
    expect(onTileClick).toHaveBeenCalledExactlyOnceWith(0);
    fireEvent.keyUp(slot, { key: 'Enter' });
    expect(onTileClick).toHaveBeenCalledTimes(1);
  });
});
