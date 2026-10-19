import { Timestamp } from 'firebase/firestore';
import { beforeEach, expect, it, vi } from 'vitest';
import { recordKey, recordTime } from '@/utils/activityTimeline';
import { fetchActivityPage } from './useActivityTimeline';

const state = vi.hoisted(() => ({
  rows: {} as Record<string, { id: string; data: () => unknown }[]>,
  fail: false,
}));
vi.mock('firebase/firestore', async (original) => ({
  ...(await original<typeof import('firebase/firestore')>()),
  getFirestore: () => ({}),
  collection: (_db: unknown, name: string) => ({ name }),
  where: () => ({}),
  orderBy: () => ({}),
  limit: () => ({}),
  startAfter: (doc: { id: string }) => ({ after: doc.id }),
  query: (base: object, ...parts: object[]) => Object.assign({}, base, ...parts),
  getDocs: vi.fn(async ({ name, after }: { name: string; after?: string }) => {
    if (state.fail && name === 'activityEvents') {
      throw new Error('offline');
    }
    const rows = state.rows[name] ?? [];
    const start = after ? rows.findIndex((doc) => doc.id === after) + 1 : 0;
    const docs = rows.slice(start, start + 12);
    return { docs, size: docs.length };
  }),
}));
beforeEach(() => {
  state.rows = {};
  state.fail = false;
});
it('merges pagination buffers in order, with no lost or repeated records', async () => {
  state.rows.games = Array.from({ length: 29 }, (_, i) => ({
    id: `g${i}`,
    data: () => ({ userId: 'alex', completedAt: Timestamp.fromMillis(10000 - i * 20) }),
  }));
  state.rows.activityEvents = Array.from({ length: 17 }, (_, i) => ({
    id: `c${i}`,
    data: () => ({ userId: 'sam', createdAt: Timestamp.fromMillis(9990 - i * 20) }),
  }));
  const records = [];
  let cursor;
  for (let i = 0; i < 10; i++) {
    const page = await fetchActivityPage(cursor);
    records.push(...page.records);
    cursor = page.nextCursor;
    if (!cursor) {
      break;
    }
  }
  expect(records).toHaveLength(46);
  expect(new Set(records.map(recordKey)).size).toBe(46);
  expect(records.map(recordTime)).toEqual(records.map(recordTime).sort((a, b) => b - a));
  expect(cursor).toBeUndefined();
});
it('propagates a source failure rather than silently skipping its events', async () => {
  state.fail = true;
  await expect(fetchActivityPage()).rejects.toThrow('offline');
  state.fail = false;
  expect((await fetchActivityPage()).records).toEqual([]);
});
