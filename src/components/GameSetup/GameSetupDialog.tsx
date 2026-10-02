import { FC, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, getFirestore, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useGameActions } from '@/hooks/useGameActions';
import { useUserProfile } from '@/hooks/useUserProfile';
import { GameSetupModal } from './GameSetupModal';
import type { GameSetupValue } from './GameSetupPanel';

interface GameSetupDialogProps {
  opened: boolean;
  onClose: () => void;
  /** 'newGame' saves the setup and starts a game; 'settings' only saves. */
  mode: 'newGame' | 'settings';
}

const useSaveGameSetup = () => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ languages, difficulties, skipPicker }: GameSetupValue) => {
      if (!currentUser) {
        throw new Error('User not logged in');
      }
      await updateDoc(doc(getFirestore(), 'users', currentUser.uid), {
        languagePrefs: { languages, skipPicker },
        difficultyPrefs: difficulties,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userProfile', currentUser?.uid] }),
  });
};

export const GameSetupDialog: FC<GameSetupDialogProps> = ({ opened, onClose, mode }) => {
  const { currentUser } = useAuth();
  const { data: profile } = useUserProfile(currentUser?.uid);
  const { createNewGame } = useGameActions();
  const save = useSaveGameSetup();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (opened) {
      setError(null);
    }
  }, [opened]);

  const handleSubmit = async (value: GameSetupValue) => {
    setError(null);
    try {
      await save.mutateAsync(value);
    } catch {
      if (mode === 'settings') {
        setError('Could not save your game setup. Please try again.');
        return;
      }
    }
    onClose();
    if (mode === 'newGame') {
      await createNewGame({ languages: value.languages, difficulties: value.difficulties });
    }
  };

  return (
    <GameSetupModal
      opened={opened}
      onClose={onClose}
      mode={mode}
      resetKey={profile ? 'loaded' : 'loading'}
      initialLanguages={profile?.languagePrefs?.languages}
      initialDifficulties={profile?.difficultyPrefs}
      initialSkipPicker={profile?.languagePrefs?.skipPicker ?? false}
      loading={save.isPending}
      error={error}
      onSubmit={handleSubmit}
    />
  );
};
