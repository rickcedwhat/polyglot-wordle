import type { GameDoc } from '@/types/firestore';
import {
  buildTimeline,
  recordKey,
  type ActivityRecord,
  type FeedGame,
  type TimelineEntry,
} from './activityTimeline';
import { normalizeWord, scoringVersionOf } from './wordUtils';

export interface SharedPuzzleEntry {
  id: string;
  type: 'puzzle';
  at: number;
  games: FeedGame[];
}
export type FeedTimelineEntry = TimelineEntry | SharedPuzzleEntry;
/** Same seed alone is not enough when dictionaries or scoring have changed. */
export const puzzleIdentity = (game: GameDoc) =>
  JSON.stringify([
    game.gameId,
    scoringVersionOf(game),
    [...game.shuffledLanguages]
      .sort()
      .map((lang) => [
        lang,
        normalizeWord(game.words[lang] ?? ''),
        game.difficulties?.[lang] ?? 'basic',
      ]),
  ]);

/** Group only observed finished records; preserve individual milestone and reaction targets. */
export const buildFeedTimeline = (records: ActivityRecord[]): FeedTimelineEntry[] => {
  const unique = [...new Map(records.map((record) => [recordKey(record), record])).values()].filter(
    (record) => record.type !== 'game' || (!record.game.isLiveGame && !!record.game.completedAt)
  );
  const byPuzzle = new Map<string, FeedGame[]>();
  for (const record of unique) {
    if (record.type !== 'game' || record.game.isLiveGame || !record.game.completedAt) {
      continue;
    }
    const key = puzzleIdentity(record.game);
    byPuzzle.set(key, [...(byPuzzle.get(key) ?? []), record.game]);
  }
  const shared: SharedPuzzleEntry[] = [];
  const consumed = new Set<string>();
  for (const [key, games] of byPuzzle) {
    const players = new Map<string, FeedGame>();
    [...games]
      .sort(
        (a, b) => b.completedAt!.toMillis() - a.completedAt!.toMillis() || a.id.localeCompare(b.id)
      )
      .forEach((game) => {
        if (!players.has(game.userId)) {
          players.set(game.userId, game);
        }
      });
    if (players.size < 2) {
      continue;
    }
    games.forEach((game) => consumed.add(game.id));
    shared.push({
      id: `puzzle:${key}`,
      type: 'puzzle',
      at: Math.max(...games.map((game) => game.completedAt!.toMillis())),
      games: [...players.values()],
    });
  }
  const remaining = buildTimeline(
    unique.filter((record) => record.type !== 'game' || !consumed.has(record.game.id))
  );
  const milestones = buildTimeline(unique).filter(
    (entry) => 'game' in entry && consumed.has(entry.game.id)
  );
  return [...remaining, ...milestones, ...shared].sort(
    (a, b) => b.at - a.at || a.id.localeCompare(b.id)
  );
};
