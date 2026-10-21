import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button, Center, Loader, Stack, Text } from '@mantine/core';
import { useReactionNotifications } from '@/context/ReactionNotificationsContext';
import { useReactionNotices } from '@/hooks/useReactionNotices';
import { notificationHref } from '@/utils/reactionNotifications';
import { showToast } from '@/utils/toast';
import { ReactionInbox } from './ReactionInbox';

export const ReactionInboxContainer = () => {
  const inbox = useReactionNotifications();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(20);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const items = useReactionNotices(inbox.items.slice(0, visible));
  const save = async (ids: string[]) => {
    setSaving(true);
    setFailed(false);
    try {
      await inbox.markRead(inbox.items.filter((item) => ids.includes(item.id)));
    } catch {
      setFailed(true);
      showToast(
        { color: 'red', message: t('activity.notifications.saveFailed') },
        { immediate: true }
      );
    } finally {
      setSaving(false);
    }
  };
  if (inbox.isError) {
    return (
      <Stack gap="xs">
        <Text c="red">{t('activity.notifications.loadFailed')}</Text>
        <Button variant="subtle" onClick={inbox.retry}>
          {t('common.tryAgain')}
        </Button>
      </Stack>
    );
  }
  if (inbox.isLoading) {
    return (
      <Center>
        <Loader size="sm" />
      </Center>
    );
  }
  return (
    <Stack gap="xs">
      {failed && (
        <Text c="red" role="alert" size="sm">
          {t('activity.notifications.saveFailed')}
        </Text>
      )}
      <ReactionInbox
        items={items}
        saving={saving}
        totalUnread={inbox.items.filter((item) => item.unread).length}
        onOpen={(item) => {
          void save([item.id]);
          navigate(notificationHref(item.id));
        }}
        onReadAll={() => {
          void save(inbox.items.filter((item) => item.unread).map((item) => item.id));
        }}
      />
      {inbox.items.length > visible && (
        <Button variant="subtle" onClick={() => setVisible((old) => old + 20)}>
          {t('history.loadMore')}
        </Button>
      )}
    </Stack>
  );
};
