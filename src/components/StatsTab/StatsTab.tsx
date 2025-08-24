import { FC, useEffect, useState } from 'react';
import {
  Card,
  Center,
  Grid,
  Loader,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { Difficulty, Language } from '@/types/firestore';
import { GuessDistributionChart } from '../GuessDistributionChart/GuessDistributionChart';

interface StatsTabProps {
  profileUserId: string;
}

const difficultyOrder: Difficulty[] = ['advanced', 'intermediate', 'basic'];

const StatCard: FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <Card withBorder radius="md" ta="center">
    <Text size="xl" fw={700}>
      {value}
    </Text>
    <Text size="xs" c="dimmed">
      {label}
    </Text>
  </Card>
);

export const StatsTab: FC<StatsTabProps> = ({ profileUserId }) => {
  const { currentUser } = useAuth();
  const { data: userProfile, isLoading: isLoadingProfile } = useUserProfile(profileUserId);
  const { data: currentUserProfile, isLoading: isLoadingCurrentUser } = useUserProfile(
    currentUser?.uid ?? ''
  );

  const [selectedDifficulties, setSelectedDifficulties] = useState<
    Record<Language, Difficulty | null>
  >({
    en: null,
    es: null,
    fr: null,
  });

  const [defaultsAreSet, setDefaultsAreSet] = useState(false);

  useEffect(() => {
    if (userProfile?.stats && !defaultsAreSet) {
      const defaults: Record<Language, Difficulty | null> = { en: null, es: null, fr: null };
      const languages: Language[] = ['en', 'es', 'fr'];
      languages.forEach((lang) => {
        const defaultDifficulty = difficultyOrder.find(
          (diff) =>
            (userProfile.stats?.languages[lang]?.[diff]?.boardsSolved ?? 0) +
              (userProfile.stats?.languages[lang]?.[diff]?.boardsFailed ?? 0) >
            0
        );
        if (defaultDifficulty) {
          defaults[lang] = defaultDifficulty;
        }
      });
      setSelectedDifficulties(defaults);
      setDefaultsAreSet(true);
    }
  }, [userProfile?.stats, defaultsAreSet]);

  const isLoading = isLoadingProfile || isLoadingCurrentUser;

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

  const { stats: profileStats } = userProfile;
  const languages: Language[] = ['en', 'es', 'fr'];
  const isOwnProfile = currentUser?.uid === profileUserId;
  const profileDisplayName = userProfile.displayName || 'Profile';

  return (
    <Stack mt="md">
      <Title order={3}>Overall Performance</Title>
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }}>
        <StatCard
          label="Wins - Losses"
          value={`${profileStats.wins || 0} - ${
            profileStats.gamesPlayed - (profileStats.wins ?? 0) || 0
          }`}
        />
        <StatCard label="Win Rate" value={`${profileStats.winPercentage.toFixed(1) || 0}%`} />
        <StatCard label="Current Streak" value={profileStats.currentStreak || 0} />
        <StatCard label="Max Streak" value={profileStats.maxStreak || 0} />
        <StatCard label="Best Score" value={profileStats.highScore || 0} />
      </SimpleGrid>

      <Stack mt="xl" gap="xl">
        {languages.map((lang) => {
          const profileLangData = profileStats.languages[lang];
          const hasData =
            profileLangData &&
            difficultyOrder.some(
              (diff) =>
                (profileLangData[diff]?.boardsSolved ?? 0) +
                  (profileLangData[diff]?.boardsFailed ?? 0) >
                0
            );

          if (!hasData) {
            return null;
          }

          const availableDifficulties = difficultyOrder
            .filter(
              (diff) =>
                (profileLangData?.[diff]?.boardsSolved ?? 0) +
                  (profileLangData?.[diff]?.boardsFailed ?? 0) >
                0
            )
            .reverse();

          const selectedDifficulty = selectedDifficulties[lang];
          if (!selectedDifficulty) {
            return <Loader key={lang} size="xs" />;
          }

          const langStats = profileLangData[selectedDifficulty];
          const currentUserLangStats =
            currentUserProfile?.stats?.languages[lang]?.[selectedDifficulty];

          const solves = langStats.boardsSolved;
          const fails = langStats.boardsFailed;
          const totalBoards = solves + fails;
          const percentage = totalBoards > 0 ? (solves / totalBoards) * 100 : 0;
          const sfRatio = percentage.toFixed(1);

          return (
            <div key={lang}>
              <Title order={3} tt="capitalize">
                {lang === 'en' ? 'English' : lang === 'es' ? 'Spanish' : 'French'}
              </Title>

              {availableDifficulties.length > 1 && (
                <SegmentedControl
                  mt="sm"
                  mb="md"
                  value={selectedDifficulty}
                  onChange={(value) =>
                    setSelectedDifficulties((prev) => ({ ...prev, [lang]: value as Difficulty }))
                  }
                  data={availableDifficulties}
                  tt="capitalize"
                />
              )}

              <Grid gutter="xl">
                <Grid.Col span={{ base: 12, md: 7 }}>
                  <Card withBorder radius="md" p={{ base: 'xs', sm: 'md' }}>
                    <GuessDistributionChart
                      profileName={profileDisplayName}
                      profileDistribution={langStats.guessDistribution}
                      currentUserDistribution={
                        !isOwnProfile ? currentUserLangStats?.guessDistribution : undefined
                      }
                    />
                  </Card>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 5 }}>
                  <Stack>
                    <Title order={4} tt="capitalize">
                      {selectedDifficulty} Stats
                    </Title>
                    <SimpleGrid cols={3}>
                      <StatCard label="Solve - Fails" value={`${solves} - ${fails}`} />
                      <StatCard label="Solve Rate" value={`${sfRatio}%`} />
                      <StatCard label="Avg. Guesses" value={langStats.averageGuesses.toFixed(2)} />
                    </SimpleGrid>
                  </Stack>
                </Grid.Col>
              </Grid>
            </div>
          );
        })}
      </Stack>
    </Stack>
  );
};
