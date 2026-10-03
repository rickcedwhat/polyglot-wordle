import { describe, expect, it } from 'vitest';
import {
  boardKnowledge,
  conflictingSlots,
  createJumbler,
  fillOpenSlots,
  nextKeyboardLetter,
  relock,
  targetStatuses,
  togglePin,
  validArrangements,
  type JumbleLock,
  type JumbleSlot,
} from './letterJumble';

const slots = (word: string, locks: JumbleLock | JumbleLock[] = 'kept'): JumbleSlot[] =>
  word.split('').map((letter, i) => ({
    letter: letter === '_' ? '' : letter,
    lock: Array.isArray(locks) ? locks[i] : locks,
  }));

// Against STYLO: yellows O(2) T(4) from ROUTE, S(3) from CASER, L(3) S(4) from VALSE.
const STUMPED = boardKnowledge(['route', 'caser', 'valse'], 'stylo');

describe('togglePin', () => {
  it('pins any letter and unpins back to kept', () => {
    expect(togglePin('kept')).toBe('pinned');
    expect(togglePin('suggested')).toBe('pinned');
    expect(togglePin('pinned')).toBe('kept');
  });
});

describe('boardKnowledge', () => {
  it('records greens, failed spots and absent letters', () => {
    const knowledge = boardKnowledge(['salty'], 'stylo');
    expect(knowledge.greens).toEqual(['s', null, null, null, null]);
    expect([...knowledge.banned[1]]).toEqual(['a']);
    expect(knowledge.banned[2].has('l')).toBe(true);
    expect(knowledge.absent).toEqual(new Set(['a']));
  });

  it('does not mark a duplicate letter absent when another copy was found', () => {
    const knowledge = boardKnowledge(['sassy'], 'stylo');
    expect(knowledge.absent.has('s')).toBe(false);
    expect(knowledge.banned[2].has('s')).toBe(true);
  });
});

describe('validArrangements', () => {
  it('allows 36 of the 120 TLOHS orderings on the stumped board', () => {
    expect(validArrangements(slots('tlohs'), STUMPED)).toHaveLength(36);
  });

  it('allows every distinct ordering without a target', () => {
    expect(validArrangements(slots('tlohs'))).toHaveLength(120);
  });

  it('keeps spot-locked letters in place', () => {
    const result = validArrangements(slots('stoll', ['pinned', 'kept', 'kept', 'kept', 'kept']));
    expect(result.every((word) => word[0] === 's')).toBe(true);
    expect(result).toHaveLength(12);
  });

  it('pins target greens and consumes a matching locked letter', () => {
    const knowledge = boardKnowledge(['salty'], 'stylo');
    const result = validArrangements(
      slots('tos__', ['kept', 'kept', 'kept', 'suggested', 'suggested']),
      knowledge
    );
    expect(result.every((word) => word[0] === 's')).toBe(true);
    expect(result.every((word) => word.filter((l) => l === 's').length === 1)).toBe(true);
  });

  it('rejects a pinned letter that conflicts with a target green', () => {
    const knowledge = boardKnowledge(['salty'], 'stylo');
    expect(
      validArrangements(
        slots('x____', ['pinned', 'suggested', 'suggested', 'suggested', 'suggested']),
        knowledge
      )
    ).toEqual([]);
  });

  it('accepts a pinned letter that matches a target green', () => {
    const knowledge = boardKnowledge(['salty'], 'stylo');
    const result = validArrangements(
      slots('s____', ['pinned', 'suggested', 'suggested', 'suggested', 'suggested']),
      knowledge
    );
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((word) => word[0] === 's')).toBe(true);
  });

  it('leaves free slots open', () => {
    const result = validArrangements(
      slots('ab___', ['kept', 'kept', 'suggested', 'suggested', 'suggested'])
    );
    expect(result).toHaveLength(20);
    expect(result.every((word) => word.filter((l) => l === '').length === 3)).toBe(true);
  });

  it('always includes letters the target is known to contain', () => {
    const result = validArrangements(slots('_____', 'suggested'), STUMPED);
    expect(result.length).toBeGreaterThan(0);
    for (const word of result) {
      expect([...word].sort()).toEqual(['', 'l', 'o', 's', 't']);
    }
  });

  it('does not double up a known letter the player already locked', () => {
    const result = validArrangements(
      slots('s____', ['kept', 'suggested', 'suggested', 'suggested', 'suggested']),
      STUMPED
    );
    expect(result.every((word) => word.filter((l) => l === 's').length === 1)).toBe(true);
  });

  it('returns nothing when the target makes it impossible', () => {
    expect(validArrangements(slots('sssss'), STUMPED)).toEqual([]);
  });
});

