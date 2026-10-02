import { createContext, FC, ReactNode, useContext, useEffect, useMemo, useRef } from 'react';
import { TrackBadge } from '@/components/Badges/Badges';
import { showAchievementToast } from '@/components/Badges/notifyFeat';
import { useAuth } from '@/context/AuthContext';
import { useAchievements } from '@/hooks/useAchievements';
import { useDefinitionsRead } from '@/hooks/useDefinitionsRead';
import type { Language } from '@/types/firestore';
import { newlyEarned, type AchievementProgress } from '@/utils/achievements';

interface AchievementsContextType {
  recordDefinitionRead: (lang: Language, word: string) => void;
}

const AchievementsContext = createContext<AchievementsContextType | undefined>(undefined);

/** Shows a notification whenever one of the current user's achievements reaches a new tier. */
const useAchievementNotifications = () => {
  const { currentUser } = useAuth();
  const { achievements, isLoading } = useAchievements();
  const previous = useRef<{ userKey: string; achievements: AchievementProgress[] } | null>(null);
  const userKey = currentUser?.uid ?? 'local';

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (previous.current?.userKey === userKey) {
      newlyEarned(previous.current.achievements, achievements).forEach((achievement) => {
        const { track, tier, next, current, level } = achievement;
        showAchievementToast({
          id: `${achievement.id}-${level}`,
          icon: <TrackBadge track={track} level={level} size={36} />,
          title: `${track.name}: ${tier?.label}`,
          message: `${current} ${track.unit}. ${
            next ? `Next: ${next.label} at ${next.target}.` : 'Top level reached!'
          }`,
          color: 'gray',
          styles: { icon: { background: 'transparent', width: 36, height: 40 } },
        });
      });
    }
    previous.current = { userKey, achievements };
  }, [achievements, isLoading, userKey]);
};

export const AchievementsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { recordDefinitionRead } = useDefinitionsRead();
  useAchievementNotifications();

  const value = useMemo(() => ({ recordDefinitionRead }), [recordDefinitionRead]);
  return <AchievementsContext.Provider value={value}>{children}</AchievementsContext.Provider>;
};

const noop = () => {};

/** Records that a definition was opened; a no-op outside an AchievementsProvider. */
export const useRecordDefinitionRead = () =>
  useContext(AchievementsContext)?.recordDefinitionRead ?? noop;
