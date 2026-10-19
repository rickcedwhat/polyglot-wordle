import { beforeEach, expect, it, vi } from 'vitest';
import { saveActivityReaction } from './useActivityReactions';

const state = vi.hoisted(() => ({ exists: false, set: vi.fn(), delete: vi.fn(), get: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: (_db: unknown, ...path: string[]) => path.join('/'),
  serverTimestamp: () => 'SERVER_TIME',
  runTransaction: (_db: unknown, fn: (tx: unknown) => Promise<void>) =>
    fn({ get: async () => ({ exists: () => state.exists }), set: state.set, delete: state.delete }),
}));
beforeEach(() => {
  vi.clearAllMocks();
  state.exists = false;
});
const target = { kind: 'game' as const, sourceId: 'alex_puzzle', ownerId: 'alex' };
it('uses deterministic identity and creates only the current player’s requested reaction', async () => {
  await saveActivityReaction(target, 'me', 'applause', true);
  expect(state.set).toHaveBeenCalledWith('reactions/alex_puzzle__game__me__applause', {
    ...target,
    targetKey: 'alex_puzzle__game',
    userId: 'me',
    emoji: 'applause',
    createdAt: 'SERVER_TIME',
  });
  state.exists = true;
  state.set.mockClear();
  await saveActivityReaction(target, 'me', 'applause', true);
  expect(state.set).not.toHaveBeenCalled();
});
it('removes only the selected reaction and treats repeated removal as a no-op', async () => {
  state.exists = true;
  await saveActivityReaction(target, 'me', 'fire', false);
  expect(state.delete).toHaveBeenCalledWith('reactions/alex_puzzle__game__me__fire');
  state.exists = false;
  state.delete.mockClear();
  await saveActivityReaction(target, 'me', 'fire', false);
  expect(state.delete).not.toHaveBeenCalled();
});
