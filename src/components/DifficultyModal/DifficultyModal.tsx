import { FC, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import { Button, Center, Loader, Modal, SegmentedControl, Stack, Text } from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import type { Difficulty, Language, UserDoc } from '@/types/firestore.d.ts';
import { ALL_LANGUAGES, labelFor } from '@/utils/languages';

type Preferences = UserDoc['difficultyPrefs'];

interface DifficultyModalProps {
  opened: boolean;
  onClose: () => void;
}

const DEFAULT_PREFS: NonNullable<Preferences> = {
  en: 'basic',
  es: 'basic',
  fr: 'basic',
  it: 'basic',
  pt: 'basic',
};

const mergePrefs = (prefs: Preferences | null | undefined): NonNullable<Preferences> => ({
  ...DEFAULT_PREFS,
  ...(prefs ?? {}),
});

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
  const [prefs, setPrefs] = useState<NonNullable<Preferences> | null>(null);

  useEffect(() => {
    if (userProfileQuery.data) {
      setPrefs(mergePrefs(userProfileQuery.data.difficultyPrefs));
    }
  }, [userProfileQuery.data]);

  const handleSave = () => {
    if (prefs) {
      updatePrefsMutation.mutate(prefs, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  const createHandler = (lang: Language) => (value: string) => {
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
          {ALL_LANGUAGES.map((lang) => (
            <Stack key={lang} gap={6}>
              <Text fw={500}>{labelFor(lang)}</Text>
              <SegmentedControl
                data={['basic', 'intermediate', 'advanced']}
                value={prefs[lang]}
                onChange={createHandler(lang)}
                fullWidth
              />
            </Stack>
          ))}
          <Button onClick={handleSave} loading={updatePrefsMutation.isPending} mt="md">
            Save Preferences
          </Button>
        </Stack>
      )}
    </Modal>
  );
};
