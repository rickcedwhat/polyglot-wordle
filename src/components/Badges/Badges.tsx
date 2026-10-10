import type { FC } from 'react';
import { IconLock } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Badge, Box, Text } from '@mantine/core';
import {
  FEAT_CATEGORIES,
  FEATS,
  type BadgeIcon as BadgeIconType,
  type FeatId,
  type TrackDef,
} from '@/achievements/config';
import { useLanguageFlags } from '@/hooks/useLanguageFlags';

const BadgeIcon: FC<{ icon: BadgeIconType; size: number }> = ({ icon: IconOrText, size }) =>
  typeof IconOrText === 'string' ? (
    <Text lh={1} style={{ fontSize: size * 0.9 }} aria-hidden>
      {IconOrText}
    </Text>
  ) : (
    <IconOrText size={size} stroke={1.6} />
  );

interface FeatMedalProps {
  id: FeatId;
  /** Times earned; 0 renders the locked medal. */
  count?: number;
  size?: number;
  /** Show the times-earned number in the corner (when above 1). */
  showCount?: boolean;
}

/** Round medal for a feat, colored by its category. */
export const FeatMedal: FC<FeatMedalProps> = ({ id, count = 1, size = 56, showCount = false }) => {
  const { flags } = useLanguageFlags();
  const { t } = useTranslation();
  const feat = FEATS[id];
  const earned = count > 0;
  const color = earned ? FEAT_CATEGORIES[feat.category].color : 'gray';
  return (
    <Box pos="relative" w={size} h={size} style={{ flexShrink: 0 }}>
      <Box
        w={size}
        h={size}
        aria-label={earned ? feat.name : t('achievements.locked', { name: feat.name })}
        role="img"
        style={{
          borderRadius: '50%',
          border: `2px solid var(--mantine-color-${color}-${earned ? 5 : 8})`,
          background: `var(--mantine-color-${color}-light)`,
          color: `var(--mantine-color-${color}-${earned ? 3 : 7})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: earned ? 1 : 0.6,
        }}
      >
        {earned ? (
          <BadgeIcon icon={feat.icon ?? flags[feat.lang!]} size={size * 0.5} />
        ) : (
          <IconLock size={size * 0.5} stroke={1.6} />
        )}
      </Box>
      {showCount && count > 1 && (
        <Badge
          size="xs"
          circle={count < 10}
          color={color}
          variant="filled"
          pos="absolute"
          top={-2}
          right={-4}
        >
          {count}
        </Badge>
      )}
    </Box>
  );
};

/** Level colors: early levels bronze, middle silver, top gold. */
export const trackLevelColor = (level: number, totalLevels: number) => {
  if (level < 0) {
    return 'dark';
  }
  const position = level / Math.max(totalLevels - 1, 1);
  if (position < 0.34) {
    return 'orange';
  }
  if (position < 0.67) {
    return 'gray';
  }
  return 'yellow';
};

const SHADES: Record<string, { ring: number; fg: number }> = {
  orange: { ring: 7, fg: 4 },
  gray: { ring: 4, fg: 2 },
  yellow: { ring: 5, fg: 3 },
  dark: { ring: 4, fg: 3 },
};

const HEXAGON = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';

interface TrackBadgeProps {
  track: TrackDef;
  /** Index into `track.levels`, or -1 for not started. */
  level: number;
  size?: number;
}

/** Hexagon for a track showing its current level. */
export const TrackBadge: FC<TrackBadgeProps> = ({ track, level, size = 64 }) => {
  const { flags } = useLanguageFlags();
  const { t } = useTranslation();
  const reached = level >= 0;
  const color = trackLevelColor(level, track.levels.length);
  const shades = SHADES[color];
  const label = reached ? track.levels[level].label : '—';
  const height = size * 1.1;
  return (
    <Box
      w={size}
      h={height}
      role="img"
      aria-label={`${track.name}: ${reached ? label : t('achievements.notStarted')}`}
      style={{
        clipPath: HEXAGON,
        background: `var(--mantine-color-${color}-${shades.ring})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Box
        w={size - 6}
        h={height - 6}
        style={{
          clipPath: HEXAGON,
          background: 'var(--mantine-color-dark-7)',
          color: `var(--mantine-color-${color}-${shades.fg})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          opacity: reached ? 1 : 0.55,
        }}
      >
        <BadgeIcon icon={track.lang ? flags[track.lang] : track.icon} size={size * 0.34} />
        {size >= 36 && (
          <Text
            fw={800}
            lh={1}
            c={`${color}.${shades.fg}`}
            style={{ fontSize: label.length > 3 ? size * 0.13 : size * 0.2 }}
          >
            {label}
          </Text>
        )}
      </Box>
    </Box>
  );
};
