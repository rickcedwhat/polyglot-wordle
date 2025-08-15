import { FC, useEffect } from 'react';
import { IconBrandGoogle } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Button, Center, Container, Paper, Stack, Title } from '@mantine/core';
import { useAuth } from '@/context/AuthContext'; // Use useAuth

export const LoginPage: FC = () => {
  const { signInWithGoogle, currentUser } = useAuth(); // Get state from useAuth
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  // No loading check needed here because AuthProvider handles it
  return (
    <Container size="xs" style={{ height: '100vh', display: 'flex' }}>
      <Center style={{ width: '100%' }}>
        <Paper withBorder shadow="md" p={30} radius="md">
          <Stack>
            <Title order={2} ta="center">
              Welcome to Polyglot Wordle!
            </Title>
            <Button leftSection={<IconBrandGoogle />} onClick={signInWithGoogle} variant="outline">
              Sign in with Google
            </Button>
          </Stack>
        </Paper>
      </Center>
    </Container>
  );
};
