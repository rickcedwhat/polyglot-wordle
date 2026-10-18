import { FC, ReactNode, useState } from 'react';
import { IconSwords } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Center, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { ChallengeFriendModal } from '@/components/ChallengeFriendModal/ChallengeFriendModal';
import { ChallengeInboxCard } from '@/components/ChallengeInboxCard/ChallengeInboxCard';
import { SharedInviteCard } from '@/components/SharedInviteCard/SharedInviteCard';
import { useAuth } from '@/context/AuthContext';
import { useChallenges } from '@/hooks/useChallenges';
import { useSharedInvites } from '@/hooks/useSharedInvites';

export const ChallengesPage: FC = () => {
  const { challenges, needsYou, waiting, archive, isLoading, isError, markResultSeen } =
    useChallenges();
  const shared = useSharedInvites();
  const { currentUser } = useAuth();
  const unjoined = shared.invites.filter(
    (invite) =>
      !challenges.some(
        (challenge) =>
          challenge.source === 'share' &&
          challenge.createdBy === currentUser?.uid &&
          challenge.gameId === invite.gameId
      )
  );
  const [challengeOpened, setChallengeOpened] = useState(false);
  const { t } = useTranslation();

  if (isLoading || shared.isLoading) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h="100%">
        <Text c="red">{t('challenges.loadFailed')}</Text>
      </Center>
    );
  }

  const empty =
    needsYou.length === 0 &&
    waiting.length === 0 &&
    archive.length === 0 &&
    unjoined.length === 0 &&
    !shared.isError;

  return (
    <Container size="sm" py="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <GroupTitle title={t('challenges.title')} subtitle={t('challenges.subtitle')} />
        <Button
          size="xs"
          color="grape"
          leftSection={<IconSwords size={14} />}
          onClick={() => setChallengeOpened(true)}
          style={{ flexShrink: 0 }}
        >
          {t('setup.titles.challenge')}
        </Button>
      </Group>
      <ChallengeFriendModal opened={challengeOpened} onClose={() => setChallengeOpened(false)} />

      {shared.isError && (
        <Stack gap="xs" mt="md">
          <Text c="red">{t('sharedInvites.loadFailed')}</Text>
          <Button variant="subtle" onClick={() => shared.refetch()}>
            {t('common.tryAgain')}
          </Button>
        </Stack>
      )}
      {empty && (
        <Text c="dimmed" mt="xl">
          {t('challenges.empty')}
        </Text>
      )}

      {needsYou.length > 0 && (
        <Section title={t('challenges.needsYou')}>
          {needsYou.map((c) => (
            <ChallengeInboxCard
              key={c.id}
              challenge={c}
              section="needsYou"
              onMarkSeen={markResultSeen}
            />
          ))}
        </Section>
      )}

      {(waiting.length > 0 || unjoined.length > 0) && (
        <Section title={t('challenges.waiting')}>
          {unjoined.map((invite) => (
            <SharedInviteCard key={invite.gameId} invite={invite} onRemove={shared.remove} />
          ))}
          {waiting.map((c) => (
            <ChallengeInboxCard
              key={c.id}
              challenge={c}
              section="waiting"
              onMarkSeen={markResultSeen}
            />
          ))}
        </Section>
      )}

      {archive.length > 0 && (
        <Section title={t('challenges.archive')}>
          {archive.map((c) => (
            <ChallengeInboxCard
              key={c.id}
              challenge={c}
              section="archive"
              onMarkSeen={markResultSeen}
            />
          ))}
        </Section>
      )}
    </Container>
  );
};

const GroupTitle: FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <Stack gap={4} mb="lg">
    <Title order={2}>
      <IconSwords size={22} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
      {title}
    </Title>
    <Text size="sm" c="dimmed">
      {subtitle}
    </Text>
  </Stack>
);

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <Stack gap="sm" mt="xl">
    <Text size="xs" fw={700} c="dimmed" tt="uppercase">
      {title}
    </Text>
    {children}
  </Stack>
);
