import type { Meta, StoryObj } from '@storybook/react';
import { Timestamp } from 'firebase/firestore';
import { Container, Stack, Text, Title } from '@mantine/core';
import { MockAuth } from '@/storybook/MockAuth';
import { SharedInviteCard } from './SharedInviteCard';

const meta: Meta<typeof SharedInviteCard> = {
  title: 'Challenges/Shared invitation',
  component: SharedInviteCard,
  args: {
    invite: {
      gameId: '0cfdd38f955e449a9d355eefaaa4014v',
      languages: ['en', 'es', 'pt'],
      createdAt: Timestamp.fromMillis(1792200000000),
    },
    onRemove: async () => {},
  },
  decorators: [
    (Story) => (
      <MockAuth>
        <Container size="sm" py="lg">
          <Stack gap="lg">
            <Title order={2}>Challenges</Title>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              Waiting
            </Text>
            <Story />
          </Stack>
        </Container>
      </MockAuth>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof SharedInviteCard>;
export const WaitingForPlayers: Story = {};
