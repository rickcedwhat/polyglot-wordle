import { useMemo, useState } from 'react';
import { getGameAchievements, type AchievementGame } from '@/achievements/gameAchievements';
import { useVocabulary } from '@/hooks/useVocabulary';

/** Feats and certification level-ups for one game, using the game owner's vocabulary. */
export const useGameAchievements = (
  game: AchievementGame & { userId?: string; isLiveGame?: boolean }
) => {
  const { vocabulary, isLoading } = useVocabulary(game.userId);
  const [now] = useState(() => new Date());

  const achievements = useMemo(
    () =>
      getGameAchievements(game, isLoading ? undefined : vocabulary, {
        startedAt: now,
        completedAt: game.isLiveGame === false ? now : undefined,
      }),
    [game, vocabulary, isLoading, now]
  );

  return { ...achievements, isLoading };
};
