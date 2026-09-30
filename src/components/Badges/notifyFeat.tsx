import { notifications } from '@mantine/notifications';
import { FEAT_CATEGORIES, FEATS, type EarnedFeat } from '@/achievements/config';
import { featKey } from '@/achievements/detectFeats';
import { FeatMedal } from './Badges';

/** Pops a notification for a feat earned during play. */
export const notifyFeat = (feat: EarnedFeat) => {
  const def = FEATS[feat.id];
  notifications.show({
    id: featKey(feat),
    icon: <FeatMedal id={feat.id} size={36} />,
    title: def.name,
    message: def.detail(feat),
    color: FEAT_CATEGORIES[def.category].color,
    autoClose: 6000,
    styles: { icon: { background: 'transparent', width: 36, height: 36 } },
  });
};
