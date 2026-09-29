import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import type { Language } from '@/types/firestore';
import { ALL_LANGUAGES } from '@/utils/languages';
import { normalizeWord } from '@/utils/wordUtils';

/** First time each word's definition was opened (ISO timestamp), per language. */
export type DefinitionsReadMap = Record<Language, Record<string, string>>;

export const DEFINITIONS_READ_STORAGE_KEY = 'polyglot_definitions_read_v1';

const emptyMap = (): DefinitionsReadMap =>
  Object.fromEntries(ALL_LANGUAGES.map((lang) => [lang, {}])) as DefinitionsReadMap;

const sanitize = (raw: unknown): Record<string, string> =>
  raw && typeof raw === 'object' && !Array.isArray(raw)
    ? Object.fromEntries(
        Object.entries(raw).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string'
        )
      )
    : {};

const storageKey = (userId?: string) =>
  userId ? `${DEFINITIONS_READ_STORAGE_KEY}_${userId}` : DEFINITIONS_READ_STORAGE_KEY;

export const getLocalDefinitionsRead = (userId?: string): DefinitionsReadMap => {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '{}');
    return Object.fromEntries(
      ALL_LANGUAGES.map((lang) => [lang, sanitize(parsed?.[lang])])
    ) as DefinitionsReadMap;
  } catch {
    return emptyMap();
  }
};

const saveLocalDefinitionsRead = (map: DefinitionsReadMap, userId?: string) => {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(map));
  } catch {
    // Storage full or unavailable; the in-memory cache still has it.
  }
};

/** Stored as a `definitionsRead` map on each `users/{uid}/vocabulary/{lang}` doc. */
const vocabularyDoc = (userId: string, lang: Language) =>
  doc(getFirestore(), 'users', userId, 'vocabulary', lang);

const fetchDefinitionsRead = async (userId: string): Promise<DefinitionsReadMap> => {
  const entries = await Promise.all(
    ALL_LANGUAGES.map(async (lang) => {
      const snap = await getDoc(vocabularyDoc(userId, lang));
      return [lang, sanitize(snap.data()?.definitionsRead)] as const;
    })
  );
  return Object.fromEntries(entries) as DefinitionsReadMap;
};

/** Move reads made while signed out onto the account, keeping the earliest timestamp. */
const migrateGuestReads = async (userId: string, remote: DefinitionsReadMap) => {
  const guest = getLocalDefinitionsRead();
  const merged = { ...remote };
  await Promise.all(
    ALL_LANGUAGES.map(async (lang) => {
      const additions = Object.fromEntries(
        Object.entries(guest[lang]).filter(
          ([word, readAt]) => !remote[lang][word] || readAt < remote[lang][word]
        )
      );
      if (Object.keys(additions).length === 0) {
        return;
      }
      await setDoc(vocabularyDoc(userId, lang), { definitionsRead: additions }, { merge: true });
      merged[lang] = { ...remote[lang], ...additions };
    })
  );
  localStorage.removeItem(DEFINITIONS_READ_STORAGE_KEY);
  return merged;
};

export const countDefinitionsRead = (map: DefinitionsReadMap) =>
  ALL_LANGUAGES.reduce((total, lang) => total + Object.keys(map[lang] ?? {}).length, 0);

export const useDefinitionsRead = (targetUserId?: string) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const userId = targetUserId || currentUser?.uid;
  const isOwn = !targetUserId || targetUserId === currentUser?.uid;
  const queryKey = useMemo(() => ['definitionsRead', userId || 'local'], [userId]);

  const { data: definitionsRead = emptyMap(), isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!userId) {
        return getLocalDefinitionsRead();
      }
      try {
        const remote = await fetchDefinitionsRead(userId);
        return isOwn ? await migrateGuestReads(userId, remote) : remote;
      } catch (err) {
        console.error('Failed to load definitions read, using local copy:', err);
        return getLocalDefinitionsRead(userId);
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  /** Record the first time a definition is opened; later opens are no-ops. */
  const recordDefinitionRead = useCallback(
    async (lang: Language, word: string) => {
      const key = normalizeWord(word);
      const current = queryClient.getQueryData<DefinitionsReadMap>(queryKey) ?? definitionsRead;
      if (!key || current[lang]?.[key]) {
        return;
      }
      const readAt = new Date().toISOString();
      const updated = { ...current, [lang]: { ...current[lang], [key]: readAt } };
      queryClient.setQueryData(queryKey, updated);
      saveLocalDefinitionsRead(updated, currentUser?.uid);
      if (currentUser?.uid) {
        try {
          await setDoc(
            vocabularyDoc(currentUser.uid, lang),
            { definitionsRead: { [key]: readAt } },
            { merge: true }
          );
        } catch (err) {
          console.error(`Failed to save definition read for ${lang}:`, err);
        }
      }
    },
    [queryClient, queryKey, currentUser?.uid, definitionsRead]
  );

  return {
    definitionsRead,
    definitionsReadCount: countDefinitionsRead(definitionsRead),
    isLoading,
    recordDefinitionRead,
  };
};
