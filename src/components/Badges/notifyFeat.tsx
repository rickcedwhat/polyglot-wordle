import { FEAT_CATEGORIES, FEATS, type EarnedFeat } from '@/achievements/config';
import { featKey } from '@/achievements/detectFeats';
import { showToast } from '@/utils/toast';
import { FeatMedal } from './Badges';

/** Pops a notification for a feat earned during play. */
export const notifyFeat = (feat: EarnedFeat) => {
  const def = FEATS[feat.id];
  showToast({
    id: featKey(feat),
    icon: <FeatMedal id={feat.id} size={36} />,
    title: def.name,
    message: def.detail(feat),
    color: FEAT_CATEGORIES[def.category].color,
    styles: { icon: { background: 'transparent', width: 36, height: 36 } },
  });
};
