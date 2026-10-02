import { useQueryClient } from '@tanstack/react-query';
import { collection, getDocs, getFirestore, limit, query, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/context/AuthContext';
import type { Difficulty, DifficultyPrefs, Language, LanguageCombo } from '@/types/firestore';
import {
  buildGameId,
  DEFAULT_LANGUAGES,
  gamePath,
  isLanguageCombo,
  sortLanguages,
} from '@/utils/languages';
import { useUserProfile } from './useUserProfile';

const DEFAULT_DIFFICULTY: Difficulty = 'basic';

/** Fresh random game id for these boards. */
export const generateGameId = (languages: LanguageCombo, difficulties: Difficulty[]): string => {
  const entropyHex = Array.from({ length: Math.ceil(languages.length / 4) }, () =>
    uuidv4().replace(/-/g, '')
  )
    .join('')
    .slice(0, languages.length * 8);
  return buildGameId({ entropyHex, languages, difficulties, seedNibble: uuidv4()[0] });
};

export type CreateNewGameOptions = {
  /** Override languages for this game (skipPicker still respected separately). */
  languages?: LanguageCombo;
  /** Override difficulties (e.g. just picked in game setup, before the saved profile refreshes). */
  difficulties?: Partial<DifficultyPrefs>;
};

export const useGameActions = () => {
  const { currentUser } = useAuth();
  const { data: userProfile } = useUserProfile(currentUser?.uid);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const languagePrefs = userProfile?.languagePrefs ?? null;
  /** New Game opens game setup unless the player saved a setup and chose to skip it. */
  const needsSetup = !userProfile?.difficultyPrefs || !languagePrefs?.skipPicker;

  /** Difficulty per board: overrides first, then saved preferences, then Basic. */
  const difficultiesFor = (
    languages: LanguageCombo,
    overrides?: Partial<DifficultyPrefs>
  ): Difficulty[] =>
    languages.map(
      (lang) => overrides?.[lang] ?? userProfile?.difficultyPrefs?.[lang] ?? DEFAULT_DIFFICULTY
    );

  const resolveLanguages = (override?: LanguageCombo): LanguageCombo => {
    if (isLanguageCombo(override)) {
      return override;
    }
    if (languagePrefs && isLanguageCombo(languagePrefs.languages)) {
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
      const languages = resolveLanguages(options?.languages);
      const difficulties = difficultiesFor(languages, options?.difficulties);

      // Reuse an empty live game that matches difficulties + language set
      const gamesCollectionRef = collection(db, 'games');
      let reusableGameId: string | undefined;
      try {
        const q = query(
          gamesCollectionRef,
          where('userId', '==', currentUser.uid),
          where('isLiveGame', '==', true),
          where('guessHistory', '==', []),
          ...languages.map((lang, index) =>
            where(`difficulties.${lang}`, '==', difficulties[index])
          ),
          limit(5)
        );
        const existingGameSnapshot = await getDocs(q);
        const sortedWanted = sortLanguages(languages).join(',');
        const reusable = existingGameSnapshot.docs.find((docSnap) => {
          const data = docSnap.data();
          const boardLangs = (data.shuffledLanguages as Language[] | undefined) ?? [];
          if (!isLanguageCombo(boardLangs) || boardLangs.length !== languages.length) {
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
        gameId = generateGameId(languages, difficulties);
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
    needsSetup,
    languagePrefs,
    resolveLanguages,
  };
};
