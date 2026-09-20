import { FC, ReactNode } from 'react';
import { IconSwords } from '@tabler/icons-react';
import { Center, Container, Loader, Stack, Text, Title } from '@mantine/core';
import { ChallengeInboxCard } from '@/components/ChallengeInboxCard/ChallengeInboxCard';
import { useChallenges } from '@/hooks/useChallenges';

export const ChallengesPage: FC = () => {
  const { needsYou, waiting, archive, isLoading, isError, markResultSeen } = useChallenges();

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
        <Text c="red">Could not load challenges.</Text>
      </Center>
    );
  }

  const empty = needsYou.length === 0 && waiting.length === 0 && archive.length === 0;

  return (
    <Container size="sm" py="lg">
      <GroupTitle
        title="Challenges"
        subtitle="Duel inbox — play received challenges, track sent ones, and review showdowns."
      />

      {empty && (
        <Text c="dimmed" mt="xl">
          No challenges yet. Finish a puzzle and tap Share Challenge, or open a friend&apos;s link
          and make your first guess.
        </Text>
      )}

      {needsYou.length > 0 && (
        <Section title="Needs you">
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
        <Section title="Waiting on them">
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
        <Section title="Archive">
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
