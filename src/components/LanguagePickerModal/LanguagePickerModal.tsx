import { FC, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, getFirestore, updateDoc } from 'firebase/firestore';
import {
  Button,
  Center,
  Checkbox,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { useAuth } from '@/context/AuthContext';
import type { Language, LanguageCombo, LanguagePrefs, UserDoc } from '@/types/firestore.d.ts';
import {
  ALL_LANGUAGES,
  BOARD_COUNT,
  DEFAULT_LANGUAGES,
  flagFor,
  isNewGameCombo,
  labelFor,
} from '@/utils/languages';

interface LanguagePickerModalProps {
  opened: boolean;
  onClose: () => void;
  /** When true, confirming starts a new game with the selected languages. */
  startGameOnConfirm?: boolean;
  onConfirm?: (languages: LanguageCombo, skipPicker: boolean) => void;
  /** When false, confirming only reports the choice (no saved prefs, no "don't ask again"). */
  saveToPrefs?: boolean;
  title?: string;
  confirmLabel?: string;
  loading?: boolean;
  error?: string | null;
}

const useLanguagePrefs = () => {
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
    mutationFn: async (newPrefs: LanguagePrefs) => {
      if (!currentUser?.uid) {
        throw new Error('User not logged in');
      }
      const db = getFirestore();
      const userDocRef = doc(db, 'users', currentUser.uid);
      return updateDoc(userDocRef, { languagePrefs: newPrefs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return { userProfileQuery, updatePrefsMutation };
};

export const LanguagePickerModal: FC<LanguagePickerModalProps> = ({
  opened,
  onClose,
  startGameOnConfirm = true,
  onConfirm,
  saveToPrefs = true,
  title = 'Choose languages',
  confirmLabel,
  loading = false,
  error,
}) => {
  const { userProfileQuery, updatePrefsMutation } = useLanguagePrefs();
  const [selected, setSelected] = useState<Language[]>([...DEFAULT_LANGUAGES]);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  useEffect(() => {
    if (!userProfileQuery.data) {
      return;
    }
    const prefs = userProfileQuery.data.languagePrefs;
    if (prefs && isNewGameCombo(prefs.languages)) {
      setSelected([...prefs.languages]);
      setDontAskAgain(Boolean(prefs.skipPicker));
    } else {
      setSelected([...DEFAULT_LANGUAGES]);
      setDontAskAgain(false);
    }
  }, [userProfileQuery.data, opened]);

  const toggle = (lang: Language) => {
    setSelected((prev) => {
      if (prev.includes(lang)) {
        return prev.filter((l) => l !== lang);
      }
      if (prev.length >= BOARD_COUNT) {
        return prev;
      }
      return [...prev, lang];
    });
  };

  const canConfirm = isNewGameCombo(selected);

  const handleConfirm = () => {
    if (!isNewGameCombo(selected)) {
      return;
    }
    if (!saveToPrefs) {
      onConfirm?.(selected, false);
      return;
    }
    const prefs: LanguagePrefs = { languages: selected, skipPicker: dontAskAgain };

    updatePrefsMutation.mutate(prefs, {
      onSuccess: () => {
        onConfirm?.(selected, dontAskAgain);
        onClose();
      },
      onError: () => {
        if (startGameOnConfirm) {
          onConfirm?.(selected, dontAskAgain);
          onClose();
        }
      },
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} centered>
      {userProfileQuery.isLoading ? (
        <Center>
          <Loader />
        </Center>
      ) : (
        <Stack>
          <Text size="sm" c="dimmed">
            Pick three languages, one per board.
          </Text>

          <Group gap="xs">
            {ALL_LANGUAGES.map((lang) => {
              const isOn = selected.includes(lang);
              const disabled = !isOn && selected.length >= BOARD_COUNT;
              return (
                <UnstyledButton
                  key={lang}
                  onClick={() => toggle(lang)}
                  disabled={disabled}
                  style={{
                    opacity: disabled ? 0.4 : 1,
                    border: `2px solid ${isOn ? 'var(--mantine-color-blue-5)' : 'var(--mantine-color-dark-4)'}`,
                    borderRadius: 8,
                    padding: '8px 12px',
                    background: isOn ? 'var(--mantine-color-blue-9)' : 'transparent',
                  }}
                >
                  <Text size="sm" fw={600}>
                    {flagFor(lang)} {labelFor(lang)}
                  </Text>
                </UnstyledButton>
              );
            })}
          </Group>

          <Text size="xs" c={canConfirm ? 'dimmed' : 'orange'}>
            {selected.length} of {BOARD_COUNT} selected
          </Text>

          {saveToPrefs && (
            <Checkbox
              label="Don't ask again — use this combo for New Game"
              checked={dontAskAgain}
              onChange={(e) => setDontAskAgain(e.currentTarget.checked)}
            />
          )}

          {error && (
            <Text size="sm" c="red" role="alert">
              {error}
            </Text>
          )}

          {saveToPrefs && updatePrefsMutation.isError && (
            <Text size="sm" c="red" role="alert">
              Could not save language preferences. Please try again.
            </Text>
          )}

          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            loading={loading || updatePrefsMutation.isPending}
            mt="sm"
          >
            {confirmLabel ?? (startGameOnConfirm ? 'Start Game' : 'Save Languages')}
          </Button>
        </Stack>
      )}
    </Modal>
  );
};
