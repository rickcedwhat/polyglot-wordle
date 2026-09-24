import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, getFirestore, runTransaction } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Language } from '@/types/firestore';
import { DiscoveredWordRecord, UserVocabularyMap } from '@/types/vocabulary';
import { ALL_LANGUAGES } from '@/utils/languages';
import { normalizeWord } from '@/utils/wordUtils';

export const VOCABULARY_STORAGE_KEY = 'polyglot_vocabulary_v1';

const emptyVocab = (): UserVocabularyMap =>
  Object.fromEntries(ALL_LANGUAGES.map((lang) => [lang, {}])) as UserVocabularyMap;

const isValidRecord = (rec: any): rec is DiscoveredWordRecord => {
  return (
    rec !== null &&
    typeof rec === 'object' &&
    typeof rec.timesGuessed === 'number' &&
    typeof rec.firstSeen === 'string' &&
    typeof rec.lastSeen === 'string'
  );
};

const sanitizeLanguageMap = (rawMap: any): Record<string, DiscoveredWordRecord> => {
  if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) {
    return {};
  }
  const clean: Record<string, DiscoveredWordRecord> = {};
  for (const [word, rec] of Object.entries(rawMap)) {
    if (isValidRecord(rec)) {
      clean[word] = {
        timesGuessed: rec.timesGuessed,
        firstSeen: rec.firstSeen,
        lastSeen: rec.lastSeen,
        ...(rec.isSolved ? { isSolved: true } : {}),
      };
    }
  }
  return clean;
};

export const getLocalVocabulary = (userId?: string): UserVocabularyMap => {
  const storageKey = userId ? `${VOCABULARY_STORAGE_KEY}_${userId}` : VOCABULARY_STORAGE_KEY;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return emptyVocab();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return emptyVocab();
    }
    return Object.fromEntries(
      ALL_LANGUAGES.map((lang) => [lang, sanitizeLanguageMap(parsed[lang])])
    ) as UserVocabularyMap;
  } catch {
    return emptyVocab();
  }
};

export const saveLocalVocabulary = (vocab: UserVocabularyMap, userId?: string): void => {
  const storageKey = userId ? `${VOCABULARY_STORAGE_KEY}_${userId}` : VOCABULARY_STORAGE_KEY;
  try {
    localStorage.setItem(storageKey, JSON.stringify(vocab));
  } catch (e) {
    console.error('Failed to save vocabulary to localStorage:', e);
  }
};

export const clearAnonymousVocabulary = (): void => {
  try {
    localStorage.removeItem(VOCABULARY_STORAGE_KEY);
  } catch (_e) {
    // Ignore storage deletion issues
  }
};

export const fetchUserVocabulary = async (userId: string): Promise<UserVocabularyMap> => {
  const db = getFirestore();
  const langs = [...ALL_LANGUAGES];
  const result = emptyVocab();

  // Propagate Firestore errors so caller query catches them
  const docs = await Promise.all(
    langs.map(async (lang) => {
      const docRef = doc(db, 'users', userId, 'vocabulary', lang);
      const snap = await getDoc(docRef);
      return { lang, data: snap.exists() ? snap.data() : null };
    })
  );

  for (const { lang, data } of docs) {
    if (data && data.words) {
      result[lang] = sanitizeLanguageMap(data.words);
    }
  }

  return result;
};

export interface RecordGuessPayload {
  guess: string;
  matchedLangs: Language[];
  solutionLangs?: Language[];
  isSolution?: boolean;
}

