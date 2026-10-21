import { useQueries } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { CERTIFICATION_LEVELS } from '@/achievements/config';
import type { ReactionNotice } from '@/components/ReactionNotifications/ReactionInbox';
import type {
  ActivityRecord,
  FeedCertification,
  FeedGame,
  ReactionTarget,
} from '@/utils/activityTimeline';
import { labelFor } from '@/utils/languages';
import type { ReactionNotification } from '@/utils/reactionNotifications';
import { REACTION_EMOJI, REACTIONS } from './useActivityReactions';
import { fetchUserProfile } from './useUserProfile';

export const notificationSourceOptions = (target: Omit<ReactionTarget, 'ownerId'>) => ({
  queryKey: [
    'notificationSource',
    target.kind === 'certification' ? 'activityEvents' : 'games',
    target.sourceId,
  ],
  queryFn: async (): Promise<ActivityRecord | null> => {
    const snapshot = await getDoc(
      doc(
        getFirestore(),
        target.kind === 'certification' ? 'activityEvents' : 'games',
        target.sourceId
      )
    );
    if (!snapshot.exists()) {
      return null;
    }
    return target.kind === 'certification'
      ? {
          type: 'certification',
          certification: { ...snapshot.data(), id: snapshot.id } as FeedCertification,
        }
      : { type: 'game', game: { ...snapshot.data(), id: snapshot.id } as FeedGame };
  },
  staleTime: 30_000,
});
export const useReactionNotices = (items: ReactionNotification[]): ReactionNotice[] => {
  const { t, i18n } = useTranslation();
  const actorIds = Array.from(new Set(items.map((item) => item.actors[0])));
  const sourceTargets = Array.from(
    new Map(
      items.map((item) => [JSON.stringify(notificationSourceOptions(item).queryKey), item])
    ).values()
  );
  const actors = useQueries({
    queries: actorIds.map((id) => ({
      queryKey: ['userProfile', id],
      queryFn: () => fetchUserProfile(id),
      staleTime: 60_000,
    })),
  });
  const sources = useQueries({ queries: sourceTargets.map(notificationSourceOptions) });
  return items.map((item) => {
    const actor =
      actors[actorIds.indexOf(item.actors[0])].data?.displayName || t('challenges.yourFriend');
    const source =
      sources[
        sourceTargets.findIndex(
          (source) =>
            source.sourceId === item.sourceId &&
            (source.kind === 'certification') === (item.kind === 'certification')
        )
      ].data;
    const target =
      source?.type === 'certification'
        ? `${labelFor(source.certification.lang)} ${CERTIFICATION_LEVELS[source.certification.level]?.label ?? ''}`
        : source?.type === 'game'
          ? item.kind === 'personalBest'
            ? t('postGame.pts', { score: source.game.score ?? 0 })
            : source.game.shuffledLanguages.map(labelFor).join(' · ')
          : t(`activity.notifications.${item.kind}`);
    return {
      id: item.id,
      actor,
      summary: t(
        item.actors.length > 1
          ? 'activity.notifications.summaryOthers'
          : 'activity.notifications.summary',
        {
          name: actor,
          count: item.actors.length - 1,
          target: t(`activity.notifications.${item.kind}`),
        }
      ),
      target,
      when: item.latestAt.toDate().toLocaleString(i18n.language, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
      emojis: REACTIONS.filter((emoji) => item.reactions.some((r) => r.emoji === emoji))
        .map(
          (emoji) =>
            `${REACTION_EMOJI[emoji]} ${item.reactions.filter((r) => r.emoji === emoji).length}`
        )
        .join('  '),
      unread: item.unread,
    };
  });
};
