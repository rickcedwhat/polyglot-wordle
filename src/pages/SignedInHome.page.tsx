import { useState } from 'react';
import { IconArrowRight, IconCheck } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Anchor,
  Badge,
  Button,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { ActivityTimeline } from '@/components/ActivityTimeline/ActivityTimeline';
import { ChallengeInboxCard } from '@/components/ChallengeInboxCard/ChallengeInboxCard';
import { NewGameButton } from '@/components/NewGameButton/NewGameButton';
import { useAuth } from '@/context/AuthContext';
import { useActivityTimeline } from '@/hooks/useActivityTimeline';
import { useChallenges, type ChallengeInboxItem } from '@/hooks/useChallenges';
import { buildTimeline } from '@/utils/activityTimeline';
import classes from './SignedInHome.module.css';

export const SignedInHomePage = () => {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const challenges = useChallenges();
  const feed = useActivityTimeline();
  // Keep an opened result mounted when marking it seen removes it from needsYou.
  const [openedChallenge, setOpenedChallenge] = useState<ChallengeInboxItem | null>(null);
  const visibleChallenges = challenges.needsYou.slice(0, 3);
  const cards =
    openedChallenge && !visibleChallenges.some((c) => c.id === openedChallenge.id)
      ? [...visibleChallenges, openedChallenge]
      : visibleChallenges;
  const name = currentUser?.displayName?.trim();
  const entries = buildTimeline(feed.data?.pages.flatMap((page) => page.records) ?? []).slice(0, 3);

  return (
    <Container size={1032} className={classes.main}>
      <Stack gap={30}>
        <header>
          <Text className={classes.eyebrow}>{t('nav.home')}</Text>
          <Title order={1} className={classes.greeting}>
            {name ? t('home.welcomeName', { name }) : t('home.welcome')}
          </Title>
          <Text c="dimmed" mt={6}>
            {t('home.subtitle')}
          </Text>
        </header>
        <section aria-labelledby="home-challenges">
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <Title id="home-challenges" order={2} size={20}>
                {t('home.yourMove')}
              </Title>
              {challenges.needsYou.length > 0 && (
                <Badge size="sm" variant="light">
                  {challenges.needsYou.length}
                </Badge>
              )}
            </Group>
            <Anchor component={Link} to="/challenges" size="sm">
              {t('home.allChallenges')} <IconArrowRight size={13} />
            </Anchor>
          </Group>
          {challenges.isLoading ? (
            <Center>
              <Loader size="sm" />
            </Center>
          ) : challenges.isError ? (
            <Stack gap="xs">
              <Text c="red">{t('challenges.loadFailed')}</Text>
              <Button variant="subtle" onClick={() => challenges.refetch()}>
                {t('common.tryAgain')}
              </Button>
            </Stack>
          ) : (
            <>
              {cards.length > 0 && (
                <Paper
                  withBorder={visibleChallenges.length > 0}
                  radius="md"
                  className={classes.challengeList}
                >
                  {cards.map((challenge) => (
                    <ChallengeInboxCard
                      key={challenge.id}
                      challenge={challenge}
                      section="needsYou"
                      compact
                      hideRow={!visibleChallenges.some((c) => c.id === challenge.id)}
                      onResultOpen={() => setOpenedChallenge(challenge)}
                      onMarkSeen={challenges.markResultSeen}
                    />
                  ))}
                </Paper>
              )}
              {visibleChallenges.length === 0 && (
                <Paper withBorder radius="md" p="md">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon variant="light" color="teal" radius="xl">
                      <IconCheck size={16} />
                    </ThemeIcon>
                    <div>
                      <Text size="sm" fw={600}>
                        {t('home.caughtUp')}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {t('home.caughtUpHint')}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              )}
            </>
          )}
        </section>
        <section aria-labelledby="home-community">
          <Group justify="space-between" mb="lg">
            <div>
              <Title id="home-community" order={2} size={20}>
                {t('home.community')}
              </Title>
              <Text size="sm" c="dimmed">
                {t('feed.subtitle')}
              </Text>
            </div>
            <Anchor component={Link} to="/feed" size="sm">
              {t('home.viewAll')} <IconArrowRight size={13} />
            </Anchor>
          </Group>
          {feed.isPending && (
            <Center>
              <Loader size="sm" />
            </Center>
          )}
          {feed.isError && (
            <Stack gap="xs">
              <Text c="red">{t('feed.loadFailed')}</Text>
              <Button variant="subtle" onClick={() => feed.refetch()}>
                {t('common.tryAgain')}
              </Button>
            </Stack>
          )}
          {!feed.isPending && !feed.isError && entries.length === 0 && (
            <Paper withBorder radius="md" p="lg">
              <Text c="dimmed">{t('feed.empty')}</Text>
              <Group mt="md">
                <NewGameButton />
              </Group>
            </Paper>
          )}
          <ActivityTimeline entries={entries} />
        </section>
      </Stack>
    </Container>
  );
};
