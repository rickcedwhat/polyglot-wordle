import { FC, ReactNode, useState } from 'react';
import { IconSwords } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Button, Center, Container, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { ChallengeFriendModal } from '@/components/ChallengeFriendModal/ChallengeFriendModal';
import { ChallengeInboxCard } from '@/components/ChallengeInboxCard/ChallengeInboxCard';
import { useChallenges } from '@/hooks/useChallenges';

export const ChallengesPage: FC = () => {
  const { needsYou, waiting, archive, isLoading, isError, markResultSeen } = useChallenges();
  const [challengeOpened, setChallengeOpened] = useState(false);
  const { t } = useTranslation();

  if (isLoading) {
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

  const empty = needsYou.length === 0 && waiting.length === 0 && archive.length === 0;

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

      {waiting.length > 0 && (
        <Section title={t('challenges.waiting')}>
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
