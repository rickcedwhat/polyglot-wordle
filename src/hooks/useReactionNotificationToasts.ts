import { useEffect, useRef } from 'react';
import { useReactionNotifications } from '@/context/ReactionNotificationsContext';
import type { ReactionNotification } from '@/utils/reactionNotifications';

/** Initial/reconnected data and reactions received outside gameplay stay in the inbox only. */
export const useReactionNotificationToasts = (
  isPlaying: boolean,
  onToast: (item: ReactionNotification) => void
) => {
  const { items, ready } = useReactionNotifications();
  const previous = useRef<Map<string, string> | null>(null);
  const enteredAt = useRef<number | null>(null);
  useEffect(() => {
    enteredAt.current = isPlaying ? Date.now() : null;
  }, [isPlaying]);
  useEffect(() => {
    if (!ready) {
      previous.current = null;
      return;
    }
    const versions = new Map(items.map((item) => [item.id, item.latestAt.valueOf()]));
    const old = previous.current;
    previous.current = versions;
    if (!old || !isPlaying || enteredAt.current === null) {
      return;
    }
    // One grouped toast per snapshot, with the newest activity taking priority.
    const fresh = items.find(
      (item) =>
        item.unread &&
        item.latestAt.valueOf() > (old.get(item.id) ?? '') &&
        item.latestAt.toMillis() >= enteredAt.current!
    );
    if (fresh) {
      onToast(fresh);
    }
  }, [items, ready, isPlaying, onToast]);
};