export const useVocabulary = (targetUserId?: string) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = targetUserId || currentUser?.uid;

  const queryKey = ['vocabulary', effectiveUserId || 'local'];

  const {
    data: vocabulary = emptyVocab(),
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<UserVocabularyMap> => {
      if (effectiveUserId) {
        try {
          const remote = await fetchUserVocabulary(effectiveUserId);

          // If it's the current user's profile, migrate any anonymous guest records into Firestore atomically
          if (currentUser?.uid === effectiveUserId) {
            const anonymousLocal = getLocalVocabulary();
            const langsToSync: Language[] = [];

            [...ALL_LANGUAGES].forEach((lang) => {
              if (Object.keys(anonymousLocal[lang]).length > 0) {
                langsToSync.push(lang);
              }
            });

            if (langsToSync.length > 0) {
              const db = getFirestore();
              for (const lang of langsToSync) {
                try {
                  const docRef = doc(db, 'users', effectiveUserId, 'vocabulary', lang);
                  await runTransaction(db, async (transaction) => {
                    const snap = await transaction.get(docRef);
                    const currentWords: Record<string, DiscoveredWordRecord> = snap.exists()
                      ? sanitizeLanguageMap(snap.data()?.words)
                      : { ...remote[lang] };

                    for (const [key, guestRec] of Object.entries(anonymousLocal[lang])) {
                      const existing = currentWords[key];
                      if (existing) {
                        currentWords[key] = {
                          timesGuessed: existing.timesGuessed + guestRec.timesGuessed,
                          firstSeen:
                            new Date(guestRec.firstSeen) < new Date(existing.firstSeen)
                              ? guestRec.firstSeen
                              : existing.firstSeen,
                          lastSeen:
                            new Date(guestRec.lastSeen) > new Date(existing.lastSeen)
                              ? guestRec.lastSeen
                              : existing.lastSeen,
                          isSolved: existing.isSolved || guestRec.isSolved,
                        };
                      } else {
                        currentWords[key] = guestRec;
                      }
                    }

                    transaction.set(
                      docRef,
                      { words: currentWords, totalCount: Object.keys(currentWords).length },
                      { merge: true }
                    );
                    remote[lang] = currentWords;
                  });
                } catch (err) {
                  console.error(`Failed to migrate anonymous vocabulary for ${lang}:`, err);
                }
              }
              clearAnonymousVocabulary();
            }
          }
          return remote;
        } catch (e) {
          console.error('Failed to sync remote vocabulary, falling back to local storage:', e);
          return getLocalVocabulary(effectiveUserId);
        }
      }
      return getLocalVocabulary();
    },
    throwOnError: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const recordGuessMutation = useMutation({
    mutationFn: async ({
      guess,
      matchedLangs,
      solutionLangs = [],
      isSolution = false,
    }: RecordGuessPayload) => {
      const normWord = normalizeWord(guess);
      if (!normWord || matchedLangs.length === 0) {
        return;
      }

      const nowIso = new Date().toISOString();

      // Read latest state synchronously from queryClient cache
      let updatedVocab: UserVocabularyMap = emptyVocab();
      queryClient.setQueryData(
        queryKey,
        (prev: UserVocabularyMap | undefined): UserVocabularyMap => {
          const base: UserVocabularyMap = prev
            ? (Object.fromEntries(
                ALL_LANGUAGES.map((lang) => [lang, { ...prev[lang] }])
              ) as UserVocabularyMap)
            : (Object.fromEntries(
                ALL_LANGUAGES.map((lang) => [lang, { ...vocabulary[lang] }])
              ) as UserVocabularyMap);

          for (const lang of matchedLangs) {
            const existing = base[lang][normWord];
            const isWordSolvedForLang =
              solutionLangs.length > 0 ? solutionLangs.includes(lang) : Boolean(isSolution);

            const updated: DiscoveredWordRecord = {
              timesGuessed: (existing?.timesGuessed || 0) + 1,
              firstSeen: existing?.firstSeen || nowIso,
              lastSeen: nowIso,
              isSolved: existing?.isSolved || isWordSolvedForLang,
            };
            base[lang][normWord] = updated;
          }

          updatedVocab = base;
          return base;
        }
      );

      // Save locally under appropriate scope (user-scoped if logged in, anonymous if guest)
      saveLocalVocabulary(updatedVocab, currentUser?.uid);

      // If logged in, persist to Firestore with transactions to guarantee atomicity
      if (currentUser?.uid) {
        const db = getFirestore();
        for (const lang of matchedLangs) {
          try {
            const isWordSolvedForLang =
              solutionLangs.length > 0 ? solutionLangs.includes(lang) : Boolean(isSolution);

            const docRef = doc(db, 'users', currentUser.uid, 'vocabulary', lang);
            await runTransaction(db, async (transaction) => {
              const snap = await transaction.get(docRef);
              const currentWords: Record<string, DiscoveredWordRecord> = snap.exists()
                ? sanitizeLanguageMap(snap.data()?.words)
                : {};

              const existing = currentWords[normWord];
              currentWords[normWord] = {
                timesGuessed: (existing?.timesGuessed || 0) + 1,
                firstSeen: existing?.firstSeen || nowIso,
                lastSeen: nowIso,
                isSolved: existing?.isSolved || isWordSolvedForLang,
              };

              transaction.set(
                docRef,
                {
                  words: currentWords,
                  totalCount: Object.keys(currentWords).length,
                },
                { merge: true }
              );
            });
          } catch (err) {
            console.error(`Failed to save vocabulary transactionally for ${lang}:`, err);
          }
        }
      }

      return updatedVocab;
    },
  });

  const counts = Object.fromEntries(
    ALL_LANGUAGES.map((lang) => [lang, Object.keys(vocabulary[lang] || {}).length])
  ) as Record<Language, number>;

  const totalWordsCount = ALL_LANGUAGES.reduce((sum, lang) => sum + counts[lang], 0);

  return {
    vocabulary,
    counts,
    totalWordsCount,
    isLoading,
    isError,
    error,
    refetch,
    recordGuess: recordGuessMutation.mutateAsync,
  };
};
