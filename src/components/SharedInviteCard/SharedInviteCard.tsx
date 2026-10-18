import { useState } from 'react';
import { IconLink, IconShare, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import type { SharedInviteDoc } from '@/types/firestore';
import { flagFor } from '@/utils/languages';
import { shareChallengeLink } from '@/utils/shareUtils';

export const SharedInviteCard = ({
  invite,
  onRemove,
}: {
  invite: SharedInviteDoc;
  onRemove: (gameId: string) => Promise<unknown>;
}) => {
  const { currentUser } = useAuth();
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(false);
    try {
      await action();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group gap="xs">
          <IconLink size={18} />
          <Text fw={600}>{t('sharedInvites.title')}</Text>
        </Group>
        <Text size="sm" c="dimmed">
          {t('sharedInvites.waiting')}
        </Text>
        <Group justify="space-between">
          <Text>{invite.languages.map(flagFor).join(' ')}</Text>
          <Text size="xs" c="dimmed">
            {invite.createdAt.toDate().toLocaleDateString(i18n.language)}
          </Text>
        </Group>
        <Group>
          <Button
            variant="light"
            leftSection={<IconShare size={16} />}
            disabled={busy}
            onClick={() => {
              setCopied(false);
              return run(() =>
                shareChallengeLink({
                  gameId: invite.gameId,
                  languages: invite.languages,
                  currentUserId: currentUser?.uid,
                  onCopied: () => setCopied(true),
                })
              );
            }}
          >
            {t('sharedInvites.shareAgain')}
          </Button>
          <Tooltip
            label={t('sharedInvites.removeHint')}
            events={{ hover: true, focus: true, touch: true }}
          >
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconTrash size={16} />}
              disabled={busy}
              onClick={() => run(() => onRemove(invite.gameId))}
            >
              {t('sharedInvites.remove')}
            </Button>
          </Tooltip>
        </Group>
        {copied && (
          <Text size="sm" c="teal">
            {t('sharedInvites.copied')}
          </Text>
        )}
        {error && (
          <Text size="sm" c="red">
            {t('sharedInvites.actionFailed')}
          </Text>
        )}
      </Stack>
    </Paper>
  );
};
