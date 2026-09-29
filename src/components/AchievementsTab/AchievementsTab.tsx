import { FC } from 'react';
import {
  Badge,
  Card,
  Center,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Text,
} from '@mantine/core';
import { useAchievements } from '@/hooks/useAchievements';
import type { AchievementProgress } from '@/utils/achievements';

const progressToNext = ({ current, tier, next }: AchievementProgress) => {
  if (!next) {
    return 100;
  }
  const floor = tier?.target ?? 0;
  return Math.min(100, ((current - floor) / (next.target - floor)) * 100);
};

export const AchievementCard: FC<{ achievement: AchievementProgress }> = ({ achievement }) => {
  const { title, icon, unit, description, current, tier, next } = achievement;
  return (
    <Card p="md" radius="md" withBorder style={{ opacity: tier ? 1 : 0.7 }}>
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Text size="xl" aria-hidden>
              {icon}
            </Text>
            <Text fw={700} size="sm">
              {title}
            </Text>
          </Group>
          {tier ? (
            <Badge color="teal" variant="filled" style={{ flexShrink: 0 }}>
              {tier.label}
            </Badge>
          ) : (
            <Badge color="gray" variant="light" style={{ flexShrink: 0 }}>
              Not yet
            </Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {description}
        </Text>
        <Progress
          value={progressToNext(achievement)}
          color={next ? 'teal' : 'yellow'}
          size="sm"
          radius="xl"
          aria-label={`${title} progress`}
        />
        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {current.toLocaleString()} {unit}
          </Text>
          <Text size="xs" c="dimmed">
            {next ? `${next.label} at ${next.target.toLocaleString()}` : 'Top tier'}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
};

export const AchievementsTab: FC<{ profileUserId: string }> = ({ profileUserId }) => {
  const { achievements, isLoading } = useAchievements(profileUserId);

  if (isLoading) {
    return (
      <Center py={60}>
        <Loader size="md" />
      </Center>
    );
  }

  return <AchievementGrid achievements={achievements} />;
};

export const AchievementGrid: FC<{ achievements: AchievementProgress[] }> = ({ achievements }) => {
  const earned = achievements.filter((a) => a.tier).length;

  return (
    <Stack gap="md" mt="md">
      <Text size="sm" c="dimmed">
        {earned} of {achievements.length} achievements earned. Certification levels follow the CEFR
        scale (A1 to C2), based on distinct words guessed in each language.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
        {achievements.map((achievement) => (
          <AchievementCard key={achievement.id} achievement={achievement} />
        ))}
      </SimpleGrid>
    </Stack>
  );
};
