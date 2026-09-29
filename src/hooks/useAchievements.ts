import { useMemo } from 'react';
import { useDefinitionsRead } from '@/hooks/useDefinitionsRead';
import { useVocabulary } from '@/hooks/useVocabulary';
import { getAchievements } from '@/utils/achievements';

/** Achievement progress for a user (defaults to the signed-in user or the local guest). */
export const useAchievements = (targetUserId?: string) => {
  const { counts, isLoading: isVocabLoading } = useVocabulary(targetUserId);
  const { definitionsReadCount, isLoading: isReadLoading } = useDefinitionsRead(targetUserId);

  const achievements = useMemo(
    () => getAchievements({ wordCounts: counts, definitionsRead: definitionsReadCount }),
    [counts, definitionsReadCount]
  );

  return { achievements, isLoading: isVocabLoading || isReadLoading };
};
