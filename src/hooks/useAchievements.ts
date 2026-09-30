import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useChallenges } from '@/hooks/useChallenges';
import { useDefinitionsRead } from '@/hooks/useDefinitionsRead';
import { useFriendships } from '@/hooks/useFriendships';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useVocabulary } from '@/hooks/useVocabulary';
import type { Language } from '@/types/firestore';
import { getAchievements } from '@/utils/achievements';
import { ALL_LANGUAGES } from '@/utils/languages';

/** Track progress for a user (defaults to the signed-in user or the local guest). */
export const useAchievements = (targetUserId?: string) => {
  const { currentUser } = useAuth();
  const userId = targetUserId ?? currentUser?.uid;
  const isSelf = Boolean(userId && userId === currentUser?.uid);

  const { counts, isLoading: isVocabLoading } = useVocabulary(targetUserId);
  const {
    definitionsRead,
    definitionsReadCount,
    isLoading: isReadLoading,
  } = useDefinitionsRead(targetUserId);
  const { data: profile } = useUserProfile(userId);
  const { data: friendships } = useFriendships(userId);
  const { challenges, isSuccess: challengesLoaded } = useChallenges();

  const achievements = useMemo(() => {
    const definitionsReadByLang = Object.fromEntries(
      ALL_LANGUAGES.map((lang) => [lang, Object.keys(definitionsRead[lang] ?? {}).length])
    ) as Record<Language, number>;
    return getAchievements({
      wordCounts: counts,
      definitionsRead: definitionsReadCount,
      definitionsReadByLang,
      maxStreak: profile?.stats?.maxStreak,
      gamesPlayed: profile?.stats?.gamesPlayed,
      friends: friendships?.filter((f) => f.status === 'accepted').length,
      // Challenges are only readable by their players, so Duelist shows on your own profile only.
      challengeWins:
        isSelf && challengesLoaded
          ? challenges.filter((c) => c.winnerId === userId).length
          : undefined,
    });
  }, [
    counts,
    definitionsRead,
    definitionsReadCount,
    profile,
    friendships,
    isSelf,
    challengesLoaded,
    challenges,
    userId,
  ]);

  return { achievements, isLoading: isVocabLoading || isReadLoading };
};
