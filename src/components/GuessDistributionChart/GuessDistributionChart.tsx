import { FC, useState } from 'react';
import { Bar, BarChart, Legend, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { Box, Group, Text, UnstyledButton } from '@mantine/core';

interface CustomBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: any;
  profileName: string;
  focusedUser: 'profile' | 'currentUser';
}

const CustomBar: FC<CustomBarProps> = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  profileName,
  focusedUser,
}) => {
  if (!payload) {
    return null;
  }
  const profileValue = payload[profileName] || 0;
  const youValue = payload.You || 0;
  const maxValue = Math.max(profileValue, youValue);
  if (maxValue === 0) {
    return null;
  }

  const profileHeight = (profileValue / maxValue) * height;
  const youHeight = (youValue / maxValue) * height;
  const profileY = y + (height - profileHeight);
  const youY = y + (height - youHeight);

  const profileOpacity = focusedUser === 'profile' ? 1 : 0.35;
  const youOpacity = focusedUser === 'currentUser' ? 1 : 0.35;

  const profileBar = (
    <rect
      key="profile"
      x={x}
      y={profileY}
      width={width}
      height={profileHeight}
      fill="url(#gradient-profile)"
      opacity={profileOpacity}
      style={{ transition: 'opacity 0.2s ease-in-out' }}
    />
  );

  const youBar =
    youValue > 0 ? (
      <rect
        key="you"
        x={x}
        y={youY}
        width={width}
        height={youHeight}
        fill="url(#gradient-you)"
        opacity={youOpacity}
        style={{ transition: 'opacity 0.2s ease-in-out' }}
      />
    ) : null;

  return (
    <g>
      {focusedUser === 'profile' ? (
        <>
          {youBar}
          {profileBar}
        </>
      ) : (
        <>
          {profileBar}
          {youBar}
        </>
      )}
    </g>
  );
};

interface GuessDistributionChartProps {
  profileName: string;
  profileDistribution: number[];
  currentUserDistribution?: number[];
}

export const GuessDistributionChart: FC<GuessDistributionChartProps> = ({
  profileName,
  profileDistribution,
  currentUserDistribution,
}) => {
  const [focusedUser, setFocusedUser] = useState<'profile' | 'currentUser'>('profile');

  const profileTotal = profileDistribution.reduce((sum, count) => sum + count, 0);
  const currentUserTotal = currentUserDistribution
    ? currentUserDistribution.reduce((sum, count) => sum + count, 0)
    : 0;

  const chartData = profileDistribution.map((count, index) => {
    const profilePercentage = profileTotal > 0 ? (count / profileTotal) * 100 : 0;
    const currentUserValue = currentUserDistribution ? currentUserDistribution[index] : 0;
    const currentUserPercentage =
      currentUserTotal > 0 ? (currentUserValue / currentUserTotal) * 100 : 0;
    return {
      name: index < 8 ? `${index + 1}` : 'Lost',
      [profileName]: profilePercentage,
      You: currentUserPercentage,
      maxHeight: Math.max(profilePercentage, currentUserPercentage),
    };
  });

  const renderCustomLegend = () => (
    <Group justify="center" gap="md" mt="xs">
      <UnstyledButton onClick={() => setFocusedUser('profile')}>
        <Group
          gap="xs"
          align="center"
          wrap="nowrap"
          style={{ opacity: focusedUser === 'profile' ? 1 : 0.5, transition: 'opacity 0.2s ease' }}
        >
          <Box w={12} h={12} bg="var(--mantine-color-red-6)" />
          <Text size="sm" c="dimmed">
            {profileName}
          </Text>
        </Group>
      </UnstyledButton>
      {currentUserDistribution && (
        <UnstyledButton onClick={() => setFocusedUser('currentUser')}>
          <Group
            gap="xs"
            align="center"
            wrap="nowrap"
            style={{
              opacity: focusedUser === 'currentUser' ? 1 : 0.5,
              transition: 'opacity 0.2s ease',
            }}
          >
            <Box w={12} h={12} bg="var(--mantine-color-blue-6)" />
            <Text size="sm" c="dimmed">
              You
            </Text>
          </Group>
        </UnstyledButton>
      )}
    </Group>
  );

  const yAxisFormatter = (value: number) => `${value}%`;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart
        data={chartData}
        // CORRECTED: Changed left margin from -20 to 0 to prevent clipping
        margin={{ top: 15, right: 10, left: 0, bottom: 5 }}
        barCategoryGap={0}
      >
        <defs>
          <linearGradient id="gradient-profile" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--mantine-color-red-7)" stopOpacity={0.8} />
            <stop offset="100%" stopColor="var(--mantine-color-red-4)" stopOpacity={0.5} />
          </linearGradient>
          <linearGradient id="gradient-you" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--mantine-color-blue-7)" stopOpacity={0.8} />
            <stop offset="100%" stopColor="var(--mantine-color-blue-4)" stopOpacity={0.5} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" />
        <YAxis allowDecimals={false} tickFormatter={yAxisFormatter} domain={[0, 'dataMax + 10']} />
        <Legend content={renderCustomLegend} />
        <Bar
          dataKey="maxHeight"
          shape={<CustomBar profileName={profileName} focusedUser={focusedUser} />}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};
