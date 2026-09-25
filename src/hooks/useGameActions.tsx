import { useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, getFirestore, limit, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/context/AuthContext';
import type { Difficulty, Language } from '@/types/firestore';
import {
  buildGameId,
  DEFAULT_LANGUAGES,
  gamePath,
  isLanguageTriple,
  sortLanguages,
} from '@/utils/languages';
import { useUserProfile } from './useUserProfile';

const DEFAULT_DIFFICULTY: Difficulty = 'basic';

export type CreateNewGameOptions = {
  /** Override language triple for this game (skipPicker still respected separately). */
  languages?: [Language, Language, Language];
};

export const useGameActions = () => {
  const { currentUser } = useAuth();
  const { data: userProfile } = useUserProfile(currentUser?.uid);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const preferencesNotSet = !userProfile?.difficultyPrefs;
  const languagePrefs = userProfile?.languagePrefs ?? null;
  const shouldAskLanguages = !languagePrefs?.skipPicker;

  const resolveLanguages = (
    override?: [Language, Language, Language]
  ): [Language, Language, Language] => {
    if (override && isLanguageTriple(override)) {
      return override;
    }
    if (languagePrefs && isLanguageTriple(languagePrefs.languages)) {
      return languagePrefs.languages;
    }
    return [...DEFAULT_LANGUAGES];
  };

  const createNewGame = async (options?: CreateNewGameOptions) => {
    if (!currentUser) {
      console.error('Cannot create a new game without a logged-in user.');
      return false;
    }

    try {
      const db = getFirestore();
      const prefs = userProfile?.difficultyPrefs;

      if (!prefs) {
        console.error('User difficulty preferences not found.');
        return false;
      }

      const languages = resolveLanguages(options?.languages);
      const difficulties = languages.map((lang) => prefs[lang] ?? DEFAULT_DIFFICULTY) as [
        Difficulty,
        Difficulty,
        Difficulty,
      ];

      // Reuse an empty live game that matches difficulties + language set
      const gamesCollectionRef = collection(db, 'games');
      let reusableGameId: string | undefined;
      try {
        const q = query(
          gamesCollectionRef,
          where('userId', '==', currentUser.uid),
          where('isLiveGame', '==', true),
          where('guessHistory', '==', []),
          where(`difficulties.${languages[0]}`, '==', difficulties[0]),
          where(`difficulties.${languages[1]}`, '==', difficulties[1]),
          where(`difficulties.${languages[2]}`, '==', difficulties[2]),
          limit(5)
        );
        const existingGameSnapshot = await getDocs(q);
        const sortedWanted = sortLanguages(languages).join(',');
        const reusable = existingGameSnapshot.docs.find((docSnap) => {
          const data = docSnap.data();
          const boardLangs = (data.shuffledLanguages as Language[] | undefined) ?? [];
          if (boardLangs.length !== 3) {
            return false;
          }
          return sortLanguages(boardLangs).join(',') === sortedWanted;
        });
        reusableGameId = reusable?.data()?.gameId as string | undefined;
      } catch (reuseError) {
        // Missing composite indexes for new language combos — just create a fresh id.
        console.warn('Empty-game reuse query failed, creating a new game id:', reuseError);
      }

      let gameId = '';

      if (reusableGameId) {
        console.log('Found existing empty game with matching difficulties, reusing it.');
        gameId = reusableGameId;
      } else {
        const fullUUID = uuidv4().replace(/-/g, '');
        const entropy24 = fullUUID.substring(0, 24);
        const seedNibble = fullUUID[24] ?? '0';
        gameId = buildGameId({
          entropy24,
          languages,
          difficulties,
          seedNibble,
        });

        await queryClient.invalidateQueries({ queryKey: ['gameHistory'] });
      }
      navigate(gamePath(gameId, languages));
      return true;
    } catch (error) {
      console.error('Failed to create new game:', error);
      return false;
    }
  };

  return {
    createNewGame,
    preferencesNotSet,
    shouldAskLanguages,
    languagePrefs,
    resolveLanguages,
  };
};