describe('fillOpenSlots', () => {
  it('fills with letters that are not grey or failed on the target', () => {
    const filled = fillOpenSlots(['', '', '', '', ''], STUMPED);
    filled.forEach((letter, i) => {
      expect(STUMPED.absent.has(letter)).toBe(false);
      expect(STUMPED.banned[i].has(letter)).toBe(false);
    });
  });

  it('prefers letters not already in the word', () => {
    const filled = fillOpenSlots(['a', 'b', 'c', 'd', ''], undefined, () => 0);
    expect(filled[4]).toBe('e');
  });
});

describe('nextKeyboardLetter', () => {
  it('walks QWERTY order and wraps', () => {
    expect(nextKeyboardLetter('', 0)).toBe('q');
    expect(nextKeyboardLetter('q', 0)).toBe('w');
    expect(nextKeyboardLetter('p', 0)).toBe('a');
    expect(nextKeyboardLetter('m', 0)).toBe('q');
  });

  it('skips grey letters and failed spots on the target', () => {
    // r, u, e are grey; t failed at position 3.
    expect(nextKeyboardLetter('w', 3, STUMPED)).toBe('y');
    expect(nextKeyboardLetter('w', 0, STUMPED)).toBe('t');
  });
});

describe('conflictingSlots', () => {
  it('flags locked letters that are grey on the target', () => {
    expect(
      conflictingSlots(slots('rotls', ['kept', 'kept', 'suggested', 'kept', 'kept']), STUMPED)
    ).toEqual([true, false, false, false, false]);
  });
});

describe('targetStatuses', () => {
  it('colours typed letters by what the target has revealed', () => {
    const knowledge = boardKnowledge(['salty'], 'stylo');
    expect(targetStatuses(slots('slaxo', 'suggested'), knowledge)).toEqual([
      'correct',
      'present',
      'absent',
      'unknown',
      'unknown',
    ]);
  });

  it('stays neutral without a target', () => {
    expect(targetStatuses(slots('slaxo', 'suggested'))).toEqual(Array(5).fill('unknown'));
  });
});

describe('relock', () => {
  it('moves letter locks with their letters and keeps spot locks', () => {
    const before = slots('tlo__', ['pinned', 'kept', 'kept', 'suggested', 'suggested']);
    expect(relock(before, ['t', 'x', 'o', 'y', 'l']).map((s) => s.lock)).toEqual([
      'pinned',
      'suggested',
      'kept',
      'suggested',
      'kept',
    ]);
  });
});

describe('createJumbler', () => {
  it('refreshes the deck when required counts change with the same arrangement count', () => {
    const jumble = createJumbler(() => 0);
    const row = slots('_____', 'suggested');
    const knowledge = boardKnowledge([], 'apple');
    knowledge.required.set('a', 1);
    expect(validArrangements(row, knowledge)).toHaveLength(5);
    jumble(row, knowledge);

    knowledge.required.set('a', 4);
    expect(validArrangements(row, knowledge)).toHaveLength(5);
    expect(jumble(row, knowledge)!.filter((letter) => letter === 'a')).toHaveLength(4);
  });

  it('does not repeat until every arrangement has shown', () => {
    const jumble = createJumbler();
    const seen = new Set<string>();
    for (let i = 0; i < 36; i++) {
      seen.add(jumble(slots('tlohs'), STUMPED)!.join(''));
    }
    expect(seen.size).toBe(36);
  });

  it('steps through keyboard order when one slot is free', () => {
    const jumble = createJumbler();
    const row = slots('styl_', ['pinned', 'pinned', 'pinned', 'pinned', 'suggested']);
    expect(jumble(row)!.join('')).toBe('stylq');
    row[4].letter = 'q';
    expect(jumble(row)!.join('')).toBe('stylw');
  });

  it('returns null when nothing fits', () => {
    expect(createJumbler()(slots('sssss'), STUMPED)).toBeNull();
  });
});
