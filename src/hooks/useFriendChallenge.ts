import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import i18n from '@/i18n';
import type { DifficultyPrefs, GameDoc, LanguageCombo } from '@/types/firestore';
import { createFriendChallenge, FriendChallengeError } from '@/utils/challengeUtils';
import { gamePath } from '@/utils/languages';
import { generateGameId } from './useGameActions';
import { useUserProfile } from './useUserProfile';

export interface ChallengeFriend {
  id: string;
  displayName: string;
  photoURL: string;
}

export interface FriendChallengeResult {
  sent: ChallengeFriend[];
  failed: { friend: ChallengeFriend; error: unknown }[];
}

export const friendChallengeErrorMessage = (err: unknown, friendName: string): string => {
  if (err instanceof FriendChallengeError && err.code === 'already_challenged') {
    return i18n.t('challengeFriend.alreadyChallenged', { name: friendName });
  }
  if (err instanceof FriendChallengeError) {
    return i18n.t('challengeFriend.notAllowed', { name: friendName });
  }
  return i18n.t('challengeFriend.failed', { name: friendName });
};

/** "Alex", "Alex and Sam", "Alex, Sam, and Kim", in the interface language. */
export const joinNames = (friends: ChallengeFriend[]): string =>
  new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(
    friends.map((f) => f.displayName)
  );

export const useFriendChallenge = () => {
  const { currentUser } = useAuth();
  const { data: profile } = useUserProfile(currentUser?.uid);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const send = async (
    friends: ChallengeFriend[],
    gameId: string
  ): Promise<FriendChallengeResult> => {
    if (!currentUser) {
      throw new Error('Not signed in');
    }
    const challengerProfile = {
      displayName: profile?.displayName || currentUser.displayName || i18n.t('postGame.player'),
      photoURL: profile?.photoURL || currentUser.photoURL || '',
    };
    const outcomes = await Promise.allSettled(
      friends.map((friend) =>
        createFriendChallenge({ challengerId: currentUser.uid, challengerProfile, friend, gameId })
      )
    );
    const result: FriendChallengeResult = { sent: [], failed: [] };
    outcomes.forEach((outcome, i) => {
      if (outcome.status === 'fulfilled') {
        result.sent.push(friends[i]);
      } else {
        result.failed.push({ friend: friends[i], error: outcome.reason });
      }
    });
    await queryClient.invalidateQueries({ queryKey: ['challenges', currentUser.uid] });
    return result;
  };

  /** Challenge friends on a game you already finished. */
  const challengeOnGame = (friends: ChallengeFriend[], game: Pick<GameDoc, 'gameId'>) =>
    send(friends, game.gameId);

  /** Start a brand-new game for everyone, then open it so you can play your side. */
  const challengeNewGame = async (
    friends: ChallengeFriend[],
    languages: LanguageCombo,
    difficulties: DifficultyPrefs
  ) => {
    const gameId = generateGameId(
      languages,
      languages.map((lang) => difficulties[lang])
    );
    const result = await send(friends, gameId);
    if (result.sent.length > 0) {
      navigate(gamePath(gameId, languages));
    }
    return result;
  };

  return { challengeOnGame, challengeNewGame };
};
