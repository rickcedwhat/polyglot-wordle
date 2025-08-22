import { FC, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import { Button, Center, Loader, Modal, SegmentedControl, Stack, Text } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import type { UserDoc } from '@/types/firestore.d.ts';

type Difficulty = 'basic' | 'intermediate' | 'advanced';
type Preferences = UserDoc['difficultyPrefs'];

interface DifficultyModalProps {
  opened: boolean;
  onClose: () => void;
}

// Helper hook to manage fetching and updating preferences
const useDifficultyPrefs = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['userProfile', currentUser?.uid];

  const userProfileQuery = useQuery({
    queryKey,
    queryFn: async () => {
      if (!currentUser?.uid) {
        throw new Error('User not logged in');
      }
      const db = getFirestore();
      const userDocRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      return docSnap.data() as UserDoc;
    },
    enabled: !!currentUser,
  });

  const updatePrefsMutation = useMutation({
    mutationFn: async (newPrefs: Preferences) => {
      if (!currentUser?.uid) {
        throw new Error('User not logged in');
      }
      const db = getFirestore();
      const userDocRef = doc(db, 'users', currentUser.uid);
      return updateDoc(userDocRef, { difficultyPrefs: newPrefs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return { userProfileQuery, updatePrefsMutation };
};

export const DifficultyModal: FC<DifficultyModalProps> = ({ opened, onClose }) => {
  const { userProfileQuery, updatePrefsMutation } = useDifficultyPrefs();
  const [prefs, setPrefs] = useState<Preferences | null>(null);

  useEffect(() => {
    if (userProfileQuery.data) {
      // If fetched prefs are null, initialize with a default object.
      // Otherwise, use the fetched data.
      setPrefs(
        userProfileQuery.data.difficultyPrefs || {
          en: 'basic',
          es: 'basic',
          fr: 'basic',
        }
      );
    }
  }, [userProfileQuery.data]);

  const handleSave = () => {
    if (prefs) {
      updatePrefsMutation.mutate(prefs, {
        onSuccess: () => {
          onClose(); // Close the modal
        },
      });
    }
  };

  const createHandler = (lang: 'en' | 'es' | 'fr') => (value: string) => {
    setPrefs((prev) => ({ ...prev!, [lang]: value as Difficulty }));
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Set Game Difficulty" centered>
      {userProfileQuery.isLoading || !prefs ? (
        <Center>
          <Loader />
        </Center>
      ) : (
        <Stack>
          <Text fw={500}>English</Text>
          <SegmentedControl
            data={['basic', 'intermediate', 'advanced']}
            value={prefs.en}
            onChange={createHandler('en')}
            fullWidth
          />
          <Text fw={500}>Spanish</Text>
          <SegmentedControl
            data={['basic', 'intermediate', 'advanced']}
            value={prefs.es}
            onChange={createHandler('es')}
            fullWidth
          />
          <Text fw={500}>French</Text>
          <SegmentedControl
            data={['basic', 'intermediate', 'advanced']}
            value={prefs.fr}
            onChange={createHandler('fr')}
            fullWidth
          />
          <Button onClick={handleSave} loading={updatePrefsMutation.isPending} mt="md">
            Save Preferences
          </Button>
        </Stack>
      )}
    </Modal>
  );
};
