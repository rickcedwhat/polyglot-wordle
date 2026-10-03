import { describe, expect, it } from 'vitest';
import {
  boardKnowledge,
  conflictingSlots,
  createJumbler,
  fillOpenSlots,
  nextKeyboardLetter,
  nextLock,
  relock,
  validArrangements,
  type JumbleLock,
  type JumbleSlot,
} from './letterJumble';

const slots = (word: string, locks: JumbleLock | JumbleLock[] = 'letter'): JumbleSlot[] =>
  word.split('').map((letter, i) => ({
    letter: letter === '_' ? '' : letter,
    lock: Array.isArray(locks) ? locks[i] : locks,
  }));

// Against STYLO: yellows O(2) T(4) from ROUTE, S(3) from CASER, L(3) S(4) from VALSE.
const STUMPED = boardKnowledge(['route', 'caser', 'valse'], 'stylo');

describe('nextLock', () => {
  it('cycles free → letter → spot → free', () => {
    expect(nextLock('free')).toBe('letter');
    expect(nextLock('letter')).toBe('spot');
    expect(nextLock('spot')).toBe('free');
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
    const result = validArrangements(
      slots('stoll', ['spot', 'letter', 'letter', 'letter', 'letter'])
    );
    expect(result.every((word) => word[0] === 's')).toBe(true);
    expect(result).toHaveLength(12);
  });

  it('pins target greens and consumes a matching locked letter', () => {
    const knowledge = boardKnowledge(['salty'], 'stylo');
    const result = validArrangements(
      slots('tos__', ['letter', 'letter', 'letter', 'free', 'free']),
      knowledge
    );
    expect(result.every((word) => word[0] === 's')).toBe(true);
    expect(result.every((word) => word.filter((l) => l === 's').length === 1)).toBe(true);
  });

  it('leaves free slots open', () => {
    const result = validArrangements(slots('ab___', ['letter', 'letter', 'free', 'free', 'free']));
    expect(result).toHaveLength(20);
    expect(result.every((word) => word.filter((l) => l === '').length === 3)).toBe(true);
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
      conflictingSlots(slots('rotls', ['letter', 'letter', 'free', 'letter', 'letter']), STUMPED)
    ).toEqual([true, false, false, false, false]);
  });
});

describe('relock', () => {
  it('moves letter locks with their letters and keeps spot locks', () => {
    const before = slots('tlo__', ['spot', 'letter', 'letter', 'free', 'free']);
    expect(relock(before, ['t', 'x', 'o', 'y', 'l']).map((s) => s.lock)).toEqual([
      'spot',
      'free',
      'letter',
      'free',
      'letter',
    ]);
  });
});

describe('createJumbler', () => {
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
    const row = slots('styl_', ['spot', 'spot', 'spot', 'spot', 'free']);
    expect(jumble(row)!.join('')).toBe('stylq');
    row[4].letter = 'q';
    expect(jumble(row)!.join('')).toBe('stylw');
  });

  it('returns null when nothing fits', () => {
    expect(createJumbler()(slots('sssss'), STUMPED)).toBeNull();
  });
});
