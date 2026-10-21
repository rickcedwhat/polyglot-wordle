import { useTranslation } from 'react-i18next';
import { Button, Stack, Text } from '@mantine/core';
import { REACTION_EMOJI } from '@/hooks/useActivityReactions';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { ReactionNotification } from '@/utils/reactionNotifications';

export const ReactionToastMessage = ({
  item,
  onOpen,
}: {
  item: ReactionNotification;
  onOpen: () => void;
}) => {
  const { t } = useTranslation();
  const { data } = useUserProfile(item.actors[0]);
  return (
    <Stack gap={4}>
      <Text size="sm">
        {t(
          item.actors.length > 1
            ? 'activity.notifications.summaryOthers'
            : 'activity.notifications.summary',
          {
            name: data?.displayName || t('challenges.yourFriend'),
            count: item.actors.length - 1,
            target: t(`activity.notifications.${item.kind}`),
          }
        )}{' '}
        {Array.from(new Set(item.reactions.map((reaction) => REACTION_EMOJI[reaction.emoji]))).join(
          ' '
        )}
      </Text>
      <Button variant="subtle" size="compact-xs" w="fit-content" onClick={onOpen}>
        {t('activity.notifications.view')}
      </Button>
    </Stack>
  );
};
