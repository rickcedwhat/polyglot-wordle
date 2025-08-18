import { FC, useEffect, useState } from 'react';
import { IconBrandGoogle } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Center, Container, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import { useChallenges } from '@/hooks/useChallenges';
import type { InviteDoc } from '@/types/firestore.d.ts';

const fetchInvite = async (inviteId: string) => {
  const db = getFirestore();
  const inviteRef = doc(db, 'invites', inviteId);
  const docSnap = await getDoc(inviteRef);
  if (!docSnap.exists() || docSnap.data().status !== 'pending') {
    throw new Error('This invite is invalid or has already been claimed.');
  }
  return { id: docSnap.id, ...docSnap.data() } as InviteDoc & { id: string };
};

export const InvitePage: FC = () => {
  const { inviteId } = useParams<{ inviteId: string }>();
  const { currentUser, loading: authLoading } = useAuth();
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { acceptInvite, isPending: isAccepting } = useChallenges();
  const [error, setError] = useState<string | null>(null);

  const { data: invite, isLoading: isInviteLoading } = useQuery({
    queryKey: ['invite', inviteId],
    queryFn: () => fetchInvite(inviteId!),
    enabled: !!inviteId,
    retry: false, // Don't retry if the invite is invalid
  });

  useEffect(() => {
    // This effect runs after a user logs in and we have the invite data
    if (currentUser && invite && !isAccepting) {
      if (currentUser.uid === invite.challengerId) {
        setError('You cannot accept your own challenge. Please log in with a different account.');
        return;
      }

      acceptInvite(invite)
        .then(() => {
          // Success! Navigate to the game
          navigate(`/game/${invite.gameId}`);
        })
        .catch((err) => {
          console.error('Failed to accept invite:', err);
          setError('There was a problem accepting the challenge. Please try again.');
        });
    }
  }, [currentUser, invite, acceptInvite, navigate, isAccepting]);

  if (isInviteLoading || authLoading || isAccepting) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  const errorMessage = error || (isInviteLoading ? null : 'Invite not found.');

  if (!invite || error) {
    return (
      <Center h="100vh">
        <Text c="red">{errorMessage}</Text>
      </Center>
    );
  }

  // If we have the invite but no user, show the login prompt
  if (!currentUser) {
    return (
      <Container size="xs" style={{ height: '100vh', display: 'flex' }}>
        <Center style={{ width: '100%' }}>
          <Paper withBorder shadow="md" p={30} radius="md">
            <Stack align="center">
              <Title order={3} ta="center">
                {invite.challengerName} has challenged you!
              </Title>
              <Text c="dimmed" ta="center">
                Sign in with Google to accept the challenge and play.
              </Text>
              <Button
                leftSection={<IconBrandGoogle />}
                onClick={signInWithGoogle}
                variant="outline"
                mt="md"
              >
                Sign in to Accept
              </Button>
            </Stack>
          </Paper>
        </Center>
      </Container>
    );
  }

  // This state is temporary while the useEffect is processing
  return (
    <Center h="100vh">
      <Loader />
    </Center>
  );
};
