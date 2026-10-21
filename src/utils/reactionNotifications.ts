import type { Timestamp } from 'firebase/firestore';
import type { ActivityReaction } from '@/hooks/useActivityReactions';
import type { ReactionTarget } from './activityTimeline';

export interface IncomingReaction extends ActivityReaction, ReactionTarget {
  id: string;
  createdAt: Timestamp;
}
export interface ReactionNotification extends ReactionTarget {
  id: string;
  actors: string[];
  reactions: IncomingReaction[];
  latestAt: Timestamp;
  unread: boolean;
}
export const compareTimestamps = (a: Timestamp, b: Timestamp) =>
  a.seconds - b.seconds || a.nanoseconds - b.nanoseconds;

/** A removed and re-added reaction has a new timestamp and becomes unread again. */
export const groupReactionNotifications = (
  reactions: IncomingReaction[],
  receipts: Record<string, Timestamp>,
  userId: string
): ReactionNotification[] => {
  const groups = new Map<string, ReactionNotification>();
  [...reactions]
    .sort((a, b) => compareTimestamps(b.createdAt, a.createdAt) || a.id.localeCompare(b.id))
    .forEach((reaction) => {
      if (reaction.userId === userId || reaction.ownerId !== userId) {
        return;
      }
      const group = groups.get(reaction.targetKey) ?? {
        id: reaction.targetKey,
        kind: reaction.kind,
        sourceId: reaction.sourceId,
        ownerId: userId,
        actors: [],
        reactions: [],
        latestAt: reaction.createdAt,
        unread: false,
      };
      group.reactions.push(reaction);
      if (!group.actors.includes(reaction.userId)) {
        group.actors.push(reaction.userId);
      }
      group.unread =
        !receipts[group.id] || compareTimestamps(group.latestAt, receipts[group.id]) > 0;
      groups.set(group.id, group);
    });
  return [...groups.values()];
};
export const notificationHref = (id: string) => `/feed?activity=${encodeURIComponent(id)}`;
export const parseNotificationTarget = (
  key: string | null
): Omit<ReactionTarget, 'ownerId'> | null => {
  if (!key) {
    return null;
  }
  const split = key.lastIndexOf('__');
  const sourceId = key.slice(0, split);
  const kind = key.slice(split + 2);
  if (
    split <= 0 ||
    sourceId.length > 256 ||
    sourceId.includes('/') ||
    !['game', 'certification', 'feat', 'personalBest', 'streak', 'firstGame'].includes(kind)
  ) {
    return null;
  }
  return { sourceId, kind: kind as ReactionTarget['kind'] };
};
