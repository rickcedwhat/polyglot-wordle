import { FC, useMemo } from 'react';
import {
  Card,
  Center,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from '@mantine/core';
import {
  FEAT_CATEGORIES,
  FEAT_ORDER,
  FEATS,
  type FeatCategory,
  type FeatId,
} from '@/achievements/config';
import { getGameAchievements } from '@/achievements/gameAchievements';
import { useAchievements } from '@/hooks/useAchievements';
import { useAllGames } from '@/hooks/useAllGames';
import { useVocabulary } from '@/hooks/useVocabulary';
import type { AchievementProgress } from '@/utils/achievements';
import { FeatMedal, TrackBadge, trackLevelColor } from '../Badges/Badges';

export type FeatCounts = Partial<Record<FeatId, number>>;

const progressToNext = ({ current, tier, next }: AchievementProgress) => {
  if (!next) {
    return 100;
  }
  const floor = tier?.target ?? 0;
  return Math.min(100, ((current - floor) / (next.target - floor)) * 100);
};

const TrackCard: FC<{ achievement: AchievementProgress }> = ({ achievement }) => {
  const { track, current, level, next } = achievement;
  return (
    <Card withBorder radius="md" p="sm">
      <Group gap="sm" wrap="nowrap">
        <TrackBadge track={track} level={level} size={52} />
        <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={700}>
            {track.name}
          </Text>
          <Progress
            value={progressToNext(achievement)}
            size="sm"
            radius="xl"
            color={level >= 0 ? trackLevelColor(level, track.levels.length) : 'gray'}
            aria-label={`${track.name} progress`}
          />
          <Text size="xs" c="dimmed">
            {next
              ? `${current.toLocaleString()} / ${next.target.toLocaleString()} ${track.unit} to ${next.label}`
              : `${current.toLocaleString()} ${track.unit} · top level`}
          </Text>
        </Stack>
      </Group>
    </Card>
  );
};

export const TrackGrid: FC<{ achievements: AchievementProgress[] }> = ({ achievements }) => (
  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
    {achievements.map((achievement) => (
      <TrackCard key={achievement.id} achievement={achievement} />
    ))}
  </SimpleGrid>
);

export const FeatGrid: FC<{ counts: FeatCounts }> = ({ counts }) => (
  <Stack gap="lg">
    {(Object.keys(FEAT_CATEGORIES) as FeatCategory[]).map((category) => (
      <Stack key={category} gap="xs">
        <Text size="xs" fw={700} c="dimmed" tt="uppercase">
          {FEAT_CATEGORIES[category].label}
        </Text>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {FEAT_ORDER.filter((id) => FEATS[id].category === category).map((id) => {
            const count = counts[id] ?? 0;
            return (
              <Card key={id} withBorder radius="md" p="sm">
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <FeatMedal id={id} count={count} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <Group gap={6}>
                      <Text size="sm" fw={700} c={count ? undefined : 'dimmed'}>
                        {FEATS[id].name}
                      </Text>
                      {count > 0 && (
                        <Text size="xs" c="dimmed">
                          ×{count}
                        </Text>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {FEATS[id].description}
                    </Text>
                  </div>
                </Group>
              </Card>
            );
          })}
        </SimpleGrid>
      </Stack>
    ))}
  </Stack>
);

export const AchievementsTab: FC<{ profileUserId: string }> = ({ profileUserId }) => {
  const { achievements, isLoading: tracksLoading } = useAchievements(profileUserId);
  const { data: games, isLoading: gamesLoading } = useAllGames(profileUserId);
  const { vocabulary, isLoading: vocabLoading } = useVocabulary(profileUserId);

  const featCounts = useMemo(() => {
    const counts: FeatCounts = {};
    (games ?? []).forEach((game) => {
      getGameAchievements(game, vocabulary).feats.forEach(({ id }) => {
        counts[id] = (counts[id] ?? 0) + 1;
      });
    });
    return counts;
  }, [games, vocabulary]);

  if (tracksLoading || gamesLoading || vocabLoading) {
    return (
      <Center py={60}>
        <Loader size="md" />
      </Center>
    );
  }

  const featsEarned = FEAT_ORDER.filter((id) => featCounts[id]).length;

  return (
    <Tabs defaultValue="feats" variant="pills" mt="md">
      <Tabs.List mb="md">
        <Tabs.Tab value="feats">
          Feats ({featsEarned}/{FEAT_ORDER.length})
        </Tabs.Tab>
        <Tabs.Tab value="tracks">Tracks</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="feats">
        <FeatGrid counts={featCounts} />
      </Tabs.Panel>
      <Tabs.Panel value="tracks">
        <TrackGrid achievements={achievements} />
      </Tabs.Panel>
    </Tabs>
  );
};
