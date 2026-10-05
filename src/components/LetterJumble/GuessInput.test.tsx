import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => vi.restoreAllMocks());

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

  it('renders when reading storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    renderInput(jumbleWith({}));
    expect(await screen.findByText(INTRO)).toBeTruthy();
  });

  it.each(['Dismiss hint', 'How it works'])(
    '%s completes when writing storage throws',
    async (action) => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('Storage full');
      });
      const onJumbleHelp = vi.fn();
      renderInput(jumbleWith({}), onJumbleHelp);
      await userEvent.click(await screen.findByRole('button', { name: action }));
      await waitFor(() => expect(screen.queryByText(INTRO)).toBeNull());
      expect(onJumbleHelp).toHaveBeenCalledTimes(action === 'How it works' ? 1 : 0);
    }
  );

  it('stays hidden outside jumble mode', () => {
    renderInput(jumbleWith({ isOpen: false }));
    expect(screen.queryByText(INTRO)).toBeNull();
  });

  it('stays hidden when there is no help to open (static demos)', () => {
    renderInput(jumbleWith({}), null);
    expect(screen.queryByText(INTRO)).toBeNull();
  });
});

describe('GuessInput clear button', () => {
  const renderWithClear = (word: string, isOpen: boolean, onClear = vi.fn()) =>
    render(
      <MantineProvider>
        <GuessInput
          guess={slotsFor(word).map((s) => s.letter)}
          cursorIndex={0}
          isInvalid={false}
          onTileClick={vi.fn()}
          jumble={jumbleWith({ isOpen })}
          onClear={onClear}
        />
      </MantineProvider>
    );

  it('clears a guess with letters outside jumble mode', async () => {
    const onClear = vi.fn();
    renderWithClear('ca___', false, onClear);
    await userEvent.click(screen.getByRole('button', { name: 'Clear guess' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('hides when the guess is empty', () => {
    renderWithClear('_____', false);
    expect(screen.queryByRole('button', { name: 'Clear guess' })).toBeNull();
  });

  it('hides in jumble mode, where the left slot leaves jumble', () => {
    renderWithClear('ca___', true);
    expect(screen.queryByRole('button', { name: 'Clear guess' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Leave Letter Jumble' })).toBeTruthy();
  });
});
