import { Timestamp } from 'firebase/firestore';
import { expect, it } from 'vitest';
import type { ActivityRecord, FeedGame } from './activityTimeline';
import { buildFeedTimeline, puzzleIdentity } from './sharedPuzzleFeed';

const game = (userId: string, overrides: Partial<FeedGame> = {}): FeedGame => ({
  id: `${userId}_puzzle`,
  userId,
  gameId: 'puzzle',
  words: { en: 'apple', es: 'queso', fr: 'fruit' },
  difficulties: {},
  shuffledLanguages: ['en', 'es', 'fr'],
  guessHistory: ['apple'],
  isLiveGame: false,
  isWin: true,
  score: 1200,
  scoringVersion: 3,
  startedAt: Timestamp.fromMillis(100),
  completedAt: Timestamp.fromMillis(200),
  ...overrides,
});
const row = (game: FeedGame): ActivityRecord => ({ type: 'game', game });
it('groups the same puzzle across people, pages and days without duplicate players', () => {
  const a = game('a'),
    b = game('b', { completedAt: Timestamp.fromMillis(86400200) });
  const entries = buildFeedTimeline([row(a), row(b), row(a)]);
  expect(entries).toHaveLength(1);
  expect(entries[0].type).toBe('puzzle');
  expect(entries[0].type === 'puzzle' && entries[0].games.map((item) => item.userId)).toEqual([
    'b',
    'a',
  ]);
});
it('does not combine changed words, difficulty, scoring, seed or language sets', () => {
  const a = game('a');
  for (const override of [
    { words: { en: 'melon', es: 'queso', fr: 'fruit' } },
    { difficulties: { en: 'advanced' } },
    { scoringVersion: 2 },
    { gameId: 'different' },
    { shuffledLanguages: ['en', 'es', 'pt'] },
  ] as Partial<FeedGame>[]) {
    expect(
      buildFeedTimeline([row(a), row(game('b', override))]).some((entry) => entry.type === 'puzzle')
    ).toBe(false);
  }
  expect(puzzleIdentity(a)).toBe(
    puzzleIdentity(
      game('b', {
        shuffledLanguages: ['fr', 'en', 'es'],
        difficulties: { en: 'basic', es: 'basic', fr: 'basic' },
      })
    )
  );
});
it('preserves milestones and re-groups the remaining solo games', () => {
  const a = game('a', {
    activity: { firstGame: false, personalBest: true, streak: null, feats: [] },
  });
  const solo = game('a', { id: 'a_solo', gameId: 'solo' });
  const result = buildFeedTimeline([row(a), row(game('b')), row(solo)]);
  expect(result.map((entry) => entry.type).sort()).toEqual(['games', 'personalBest', 'puzzle']);
  const group = result.find((entry) => entry.type === 'games');
  expect(group?.type === 'games' && group.games).toEqual([solo]);
});
it('does not group unfinished games or a player’s repeat records alone', () => {
  expect(
    buildFeedTimeline([
      row(game('a')),
      row(game('b', { isLiveGame: true, completedAt: null })),
    ]).some((entry) => entry.type === 'puzzle')
  ).toBe(false);
  expect(
    buildFeedTimeline([row(game('a')), row(game('a', { id: 'another' }))]).some(
      (entry) => entry.type === 'puzzle'
    )
  ).toBe(false);
});

it('keeps the newest distinct finished record for each player in a shared group', () => {
  const older = game('a', { id: 'a_older', completedAt: Timestamp.fromMillis(100) });
  const newer = game('a', { id: 'a_newer', completedAt: Timestamp.fromMillis(300) });
  const other = game('b', { completedAt: Timestamp.fromMillis(200) });
  const entries = buildFeedTimeline([row(older), row(other), row(newer)]);
  expect(entries).toHaveLength(1);
  expect(entries[0].type === 'puzzle' && entries[0].games.map((item) => item.id)).toEqual([
    'a_newer',
    'b_puzzle',
  ]);
});
it.each([undefined, '', '   '])(
  'does not group games missing an active-language solution (%s)',
  (solution) => {
    const incomplete = { en: 'apple', es: 'queso', fr: solution };
    const first = game('a', { words: incomplete });
    const second = game('b', { words: incomplete });
    expect(puzzleIdentity(first)).toBeNull();
    const entries = buildFeedTimeline([row(first), row(second)]);
    expect(entries.some((entry) => entry.type === 'puzzle')).toBe(false);
    expect(entries.filter((entry) => entry.type === 'games')).toHaveLength(2);
  }
);
it('omits the duplicate personal-best score only for games grouped into shared puzzles', () => {
  const activity = { firstGame: false, personalBest: true, streak: null, feats: [] };
  const entries = buildFeedTimeline([
    row(game('a', { activity })),
    row(game('b')),
    row(game('c', { gameId: 'solo', activity })),
  ]);
  const bests = entries.filter((entry) => entry.type === 'personalBest');
  expect(
    bests.find((entry) => entry.type === 'personalBest' && entry.userId === 'a')
  ).toHaveProperty('hideScore', true);
  expect(
    bests.find((entry) => entry.type === 'personalBest' && entry.userId === 'c')
  ).not.toHaveProperty('hideScore');
});
