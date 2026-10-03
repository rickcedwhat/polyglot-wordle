import { useEffect, useMemo, useState } from 'react';
import { getGameAchievements, type AchievementGame } from '@/achievements/gameAchievements';
import { useDictionaries } from '@/hooks/useDictionaries';
import { useVocabulary } from '@/hooks/useVocabulary';
import type { Language } from '@/types/firestore';

/** Feats and certification level-ups for one game, using the game owner's vocabulary. */
export const useGameAchievements = (
  game: AchievementGame & { userId?: string; isLiveGame?: boolean }
) => {
  const { vocabulary, isLoading } = useVocabulary(game.userId);
  const { dictionaries } = useDictionaries(
    game.shuffledLanguages ?? (Object.keys(game.words) as Language[])
  );
  const [now] = useState(() => new Date());
  const [completedAt, setCompletedAt] = useState(() =>
    game.isLiveGame === false ? now : undefined
  );

  useEffect(() => {
    if (game.isLiveGame === false && !completedAt) {
      setCompletedAt(new Date());
    }
  }, [game.isLiveGame, completedAt]);

  const achievements = useMemo(
    () =>
      getGameAchievements(
        game,
        isLoading ? undefined : vocabulary,
        {
          startedAt: now,
          completedAt: game.isLiveGame === false ? completedAt : undefined,
        },
        dictionaries
      ),
    [game, vocabulary, isLoading, now, completedAt, dictionaries]
  );

  return { ...achievements, isLoading };
};
