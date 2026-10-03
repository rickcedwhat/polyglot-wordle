import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { LetterJumble } from '@/hooks/useLetterJumble';
import type { JumbleSlot } from '@/utils/letterJumble';
import { GuessInput } from './GuessInput';

vi.mock('@/hooks/useLetterStatus', () => ({ useLetterStatus: () => ({ letterStatusMap: {} }) }));

const HINT = 'Tap a letter twice to pin it in place';

const slotsFor = (word: string, pinned: number[] = []): JumbleSlot[] =>
  word.split('').map((l, i) => ({
    letter: l === '_' ? '' : l,
    lock: pinned.includes(i) ? 'pinned' : 'kept',
  }));

const jumbleWith = (overrides: Partial<LetterJumble>): LetterJumble => ({
  enabled: true,
  isOpen: true,
  targetBoard: 0,
  slots: slotsFor('_____'),
  statuses: undefined,
  conflicts: undefined,
  press: vi.fn(),
  close: vi.fn(),
  togglePinAt: vi.fn(),
  ...overrides,
});

const renderInput = (jumble: LetterJumble) =>
  render(
    <MantineProvider>
      <GuessInput
        guess={jumble.slots.map((s) => s.letter)}
        cursorIndex={0}
        isInvalid={false}
        onTileClick={vi.fn()}
        jumble={jumble}
      />
    </MantineProvider>
  );

describe('GuessInput pin hint', () => {
  beforeEach(() => localStorage.clear());

  it('waits until there is a letter to pin', () => {
    renderInput(jumbleWith({}));
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('shows once jumble mode has letters, and dismissing it is remembered', async () => {
    const { unmount } = renderInput(jumbleWith({ slots: slotsFor('ab___') }));
    expect(await screen.findByText(HINT)).toBeTruthy();

    await userEvent.click(screen.getByLabelText('Dismiss hint'));
    unmount();

    renderInput(jumbleWith({ slots: slotsFor('ab___') }));
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('is never shown again after the player pins a letter', () => {
    const { unmount } = renderInput(jumbleWith({ slots: slotsFor('ab___', [0]) }));
    unmount();
    renderInput(jumbleWith({ slots: slotsFor('ab___') }));
    expect(screen.queryByText(HINT)).toBeNull();
  });

  it('stays hidden outside jumble mode', () => {
    renderInput(jumbleWith({ isOpen: false, slots: slotsFor('ab___') }));
    expect(screen.queryByText(HINT)).toBeNull();
  });
});
