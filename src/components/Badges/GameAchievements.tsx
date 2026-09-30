import type { FC } from 'react';
import { Group, Stack, Text, Tooltip } from '@mantine/core';
import { certificationTrack, FEATS, type EarnedFeat } from '@/achievements/config';
import { featKey } from '@/achievements/detectFeats';
import type { LevelUp } from '@/achievements/levels';
import { FeatMedal, TrackBadge } from './Badges';

interface GameAchievementsProps {
  feats: EarnedFeat[];
  levelUps: LevelUp[];
}

/** "Earned this game" list for the post-game summary. Renders nothing if nothing was earned. */
export const EarnedThisGame: FC<GameAchievementsProps> = ({ feats, levelUps }) => {
  if (feats.length === 0 && levelUps.length === 0) {
    return null;
  }
  return (
    <Stack gap="xs">
      <Text size="xs" fw={700} c="dimmed">
        EARNED THIS GAME
      </Text>
      {feats.map((feat) => (
        <Group key={featKey(feat)} gap="sm" wrap="nowrap">
          <FeatMedal id={feat.id} size={40} />
          <div>
            <Text size="sm" fw={600}>
              {FEATS[feat.id].name}
            </Text>
            <Text size="xs" c="dimmed">
              {FEATS[feat.id].detail(feat)}
            </Text>
          </div>
        </Group>
      ))}
      {levelUps.map(({ lang, level }) => {
        const track = certificationTrack(lang);
        return (
          <Group key={lang} gap="sm" wrap="nowrap">
            <TrackBadge track={track} level={level} size={40} />
            <div>
              <Text size="sm" fw={600}>
                {track.name}: {track.levels[level].label}
              </Text>
              <Text size="xs" c="dimmed">
                Reached with this game
              </Text>
            </div>
          </Group>
        );
      })}
    </Stack>
  );
};

/** Compact medal row for game history cards; hover or tap a badge for its name. */
export const GameBadgeRow: FC<GameAchievementsProps> = ({ feats, levelUps }) => {
  if (feats.length === 0 && levelUps.length === 0) {
    return null;
  }
  return (
    <Group gap={6}>
      {feats.map((feat) => (
        <Tooltip
          key={featKey(feat)}
          label={`${FEATS[feat.id].name}: ${FEATS[feat.id].detail(feat)}`}
          withArrow
          events={{ hover: true, focus: true, touch: true }}
        >
          <div>
            <FeatMedal id={feat.id} size={26} />
          </div>
        </Tooltip>
      ))}
      {levelUps.map(({ lang, level }) => {
        const track = certificationTrack(lang);
        return (
          <Tooltip
            key={lang}
            label={`${track.name}: ${track.levels[level].label}`}
            withArrow
            events={{ hover: true, focus: true, touch: true }}
          >
            <div>
              <TrackBadge track={track} level={level} size={26} />
            </div>
          </Tooltip>
        );
      })}
    </Group>
  );
};
