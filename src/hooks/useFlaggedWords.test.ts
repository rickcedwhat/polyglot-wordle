import { act, renderHook } from '@testing-library/react';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase/firestore', async (importOriginal) => ({
  ...(await importOriginal<typeof import('firebase/firestore')>()),
  getFirestore: vi.fn(() => ({})),
  doc: vi.fn((_db, ...path: string[]) => ({ path: path.join('/') })),
  setDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
}));

const STORAGE_KEY = 'polyglot_flagged_words_v1';

/** Fresh module state per test: the flag list is read from localStorage on import. */
const load = async (uid: string | null) => {
  vi.resetModules();
  const { auth } = await import('@/firebase');
  (auth as { currentUser: { uid: string } | null }).currentUser = uid ? { uid } : null;
  return import('./useFlaggedWords');
};

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
const setDocPaths = () => vi.mocked(setDoc).mock.calls.map(([ref]) => (ref as any).path);

describe('useFlaggedWords Firestore sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('keeps signed-out flags local, then uploads them on sign-in', async () => {
    const mod = await load(null);
    mod.flagWord({ lang: 'fr', wordKey: 'Plage' });
    expect(setDoc).not.toHaveBeenCalled();
    expect(stored()).toHaveLength(1);

    await mod.syncFlaggedWords('u1');
    expect(setDocPaths()).toEqual(['wordFlags/u1_fr_plage']);
    expect(vi.mocked(setDoc).mock.calls[0][1]).toMatchObject({
      uid: 'u1',
      lang: 'fr',
      wordKey: 'plage',
      reason: 'other',
    });
    expect(stored()[0]).toMatchObject({ ownerId: 'u1', synced: true });

    await mod.syncFlaggedWords('u1');
    expect(setDoc).toHaveBeenCalledTimes(1);
  });

  it('writes and deletes in order when toggled while signed in', async () => {
    const mod = await load('u1');
    const { result } = renderHook(() => mod.useFlaggedWords());

    await act(async () => {
      result.current.toggleFlag({ lang: 'en', wordKey: 'plant' });
      result.current.toggleFlag({ lang: 'en', wordKey: 'plant' });
      await Promise.resolve();
    });
    await vi.waitFor(() => expect(deleteDoc).toHaveBeenCalled());

    expect(setDocPaths()).toEqual(['wordFlags/u1_en_plant']);
    expect((vi.mocked(deleteDoc).mock.calls[0][0] as any).path).toBe('wordFlags/u1_en_plant');
    expect(vi.mocked(setDoc).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(deleteDoc).mock.invocationCallOrder[0]
    );
    expect(result.current.flaggedWords).toHaveLength(0);
  });

  it('uploads older local flags, marking missing-word notes as missing', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        {
          id: 'es:xyzzy',
          lang: 'es',
          wordKey: 'xyzzy',
          note: 'Missing word (rejected as a guess)',
          flaggedAt: 1_700_000_000_000,
        },
      ])
    );
    const mod = await load(null);
    await mod.syncFlaggedWords('u1');
    expect(vi.mocked(setDoc).mock.calls[0][1]).toMatchObject({ reason: 'missing' });
  });

  it("doesn't upload another account's flags", async () => {
    const mod = await load('u1');
    mod.flagWord({ lang: 'en', wordKey: 'plant' });
    await vi.waitFor(() => expect(setDoc).toHaveBeenCalledTimes(1));
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(stored().map((item: object) => ({ ...item, synced: false })))
    );

    const reloaded = await load('u2');
    await reloaded.syncFlaggedWords('u2');
    expect(setDoc).toHaveBeenCalledTimes(1);
  });
});
