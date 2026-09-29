import { describe, expect, it } from 'vitest';
import { getAchievements, newlyEarned } from './achievements';

const byId = (achievements: ReturnType<typeof getAchievements>, id: string) =>
  achievements.find((a) => a.id === id)!;

describe('getAchievements', () => {
  it('starts every achievement with no tier', () => {
    const achievements = getAchievements({ wordCounts: {}, definitionsRead: 0 });
    expect(achievements.map((a) => a.id)).toEqual([
      'certified-en',
      'certified-es',
      'certified-fr',
      'certified-it',
      'certified-pt',
      'polyglot',
      'reader',
    ]);
    expect(achievements.every((a) => a.tier === null && a.next !== null)).toBe(true);
  });

  it('certifies a language at the highest level reached', () => {
    const es = byId(
      getAchievements({ wordCounts: { es: 160 }, definitionsRead: 0 }),
      'certified-es'
    );
    expect(es.tier?.label).toBe('B1');
    expect(es.next).toEqual({ label: 'B2', target: 300 });
  });

  it('counts a level exactly at its threshold', () => {
    const fr = byId(
      getAchievements({ wordCounts: { fr: 25 }, definitionsRead: 0 }),
      'certified-fr'
    );
    expect(fr.tier?.label).toBe('A1');
  });

  it('has no next tier once maxed', () => {
    const en = byId(
      getAchievements({ wordCounts: { en: 5000 }, definitionsRead: 0 }),
      'certified-en'
    );
    expect(en.tier?.label).toBe('C2');
    expect(en.next).toBeNull();
  });

  it('counts certified languages toward Polyglot', () => {
    const polyglot = byId(
      getAchievements({ wordCounts: { en: 30, es: 80, fr: 24, it: 25 }, definitionsRead: 0 }),
      'polyglot'
    );
    expect(polyglot.current).toBe(3);
    expect(polyglot.tier?.label).toBe('Trilingual');
  });

  it('tracks definitions read', () => {
    const reader = byId(getAchievements({ wordCounts: {}, definitionsRead: 55 }), 'reader');
    expect(reader.tier?.label).toBe('Bookworm');
  });
});

describe('newlyEarned', () => {
  it('returns only achievements whose tier went up', () => {
    const before = getAchievements({ wordCounts: { es: 24, en: 30 }, definitionsRead: 9 });
    const after = getAchievements({ wordCounts: { es: 25, en: 31 }, definitionsRead: 10 });
    expect(newlyEarned(before, after).map((a) => `${a.id}:${a.tier?.label}`)).toEqual([
      'certified-es:A1',
      'polyglot:Bilingual',
      'reader:Curious',
    ]);
  });

  it('returns nothing when progress stays within a tier', () => {
    const before = getAchievements({ wordCounts: { es: 30 }, definitionsRead: 12 });
    const after = getAchievements({ wordCounts: { es: 40 }, definitionsRead: 20 });
    expect(newlyEarned(before, after)).toEqual([]);
  });
});
