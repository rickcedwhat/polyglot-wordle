import { FC, useEffect } from 'react';
import { IconBrandGoogle } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom'; // 1. Import useLocation
import { Button, Center, Container, Paper, Stack, Title } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';

export const LoginPage: FC = () => {
  const { signInWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // 2. Get the location object

  // 3. Get the "from" path out of the state, with a fallback to the home page
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (currentUser) {
      // 4. Navigate to the original path instead of always to '/'
      navigate(from, { replace: true });
    }
  }, [currentUser, navigate, from]);

  return (
    <Container size="xs" style={{ display: 'flex' }}>
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
