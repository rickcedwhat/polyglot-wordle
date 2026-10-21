import { IconArrowUpRight, IconBell, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Group, Paper, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core';
import { UserAvatar } from '@/components/UserAvatar/UserAvatar';
import classes from './ReactionInbox.module.css';

export interface ReactionNotice {
  id: string;
  actor: string;
  summary: string;
  target: string;
  when: string;
  emojis: string;
  unread: boolean;
}

/** Presentational inbox; receiving, grouping, and read persistence belong to the caller. */
export const ReactionInbox = ({
  items,
  onOpen,
  onReadAll,
  totalUnread,
  saving = false,
}: {
  items: ReactionNotice[];
  onOpen: (item: ReactionNotice) => void;
  onReadAll: () => void;
  totalUnread?: number;
  saving?: boolean;
}) => {
  const { t } = useTranslation();
  const count = totalUnread ?? items.filter((item) => item.unread).length;
  return (
    <Paper withBorder radius="md" className={classes.inbox}>
      <Group justify="space-between" p="md" gap="xs">
        <Group gap="xs">
          <IconBell size={18} />
          <Text fw={650}>{t('activity.notifications.title')}</Text>
          {count > 0 && (
            <Badge size="sm" variant="light">
              {t('activity.notifications.new', { count })}
            </Badge>
          )}
        </Group>
        {count > 0 && (
          <Button variant="subtle" size="compact-xs" onClick={onReadAll} loading={saving}>
            {t('activity.notifications.readAll')}
          </Button>
        )}
      </Group>
      {items.length === 0 ? (
        <Group px="md" pb="lg" gap="sm" wrap="nowrap">
          <ThemeIcon variant="light" color="teal" radius="xl">
            <IconCheck size={17} />
          </ThemeIcon>
          <div>
            <Text size="sm" fw={550}>
              {t('activity.notifications.caughtUp')}
            </Text>
            <Text size="xs" c="dimmed">
              {t('activity.notifications.empty')}
            </Text>
          </div>
        </Group>
      ) : (
        <Stack gap={0}>
          {items.map((item) => (
            <UnstyledButton
              key={item.id}
              className={classes.notice}
              data-unread={item.unread || undefined}
              onClick={() => onOpen(item)}
              aria-label={`${item.unread ? `${t('activity.notifications.unread')}: ` : ''}${item.summary}. ${item.target}`}
            >
              <Group gap="sm" wrap="nowrap" align="flex-start">
                <UserAvatar name={item.actor} size={34} />
                <div className={classes.content}>
                  <Group gap="xs" justify="space-between" wrap="nowrap">
                    <Text size="sm" fw={item.unread ? 600 : 450}>
                      {item.summary}
                    </Text>
                    {item.unread && (
                      <span
                        className={classes.dot}
                        aria-label={t('activity.notifications.unread')}
                      />
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" mt={3}>
                    {item.target} · {item.when}
                  </Text>
                  <Text size="sm" mt={5}>
                    {item.emojis}
                  </Text>
                </div>
                <IconArrowUpRight size={15} className={classes.arrow} />
              </Group>
            </UnstyledButton>
          ))}
        </Stack>
      )}
    </Paper>
  );
};
