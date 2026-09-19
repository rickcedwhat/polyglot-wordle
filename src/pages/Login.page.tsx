import { FC, useEffect } from 'react';
import { IconBrandGoogle } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom'; // 1. Import useLocation
import { Button, Center, Container, Paper, Stack, Title } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';

export const LoginPage: FC = () => {
  const { signInWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // 2. Get the location object

  // 3. Get the "from" path out of the state (preserving query params), with a fallback to sessionStorage or '/'
  const redirectTarget = location.state?.from
    ? `${location.state.from.pathname}${location.state.from.search || ''}`
    : sessionStorage.getItem('auth_redirect_from') || '/';

  useEffect(() => {
    if (currentUser) {
      sessionStorage.removeItem('auth_redirect_from');
      // 4. Navigate to the original path instead of always to '/'
      navigate(redirectTarget, { replace: true });
    }
  }, [currentUser, navigate, redirectTarget]);

  const handleSignIn = async () => {
    if (location.state?.from) {
      const fullPath = `${location.state.from.pathname}${location.state.from.search || ''}`;
      sessionStorage.setItem('auth_redirect_from', fullPath);
    }
    await signInWithGoogle();
  };

  return (
    <Container size="xs" style={{ display: 'flex' }}>
      <Center style={{ width: '100%' }}>
        <Paper withBorder shadow="md" p={30} radius="md">
          <Stack>
            <Title order={2} ta="center">
              Welcome to Polyglot Wordle!
            </Title>
            <Button leftSection={<IconBrandGoogle />} onClick={handleSignIn} variant="outline">
              Sign in with Google
            </Button>
          </Stack>
        </Paper>
      </Center>
    </Container>
  );
};
