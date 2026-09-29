import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Language } from '@/types/firestore';
import { DEFINITIONS_READ_STORAGE_KEY, useDefinitionsRead } from './useDefinitionsRead';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { uid: 'user_123' } }),
}));

const earlier = '2026-09-18T10:00:00.000Z';
const later = '2026-09-18T12:00:00.000Z';

const mockRemote = (reads: Partial<Record<Language, Record<string, string>>>) => {
  vi.mocked(doc).mockImplementation(
    (_db, ...path) => ({ id: path.at(-1) }) as ReturnType<typeof doc>
  );
  vi.mocked(getDoc).mockImplementation(
    async (ref) =>
      ({
        data: () => ({ definitionsRead: reads[ref.id as Language] }),
      }) as Awaited<ReturnType<typeof getDoc>>
  );
};

const renderDefinitionsRead = (targetUserId?: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  return renderHook(() => useDefinitionsRead(targetUserId), { wrapper });
};

describe('useDefinitionsRead loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(setDoc).mockResolvedValue(undefined);
    mockRemote({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps locally recorded reads after a successful remote reload', async () => {
    mockRemote({ en: { apple: earlier } });
    const first = renderDefinitionsRead();
    await waitFor(() => expect(first.result.current.isLoading).toBe(false));

    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(setDoc).mockRejectedValueOnce(new Error('Offline'));
    await act(async () => {
      await first.result.current.recordDefinitionRead('es', 'pluma');
      await first.result.current.recordDefinitionRead('fr', 'livre');
    });
    await waitFor(() => expect(first.result.current.definitionsReadCount).toBe(3));
    expect(JSON.parse(localStorage.getItem(`${DEFINITIONS_READ_STORAGE_KEY}_user_123`)!)).toEqual(
      first.result.current.definitionsRead
    );
    const savedReads = first.result.current.definitionsRead;
    first.unmount();

    const reloaded = renderDefinitionsRead();
    await waitFor(() => expect(reloaded.result.current.isLoading).toBe(false));
    expect(reloaded.result.current.definitionsRead).toEqual(savedReads);
    expect(reloaded.result.current.definitionsReadCount).toBe(3);
  });

  it('preserves guest migration and its earliest timestamp when merging account reads', async () => {
    mockRemote({ en: { apple: later }, it: { libro: earlier } });
    localStorage.setItem(
      DEFINITIONS_READ_STORAGE_KEY,
      JSON.stringify({ en: { apple: earlier }, pt: { livro: earlier } })
    );
    localStorage.setItem(
      `${DEFINITIONS_READ_STORAGE_KEY}_user_123`,
      JSON.stringify({ en: { apple: later }, es: { pluma: earlier }, it: { libro: later } })
    );

    const { result } = renderDefinitionsRead('user_123');
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.definitionsRead).toEqual({
      en: { apple: earlier },
      es: { pluma: earlier },
      fr: {},
      it: { libro: earlier },
      pt: { livro: earlier },
    });
    expect(result.current.definitionsReadCount).toBe(4);
    expect(setDoc).toHaveBeenCalledTimes(2);
    expect(setDoc).toHaveBeenCalledWith(
      { id: 'en' },
      { definitionsRead: { apple: earlier } },
      { merge: true }
    );
    expect(setDoc).toHaveBeenCalledWith(
      { id: 'pt' },
      { definitionsRead: { livro: earlier } },
      { merge: true }
    );
    expect(localStorage.getItem(DEFINITIONS_READ_STORAGE_KEY)).toBeNull();
  });

  it('keeps another account separate from locally saved and guest reads', async () => {
    mockRemote({ en: { apple: earlier } });
    const local = JSON.stringify({ es: { pluma: earlier } });
    localStorage.setItem(DEFINITIONS_READ_STORAGE_KEY, local);
    localStorage.setItem(`${DEFINITIONS_READ_STORAGE_KEY}_user_123`, local);
    localStorage.setItem(`${DEFINITIONS_READ_STORAGE_KEY}_other_user`, local);

    const { result } = renderDefinitionsRead('other_user');
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.definitionsRead).toEqual({
      en: { apple: earlier },
      es: {},
      fr: {},
      it: {},
      pt: {},
    });
    expect(result.current.definitionsReadCount).toBe(1);
    expect(setDoc).not.toHaveBeenCalled();
    expect(localStorage.getItem(DEFINITIONS_READ_STORAGE_KEY)).toBe(local);
  });
});
