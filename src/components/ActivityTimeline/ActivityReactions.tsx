import { IconMoodPlus } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Group, Menu, Text } from '@mantine/core';
import {
  REACTION_EMOJI,
  REACTIONS,
  useActivityReactions,
  type ActivityReaction,
  type ReactionEmoji,
} from '@/hooks/useActivityReactions';
import type { ReactionTarget } from '@/utils/activityTimeline';
import { showToast } from '@/utils/toast';

/** Shared view also used by Storybook's local-only reaction fixtures. */
export const ReactionBar = ({
  reactions,
  userId,
  saving = false,
  onToggle,
}: {
  reactions: ActivityReaction[];
  userId?: string;
  saving?: boolean;
  onToggle: (emoji: ReactionEmoji, selected: boolean) => void;
}) => {
  const { t } = useTranslation();
  const selected = (emoji: ReactionEmoji) =>
    reactions.some((item) => item.userId === userId && item.emoji === emoji);
  const count = (emoji: ReactionEmoji) => reactions.filter((item) => item.emoji === emoji).length;
  return (
    <Group gap={6} mt="sm">
      {REACTIONS.filter((emoji) => count(emoji) > 0).map((emoji) => (
        <Button
          key={emoji}
          size="compact-xs"
          radius="xl"
          variant={selected(emoji) ? 'light' : 'default'}
          disabled={saving || !userId}
          aria-label={t('activity.reactWith', { reaction: t(`activity.reactions.${emoji}`) })}
          aria-pressed={selected(emoji)}
          onClick={() => onToggle(emoji, !selected(emoji))}
        >
          {REACTION_EMOJI[emoji]}{' '}
          <Text span inherit ml={5}>
            {count(emoji)}
          </Text>
        </Button>
      ))}
      <Menu position="bottom-start" withinPortal>
        <Menu.Target>
          <Button
            variant="subtle"
            size="compact-xs"
            color="gray"
            disabled={saving || !userId}
            leftSection={<IconMoodPlus size={16} />}
            aria-label={t('activity.addReaction')}
          >
            {t('activity.react')}
          </Button>
        </Menu.Target>
        <Menu.Dropdown>
          {REACTIONS.map((emoji) => (
            <Menu.Item key={emoji} onClick={() => onToggle(emoji, !selected(emoji))}>
              {REACTION_EMOJI[emoji]} {t(`activity.reactions.${emoji}`)}
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    </Group>
  );
};
export const ActivityReactions = ({ target }: { target: ReactionTarget }) => {
  const { t } = useTranslation();
  const reaction = useActivityReactions(target);
  if (reaction.isPending) {
    return null;
  }
  if (reaction.isError) {
    return (
      <Button size="compact-xs" variant="subtle" mt="sm" onClick={() => reaction.refetch()}>
        {t('activity.retryReactions')}
      </Button>
    );
  }
  return (
    <ReactionBar
      reactions={reaction.data ?? []}
      userId={reaction.currentUserId}
      saving={reaction.isSaving}
      onToggle={async (emoji, selected) => {
        try {
          await reaction.toggle({ emoji, selected });
        } catch {
          showToast({ message: t('activity.reactionFailed'), color: 'red' }, { immediate: true });
        }
      }}
    />
  );
};
