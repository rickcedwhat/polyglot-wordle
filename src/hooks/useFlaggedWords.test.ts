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
const DELETED_STORAGE_KEY = 'polyglot_deleted_flags_v1';

/** Fresh module state per test: the flag list is read from localStorage on import. */
const load = async (uid: string | null) => {
  vi.resetModules();
  const { auth } = await import('@/firebase');
  (auth as { currentUser: { uid: string } | null }).currentUser = uid ? { uid } : null;
  return import('./useFlaggedWords');
};

const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
const deleted = () => JSON.parse(localStorage.getItem(DELETED_STORAGE_KEY) ?? '[]');
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
      await Promise.resolve();
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

  it('skips an add removed before its queued write starts', async () => {
    const mod = await load('u1');
    const { result } = renderHook(() => mod.useFlaggedWords());
    await act(async () => {
      result.current.toggleFlag({ lang: 'en', wordKey: 'plant' });
      result.current.toggleFlag({ lang: 'en', wordKey: 'plant' });
      await mod.syncFlaggedWords('u1');
    });
    expect(setDoc).not.toHaveBeenCalled();
    expect(result.current.flaggedWords).toHaveLength(0);
  });

  it('reads the latest fields when a queued add starts', async () => {
    const mod = await load('u1');
    const { result } = renderHook(() => mod.useFlaggedWords());
    await act(async () => {
      mod.flagWord({ lang: 'en', wordKey: 'plant' });
      result.current.updateNote('en', 'plant', mod.MISSING_WORD_NOTE);
      await mod.syncFlaggedWords('u1');
    });
    expect(vi.mocked(setDoc).mock.calls[0][1]).toMatchObject({
      note: mod.MISSING_WORD_NOTE,
      reason: 'missing',
    });
  });

  it('persists a note edited while the initial write is in flight', async () => {
    let finishAdd!: () => void;
    vi.mocked(setDoc).mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishAdd = resolve;
        })
    );
    const mod = await load('u1');
    const { result } = renderHook(() => mod.useFlaggedWords());
    await act(async () => {
      mod.flagWord({ lang: 'en', wordKey: 'plant' });
      await Promise.resolve();
      expect(setDoc).toHaveBeenCalledTimes(1);
      result.current.updateNote('en', 'plant', 'updated note');
      finishAdd();
    });
    await vi.waitFor(() => expect(setDoc).toHaveBeenCalledTimes(2));
    expect(vi.mocked(setDoc).mock.calls[1][1]).toMatchObject({ note: 'updated note' });
    expect(stored()[0]).toMatchObject({ note: 'updated note', synced: true });
  });

  it.each(['toggle', 'clear'] as const)(
    'replays signed-out %s deletions only for their owner after a reload',
    async (operation) => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          {
            id: 'en:plant',
            lang: 'en',
            wordKey: 'plant',
            ownerId: 'u1',
            synced: true,
            flaggedAt: 1,
          },
          {
            id: 'fr:plage',
            lang: 'fr',
            wordKey: 'plage',
            ownerId: 'u2',
            synced: true,
            flaggedAt: 1,
          },
        ])
      );
      const mod = await load(null);
      const { result, unmount } = renderHook(() => mod.useFlaggedWords());
      act(() => {
        if (operation === 'toggle') {
          result.current.toggleFlag({ lang: 'en', wordKey: 'plant' });
          result.current.toggleFlag({ lang: 'fr', wordKey: 'plage' });
        } else {
          result.current.clearAllFlagged();
        }
      });
      expect(stored()).toEqual([]);
      expect(deleteDoc).not.toHaveBeenCalled();
      expect(deleted()).toHaveLength(2);
      unmount();

      const reloaded = await load('u1');
      await reloaded.syncFlaggedWords('u1');
      expect(vi.mocked(deleteDoc).mock.calls.map(([ref]) => (ref as any).path)).toEqual([
        'wordFlags/u1_en_plant',
      ]);
      expect(deleted()).toEqual([expect.objectContaining({ ownerId: 'u2' })]);
      await reloaded.syncFlaggedWords('u1');
      expect(deleteDoc).toHaveBeenCalledTimes(1);

      const otherAccount = await load('u2');
      await otherAccount.syncFlaggedWords('u2');
      expect(deleteDoc).toHaveBeenCalledTimes(2);
      expect(deleted()).toEqual([]);
    }
  );

  it('retains a failed deletion for retry', async () => {
    localStorage.setItem(
      DELETED_STORAGE_KEY,
      JSON.stringify([{ id: 'en:plant', lang: 'en', wordKey: 'plant', ownerId: 'u1' }])
    );
    const mod = await load('u1');
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(deleteDoc).mockRejectedValueOnce(new Error('offline'));
    try {
      await mod.syncFlaggedWords('u1');
      expect(deleted()).toHaveLength(1);
      expect(error).toHaveBeenCalled();
      await mod.syncFlaggedWords('u1');
      expect(deleteDoc).toHaveBeenCalledTimes(2);
      expect(deleted()).toEqual([]);
    } finally {
      error.mockRestore();
    }
  });

  it('deletes a tombstone before uploading a re-added local flag', async () => {
    localStorage.setItem(
      DELETED_STORAGE_KEY,
      JSON.stringify([{ id: 'en:plant', lang: 'en', wordKey: 'plant', ownerId: 'u1' }])
    );
    const mod = await load(null);
    mod.flagWord({ lang: 'en', wordKey: 'plant', note: 're-added' });
    await mod.syncFlaggedWords('u1');
    expect(vi.mocked(deleteDoc).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(setDoc).mock.invocationCallOrder[0]
    );
    expect(vi.mocked(setDoc).mock.calls[0][1]).toMatchObject({ note: 're-added' });
    expect(deleted()).toEqual([]);
  });

  it('does not replay an old deletion after a successful re-add', async () => {
    localStorage.setItem(
      DELETED_STORAGE_KEY,
      JSON.stringify([{ id: 'en:plant', lang: 'en', wordKey: 'plant', ownerId: 'u1' }])
    );
    const mod = await load('u1');
    mod.flagWord({ lang: 'en', wordKey: 'plant' });
    await vi.waitFor(() => expect(stored()[0]).toMatchObject({ synced: true }));
    await mod.syncFlaggedWords('u1');
    expect(deleteDoc).not.toHaveBeenCalled();
    expect(deleted()).toEqual([]);
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
