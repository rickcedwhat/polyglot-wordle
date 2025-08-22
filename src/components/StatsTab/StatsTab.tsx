import { FC } from 'react';
import { Card, Center, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { useUserProfile } from '@/hooks/useUserProfile'; // Assuming you have a hook to fetch a user profile

import type { Difficulty, Language } from '@/types/firestore';
import { GuessDistributionChart } from '../GuessDistributionChart/GuessDistributionChart';

interface StatsTabProps {
  profileUserId: string;
}

export const StatsTab: FC<StatsTabProps> = ({ profileUserId }) => {
  const { data: userProfile, isLoading } = useUserProfile(profileUserId);

  if (isLoading) {
    return (
      <Center mt="xl">
        <Loader />
      </Center>
    );
  }

  if (!userProfile || !userProfile.stats) {
    return (
      <Text c="dimmed" mt="md">
        This user has no stats to display.
      </Text>
    );
  }

  const { stats } = userProfile;
  const languages: Language[] = ['en', 'es', 'fr'];
  const difficulties: Difficulty[] = ['basic', 'intermediate', 'advanced'];

  return (
    <Stack mt="md">
      {/* Overall Stats */}
      <Title order={3}>Overall Performance</Title>
      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }}>
        <Card withBorder radius="md" ta="center">
          <Text size="xl" fw={700}>
            {stats.gamesPlayed || 0}
          </Text>
          <Text size="xs" c="dimmed">
            Games Played
          </Text>
        </Card>
        <Card withBorder radius="md" ta="center">
          <Text size="xl" fw={700}>
            {stats.wins || 0}
          </Text>
          <Text size="xs" c="dimmed">
            Wins
          </Text>
        </Card>
        <Card withBorder radius="md" ta="center">
          <Text size="xl" fw={700}>
            {stats.winPercentage || 0}%
          </Text>
          <Text size="xs" c="dimmed">
            Win Rate
          </Text>
        </Card>
        <Card withBorder radius="md" ta="center">
          <Text size="xl" fw={700}>
            {stats.currentStreak || 0}
          </Text>
          <Text size="xs" c="dimmed">
            Current Streak
          </Text>
        </Card>
        <Card withBorder radius="md" ta="center">
          <Text size="xl" fw={700}>
            {stats.maxStreak || 0}
          </Text>
          <Text size="xs" c="dimmed">
            Max Streak
          </Text>
        </Card>
      </SimpleGrid>

      {/* Per-Language Stats */}
      <Stack mt="xl" gap="xl">
        {languages.map((lang) => (
          <div key={lang}>
            <Title order={3} tt="capitalize">
              {lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : 'French'}
            </Title>
            <SimpleGrid cols={{ base: 1, md: 3 }} mt="sm">
              {difficulties.map((diff) => {
                const langStats = stats.languages[lang]?.[diff];
                if (!langStats || (langStats.boardsSolved === 0 && langStats.boardsFailed === 0)) {
                  return null;
                }

                return (
                  <Card key={diff} withBorder radius="md">
                    <Text fw={500} tt="capitalize">
                      {diff}
                    </Text>
                    <Text size="sm" c="dimmed">
                      Guess Distribution
                    </Text>
                    <GuessDistributionChart distribution={langStats.guessDistribution} />
                  </Card>
                );
              })}
            </SimpleGrid>
          </div>
        ))}
      </Stack>
    </Stack>
  );
};
