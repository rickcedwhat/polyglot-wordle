import { FC } from 'react';
import { Badge, Group, Paper, Text, Title } from '@mantine/core';
import type { UserDoc } from '@/types/firestore';

interface DifficultyDisplayProps {
  preferences: UserDoc['difficultyPrefs'];
}

const difficultyColors: Record<string, string> = {
  basic: 'teal',
  intermediate: 'yellow',
  advanced: 'red',
};

export const DifficultyDisplay: FC<DifficultyDisplayProps> = ({ preferences }) => {
  return (
    <Paper withBorder p="md" radius="md" mt="xl">
      <Title order={5} mb="xs">
        Default Difficulties
      </Title>
      <Group>
        <Text>EN:</Text>
        <Badge color={difficultyColors[preferences.en]} variant="light">
          {preferences.en}
        </Badge>
        <Text>ES:</Text>
        <Badge color={difficultyColors[preferences.es]} variant="light">
          {preferences.es}
        </Badge>
        <Text>FR:</Text>
        <Badge color={difficultyColors[preferences.fr]} variant="light">
          {preferences.fr}
        </Badge>
      </Group>
    </Paper>
  );
};
