import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { LetterJumble } from '@/hooks/useLetterJumble';
import type { JumbleSlot } from '@/utils/letterJumble';
import { GuessInput } from './GuessInput';

vi.mock('@/hooks/useLetterStatus', () => ({ useLetterStatus: () => ({ letterStatusMap: {} }) }));

const INTRO = /rearranges letters you already know/;

const slotsFor = (word: string): JumbleSlot[] =>
  word.split('').map((l) => ({ letter: l === '_' ? '' : l, lock: 'kept' }));

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

const renderInput = (jumble: LetterJumble, onJumbleHelp: (() => void) | null = vi.fn()) =>
  render(
    <MantineProvider>
      <GuessInput
        guess={jumble.slots.map((s) => s.letter)}
        cursorIndex={0}
        isInvalid={false}
        onTileClick={vi.fn()}
        jumble={jumble}
        onJumbleHelp={onJumbleHelp ?? undefined}
      />
    </MantineProvider>
  );

describe('GuessInput intro note', () => {
  beforeEach(() => localStorage.clear());

  it('shows the first time jumble mode opens, and dismissing it is remembered', async () => {
    const { unmount } = renderInput(jumbleWith({}));
    expect(await screen.findByText(INTRO)).toBeTruthy();

    await userEvent.click(screen.getByLabelText('Dismiss hint'));
    unmount();

    renderInput(jumbleWith({}));
    expect(screen.queryByText(INTRO)).toBeNull();
  });

  it('"How it works" opens the help and counts as seen', async () => {
    const onJumbleHelp = vi.fn();
    renderInput(jumbleWith({}), onJumbleHelp);
    await userEvent.click(await screen.findByRole('button', { name: 'How it works' }));

    expect(onJumbleHelp).toHaveBeenCalled();
    expect(localStorage.getItem('polyglot_jumble_intro_seen_v1')).toBe('1');
  });

  it('stays hidden outside jumble mode', () => {
    renderInput(jumbleWith({ isOpen: false }));
    expect(screen.queryByText(INTRO)).toBeNull();
  });

  it('stays hidden when there is no help to open (static demos)', () => {
    renderInput(jumbleWith({}), null);
    expect(screen.queryByText(INTRO)).toBeNull();
  });
});
