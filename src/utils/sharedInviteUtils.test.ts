import { runTransaction } from 'firebase/firestore';
import { beforeEach, expect, it, vi } from 'vitest';
import { rememberSharedInvite } from './sharedInviteUtils';

beforeEach(() => {
  vi.mocked(runTransaction).mockClear();
});
it('stores one reminder per puzzle and keeps the first share date on repeated shares', async () => {
  let stored = false;
  const set = vi.fn(() => {
    stored = true;
  });
  vi.mocked(runTransaction).mockImplementation(async (_db, callback) =>
    callback({
      get: vi.fn(async () => ({ exists: () => stored })),
      set,
    } as unknown as Parameters<Parameters<typeof runTransaction>[1]>[0])
  );
  await rememberSharedInvite('me', 'puzzle', ['fr', 'en', 'es']);
  await rememberSharedInvite('me', 'puzzle', ['fr', 'en', 'es']);
  expect(set).toHaveBeenCalledTimes(1);
  expect(set).toHaveBeenCalledWith(
    undefined,
    expect.objectContaining({ gameId: 'puzzle', languages: ['en', 'es', 'fr'] })
  );
});
