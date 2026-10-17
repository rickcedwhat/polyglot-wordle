import { describe, expect, it, vi } from 'vitest';
import { waitForFirestoreIndexes, type DeploymentIndex } from './firestoreIndexReadiness';

const expected: DeploymentIndex[] = [
  {
    collectionGroup: 'games',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'isLiveGame', order: 'ASCENDING' },
      { fieldPath: 'completedAt', order: 'DESCENDING' },
    ],
  },
];
const index = (state: string) => [{ ...expected[0], state }];

describe('Firestore deployment gate', () => {
  it('does not deploy while indexes are missing or building', async () => {
    const listIndexes = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(index('CREATING'))
      .mockResolvedValue(index('READY'));
    const sleep = vi.fn().mockResolvedValue(undefined);
    await waitForFirestoreIndexes({ expected, listIndexes, sleep });
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(listIndexes).toHaveBeenCalledTimes(3);
  });
  it('accepts an already-ready index without waiting', async () => {
    const sleep = vi.fn();
    await waitForFirestoreIndexes({ expected, listIndexes: async () => index('READY'), sleep });
    expect(sleep).not.toHaveBeenCalled();
  });
  it('does not accept an index with the wrong field order', async () => {
    let time = 0;
    await expect(
      waitForFirestoreIndexes({
        expected,
        listIndexes: async () => [
          { ...index('READY')[0], fields: [...expected[0].fields].reverse() },
        ],
        now: () => time,
        sleep: async (ms) => {
          time += ms;
        },
        timeoutMs: 10,
        pollMs: 10,
      })
    ).rejects.toThrow('Timed out');
  });
  it('stops immediately when an index needs repair', async () => {
    await expect(
      waitForFirestoreIndexes({ expected, listIndexes: async () => index('NEEDS_REPAIR') })
    ).rejects.toThrow('NEEDS_REPAIR');
  });
  it('stops on API errors rather than allowing Hosting to proceed', async () => {
    await expect(
      waitForFirestoreIndexes({
        expected,
        listIndexes: async () => {
          throw new Error('permission denied');
        },
      })
    ).rejects.toThrow('permission denied');
  });
});
