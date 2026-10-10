import { FC, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { formatDecimal, formatPercent } from '@/i18n/format';
import type { Difficulty, Language } from '@/types/firestore';
import { labelFor } from '@/utils/languages';
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
  const { t } = useTranslation();
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
    it: null,
    pt: null,
  });

  const [defaultsAreSet, setDefaultsAreSet] = useState(false);

  useEffect(() => {
    if (userProfile?.stats && !defaultsAreSet) {
      const defaults: Record<Language, Difficulty | null> = {
        en: null,
        es: null,
        fr: null,
        it: null,
        pt: null,
      };
      const languages: Language[] = ['en', 'es', 'fr', 'it', 'pt'];
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
        {t('stats.none')}
      </Text>
    );
  }

  const { stats: profileStats } = userProfile;
  const languages: Language[] = ['en', 'es', 'fr', 'it', 'pt'];
  const isOwnProfile = currentUser?.uid === profileUserId;
  const profileDisplayName = userProfile.displayName || t('postGame.player');

  return (
    <Stack mt="md">
      <Title order={3}>{t('stats.overall')}</Title>
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }}>
        <StatCard
          label={t('stats.winsLosses')}
          value={`${profileStats.wins || 0} - ${
            profileStats.gamesPlayed - (profileStats.wins ?? 0) || 0
          }`}
        />
        <StatCard
          label={t('stats.winRate')}
          value={formatPercent(profileStats.winPercentage || 0)}
        />
        <StatCard label={t('stats.currentStreak')} value={profileStats.currentStreak || 0} />
        <StatCard label={t('stats.maxStreak')} value={profileStats.maxStreak || 0} />
        <StatCard label={t('stats.bestScore')} value={profileStats.highScore || 0} />
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

          return (
            <div key={lang}>
              <Title order={3} tt="capitalize">
                {labelFor(lang)}
              </Title>

              {availableDifficulties.length > 1 && (
                <SegmentedControl
                  mt="sm"
                  mb="md"
                  value={selectedDifficulty}
                  onChange={(value) =>
                    setSelectedDifficulties((prev) => ({ ...prev, [lang]: value as Difficulty }))
                  }
                  data={availableDifficulties.map((value) => ({
                    value,
                    label: t(`setup.difficulties.${value}`),
                  }))}
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
                    <Title order={4}>
                      {t('stats.difficultyStats', {
                        difficulty: t(`setup.difficulties.${selectedDifficulty}`),
                      })}
                    </Title>
                    <SimpleGrid cols={3}>
                      <StatCard label={t('stats.solvesFails')} value={`${solves} - ${fails}`} />
                      <StatCard label={t('stats.solveRate')} value={formatPercent(percentage)} />
                      <StatCard
                        label={t('stats.avgGuesses')}
                        value={formatDecimal(langStats.averageGuesses, 2)}
                      />
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
