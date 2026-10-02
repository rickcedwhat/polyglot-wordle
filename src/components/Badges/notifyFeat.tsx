import { notifications, type NotificationData } from '@mantine/notifications';
import { FEAT_CATEGORIES, FEATS, type EarnedFeat } from '@/achievements/config';
import { featKey } from '@/achievements/detectFeats';
import { FeatMedal } from './Badges';

/** Lets the guess's tiles mostly flip before the first toast appears. */
const FIRST_TOAST_DELAY_MS = 1000;
const TOAST_GAP_MS = 500;
let nextToastAt = 0;

/** Shows achievement toasts one after another: bottom-right on desktop, bottom-center on mobile. */
export const showAchievementToast = (data: NotificationData) => {
  const now = Date.now();
  const showAt = Math.max(now + FIRST_TOAST_DELAY_MS, nextToastAt + TOAST_GAP_MS);
  nextToastAt = showAt;
  setTimeout(() => {
    const isMobile = window.matchMedia('(max-width: 48em)').matches;
    notifications.show({
      autoClose: 6000,
      position: isMobile ? 'bottom-center' : 'bottom-right',
      ...data,
    });
  }, showAt - now);
};

/** Pops a notification for a feat earned during play. */
export const notifyFeat = (feat: EarnedFeat) => {
  const def = FEATS[feat.id];
  showAchievementToast({
    id: featKey(feat),
    icon: <FeatMedal id={feat.id} size={36} />,
    title: def.name,
    message: def.detail(feat),
    color: FEAT_CATEGORIES[def.category].color,
    styles: { icon: { background: 'transparent', width: 36, height: 36 } },
  });
};
