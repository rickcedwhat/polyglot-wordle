import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
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

export const friendChallengeErrorMessage = (err: unknown, friendName: string): string => {
  if (err instanceof FriendChallengeError && err.code === 'already_challenged') {
    return 'You already challenged someone on this game. Start a new game to challenge another friend.';
  }
  if (err instanceof FriendChallengeError) {
    return `Couldn't challenge ${friendName}. They may have already played this game.`;
  }
  return `Couldn't challenge ${friendName}. Please try again.`;
};

export const useFriendChallenge = () => {
  const { currentUser } = useAuth();
  const { data: profile } = useUserProfile(currentUser?.uid);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const send = async (friend: ChallengeFriend, gameId: string) => {
    if (!currentUser) {
      throw new Error('Not signed in');
    }
    await createFriendChallenge({
      challengerId: currentUser.uid,
      challengerProfile: {
        displayName: profile?.displayName || currentUser.displayName || 'Player',
        photoURL: profile?.photoURL || currentUser.photoURL || '',
      },
      friend,
      gameId,
    });
    await queryClient.invalidateQueries({ queryKey: ['challenges', currentUser.uid] });
  };

  /** Challenge a friend on a game you already finished. */
  const challengeOnGame = (friend: ChallengeFriend, game: Pick<GameDoc, 'gameId'>) =>
    send(friend, game.gameId);

  /** Start a brand-new game for both of you, then open it so you can play your side. */
  const challengeNewGame = async (
    friend: ChallengeFriend,
    languages: LanguageCombo,
    difficulties: DifficultyPrefs
  ) => {
    const gameId = generateGameId(
      languages,
      languages.map((lang) => difficulties[lang])
    );
    await send(friend, gameId);
    navigate(gamePath(gameId, languages));
  };

  return { challengeOnGame, challengeNewGame };
};
