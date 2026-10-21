import { Timestamp } from 'firebase/firestore';
import { expect, it } from 'vitest';
import {
  groupReactionNotifications,
  notificationHref,
  parseNotificationTarget,
  type IncomingReaction,
} from './reactionNotifications';

const reaction = (overrides: Partial<IncomingReaction> = {}): IncomingReaction => ({
  id: 'a',
  userId: 'alex',
  ownerId: 'me',
  kind: 'game',
  sourceId: 'me_game',
  targetKey: 'me_game__game',
  emoji: 'applause',
  createdAt: new Timestamp(1, 0),
  ...overrides,
});
it('groups emoji and players per activity, excludes self/other owners and sorts newest first', () => {
  const grouped = groupReactionNotifications(
    [
      reaction(),
      reaction({ id: 'b', emoji: 'fire' }),
      reaction({ id: 'c', userId: 'sam', createdAt: new Timestamp(2, 0) }),
      reaction({ id: 'self', userId: 'me' }),
      reaction({ id: 'other', ownerId: 'elsewhere' }),
      reaction({
        id: 'cert',
        kind: 'certification',
        sourceId: 'cert',
        targetKey: 'cert__certification',
        createdAt: new Timestamp(3, 0),
      }),
    ],
    {},
    'me'
  );
  expect(grouped.map((item) => item.id)).toEqual(['cert__certification', 'me_game__game']);
  expect(grouped[1].actors).toEqual(['sam', 'alex']);
  expect(grouped[1].reactions).toHaveLength(3);
});
it('respects read markers at nanosecond precision and makes recreated reactions unread', () => {
  const seen = { me_game__game: new Timestamp(1, 100) };
  expect(
    groupReactionNotifications([reaction({ createdAt: new Timestamp(1, 100) })], seen, 'me')[0]
      .unread
  ).toBe(false);
  expect(
    groupReactionNotifications([reaction({ createdAt: new Timestamp(1, 101) })], seen, 'me')[0]
      .unread
  ).toBe(true);
  expect(groupReactionNotifications([], seen, 'me')).toEqual([]);
});
it('round-trips exact targets and rejects unsupported or malformed activity links', () => {
  expect(notificationHref('me__puzzle__game')).toBe('/feed?activity=me__puzzle__game');
  expect(parseNotificationTarget('me__puzzle__game')).toEqual({
    sourceId: 'me__puzzle',
    kind: 'game',
  });
  for (const value of [null, '', 'game', '__game', 'me/puzzle__game', 'me__unknown']) {
    expect(parseNotificationTarget(value)).toBeNull();
  }
});
