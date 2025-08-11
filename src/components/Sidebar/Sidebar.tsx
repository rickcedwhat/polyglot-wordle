import { FC } from 'react';
import { IconHome } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { ActionIcon, Stack, Text, Title, Tooltip } from '@mantine/core';

export const Sidebar: FC = () => {
  const navigate = useNavigate();
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

  return (
    <Stack align="center" gap="md" py="md">
      <Tooltip label="Home" position="right">
        <ActionIcon variant="light" size="xl" onClick={() => navigate('/')}>
          <IconHome />
        </ActionIcon>
      </Tooltip>

      <Stack gap="xs" align="center" mt="xl">
        {/* <Title order={5}>Used Letters</Title>
        {alphabet.map((letter) => (
          <Text
            key={letter}
            ff="monospace"
            fz="lg"
            c="dimmed"
            style={{ textTransform: 'uppercase' }}
          >
            {letter}
          </Text>
        ))} */}
      </Stack>
    </Stack>
  );
};
