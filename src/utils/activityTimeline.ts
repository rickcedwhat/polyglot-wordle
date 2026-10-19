import type { EarnedFeat } from '@/achievements/config';
import type { CertificationActivity, GameDoc } from '@/types/firestore';

export type FeedGame = GameDoc & { id: string };
export type FeedCertification = CertificationActivity & { id: string };
export type ActivityRecord =
  | { type: 'game'; game: FeedGame }
  | { type: 'certification'; certification: FeedCertification };
export type ReactionKind =
  | 'game'
  | 'certification'
  | 'feat'
  | 'personalBest'
  | 'streak'
  | 'firstGame';
export interface ReactionTarget {
  kind: ReactionKind;
  sourceId: string;
  ownerId: string;
}
export const reactionKey = (target: ReactionTarget) => `${target.sourceId}__${target.kind}`;
export type TimelineEntry =
  | { id: string; type: 'games'; userId: string; at: number; games: FeedGame[] }
  | {
      id: string;
      type: 'certification';
      userId: string;
      at: number;
      certification: FeedCertification;
    }
  | {
      id: string;
      type: 'feat' | 'personalBest' | 'streak' | 'firstGame';
      userId: string;
      at: number;
      game: FeedGame;
      feat?: EarnedFeat;
    };

export const recordTime = (record: ActivityRecord) =>
  record.type === 'game'
    ? (record.game.completedAt?.toMillis() ?? 0)
    : record.certification.createdAt.toMillis();
export const recordKey = (record: ActivityRecord) =>
  record.type === 'game' ? `game:${record.game.id}` : `cert:${record.certification.id}`;
const notable = new Set([
  'holeInOne',
  'aLaPrimera',
  'duPremierCoup',
  'alPrimoColpo',
  'dePrimeira',
  'hailMary',
  'outOfNowhere',
  'jackpot',
  'lostInTranslation',
  'jeNeSaisQuoi',
  'underdog',
]);
const dayKey = (at: number) => {
  const date = new Date(at);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};
/** All loaded pages are regrouped together, so a player/day has exactly one summary. */
export const buildTimeline = (records: ActivityRecord[]): TimelineEntry[] => {
  const unique = new Map(records.map((record) => [recordKey(record), record]));
  const entries: TimelineEntry[] = [];
  const groups = new Map<string, FeedGame[]>();
  for (const record of unique.values()) {
    const at = recordTime(record);
    if (record.type === 'certification') {
      const certification = record.certification;
      entries.push({
        id: `cert:${certification.id}`,
        type: 'certification',
        at,
        userId: certification.userId,
        certification,
      });
      continue;
    }
    const game = record.game;
    const key = `${game.userId}:${dayKey(at)}`;
    groups.set(key, [...(groups.get(key) ?? []), game]);
    const snapshot = game.activity;
    if (!snapshot) {
      continue;
    }
    const feat = snapshot.feats.find((earned) => notable.has(earned.id));
    const types = [
      snapshot.firstGame ? 'firstGame' : null,
      snapshot.personalBest ? 'personalBest' : null,
      snapshot.streak ? 'streak' : null,
      feat ? 'feat' : null,
    ] as const;
    for (const type of types) {
      if (type) {
        entries.push({
          id: `${game.id}:${type}`,
          type,
          userId: game.userId,
          at,
          game,
          ...(type === 'feat' ? { feat } : {}),
        });
      }
    }
  }
  for (const [key, games] of groups) {
    games.sort(
      (a, b) =>
        (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0) ||
        a.id.localeCompare(b.id)
    );
    // A lone standout already has a card; its game can expand from that card.
    if (
      games.length === 1 &&
      entries.some((entry) => 'game' in entry && entry.game.id === games[0].id)
    ) {
      continue;
    }
    entries.push({
      id: `games:${key}`,
      type: 'games',
      userId: games[0].userId,
      at: games[0].completedAt!.toMillis(),
      games,
    });
  }
  return entries.sort(
    (a, b) =>
      b.at - a.at ||
      Number(a.type === 'games') - Number(b.type === 'games') ||
      a.id.localeCompare(b.id)
  );
};
