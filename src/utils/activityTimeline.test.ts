import { Timestamp } from 'firebase/firestore';
import { expect, it } from 'vitest';
import { buildTimeline, reactionKey, type ActivityRecord, type FeedGame } from './activityTimeline';

const game = (id: string, at: number, userId = 'alex'): FeedGame => ({
  id,
  userId,
  gameId: id,
  words: { en: 'apple', es: 'rubia', fr: 'merci' },
  difficulties: {},
  shuffledLanguages: ['en', 'es', 'fr'],
  guessHistory: ['apple'],
  isLiveGame: false,
  isWin: true,
  score: 100,
  startedAt: Timestamp.fromMillis(at - 1000),
  completedAt: Timestamp.fromMillis(at),
});
const row = (g: FeedGame): ActivityRecord => ({ type: 'game', game: g });
it('regroups across loaded pages without duplicate games or duplicate summaries', () => {
  const base = new Date(2026, 9, 18, 12).getTime();
  const records = Array.from({ length: 10 }, (_, i) => row(game(String(i), base - i * 1000)));
  const result = buildTimeline([...records.slice(0, 5), ...records.slice(4)]);
  expect(result).toHaveLength(1);
  expect(result[0].type === 'games' && result[0].games).toHaveLength(10);
});
it('keeps different people and local calendar days separate', () => {
  const base = new Date(2026, 9, 18, 12).getTime();
  expect(
    buildTimeline([
      row(game('a', base)),
      row(game('b', base, 'sam')),
      row(game('c', base - 86400000)),
    ])
  ).toHaveLength(3);
});
it('shows saved milestones before their game group without inventing historical ones', () => {
  const g = game('milestone', 10000);
  g.activity = {
    feats: [{ id: 'dePrimeira', guess: 1, lang: 'pt' }],
    firstGame: false,
    personalBest: true,
    streak: 7,
  };
  const result = buildTimeline([row(g), row(game('legacy', 1000))]);
  expect(result.map((entry) => entry.type)).toEqual(['feat', 'personalBest', 'streak', 'games']);
  expect(reactionKey({ kind: 'game', sourceId: g.id, ownerId: g.userId })).not.toBe(
    reactionKey({ kind: 'personalBest', sourceId: g.id, ownerId: g.userId })
  );
});
it('does not turn common feats into a new activity on every game', () => {
  const g = game('common', 1000);
  g.activity = {
    feats: [{ id: 'speedrun', guess: 4 }],
    firstGame: false,
    personalBest: false,
    streak: null,
  };
  expect(buildTimeline([row(g)]).map((entry) => entry.type)).toEqual(['games']);
});
it('keeps certification identity, level and original timestamp', () => {
  const result = buildTimeline([
    {
      type: 'certification',
      certification: {
        id: 'cert_alex_pt_2',
        userId: 'alex',
        lang: 'pt',
        level: 2,
        wordCount: 150,
        createdAt: Timestamp.fromMillis(4321),
      },
    },
  ]);
  expect(result[0]).toMatchObject({
    id: 'cert:cert_alex_pt_2',
    type: 'certification',
    at: 4321,
    certification: { lang: 'pt', level: 2 },
  });
});
