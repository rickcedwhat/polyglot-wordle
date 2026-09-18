import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { Language } from '@/types/firestore';
import { DiscoveredWordRecord, UserVocabularyMap } from '@/types/vocabulary';
import { normalizeWord } from '@/utils/wordUtils';

export const VOCABULARY_STORAGE_KEY = 'polyglot_vocabulary_v1';

export const getLocalVocabulary = (): UserVocabularyMap => {
  try {
    const raw = localStorage.getItem(VOCABULARY_STORAGE_KEY);
    if (!raw) {
      return { en: {}, es: {}, fr: {} };
    }
    const parsed = JSON.parse(raw);
    return {
      en: parsed.en || {},
      es: parsed.es || {},
      fr: parsed.fr || {},
    };
  } catch {
    return { en: {}, es: {}, fr: {} };
  }
};

export const saveLocalVocabulary = (vocab: UserVocabularyMap): void => {
  try {
    localStorage.setItem(VOCABULARY_STORAGE_KEY, JSON.stringify(vocab));
  } catch (e) {
    console.error('Failed to save vocabulary to localStorage:', e);
  }
};

export const fetchUserVocabulary = async (userId: string): Promise<UserVocabularyMap> => {
  const db = getFirestore();
  const langs: Language[] = ['en', 'es', 'fr'];
  const result: UserVocabularyMap = { en: {}, es: {}, fr: {} };

  const docs = await Promise.all(
    langs.map(async (lang) => {
      try {
        const docRef = doc(db, 'users', userId, 'vocabulary', lang);
        const snap = await getDoc(docRef);
        return { lang, data: snap.exists() ? snap.data() : null };
      } catch (err) {
        console.error(`Failed to fetch vocabulary for ${lang}:`, err);
        return { lang, data: null };
      }
    })
  );

  for (const { lang, data } of docs) {
    if (data && data.words) {
      result[lang] = data.words as Record<string, DiscoveredWordRecord>;
    }
  }

  return result;
};

export interface RecordGuessPayload {
  guess: string;
  matchedLangs: Language[];
  isSolution?: boolean;
}

export const useVocabulary = (targetUserId?: string) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const effectiveUserId = targetUserId || currentUser?.uid;

  const queryKey = ['vocabulary', effectiveUserId || 'local'];

  const {
    data: vocabulary = { en: {}, es: {}, fr: {} },
    isLoading,
    isError,
  } = useQuery({
    queryKey,
    queryFn: async (): Promise<UserVocabularyMap> => {
      if (effectiveUserId) {
        const remote = await fetchUserVocabulary(effectiveUserId);
        // If it's the current user's profile and remote has empty languages, merge any local guest records
        if (currentUser?.uid === effectiveUserId) {
          const local = getLocalVocabulary();
          let needsSync = false;
          (['en', 'es', 'fr'] as Language[]).forEach((lang) => {
            for (const [key, record] of Object.entries(local[lang])) {
              if (!remote[lang][key]) {
                remote[lang][key] = record;
                needsSync = true;
              }
            }
          });
          if (needsSync) {
            const db = getFirestore();
            for (const lang of ['en', 'es', 'fr'] as Language[]) {
              if (Object.keys(remote[lang]).length > 0) {
                const docRef = doc(db, 'users', effectiveUserId, 'vocabulary', lang);
                setDoc(
                  docRef,
                  { words: remote[lang], totalCount: Object.keys(remote[lang]).length },
                  { merge: true }
                ).catch(() => {});
              }
            }
          }
        }
        return remote;
      }
      return getLocalVocabulary();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const recordGuessMutation = useMutation({
    mutationFn: async ({ guess, matchedLangs, isSolution = false }: RecordGuessPayload) => {
      const normWord = normalizeWord(guess);
      if (!normWord || matchedLangs.length === 0) {
        return;
      }

      const nowIso = new Date().toISOString();
      const currentVocab = {
        en: { ...vocabulary.en },
        es: { ...vocabulary.es },
        fr: { ...vocabulary.fr },
      };

      for (const lang of matchedLangs) {
        const existing = currentVocab[lang][normWord];
        const updated: DiscoveredWordRecord = {
          timesGuessed: (existing?.timesGuessed || 0) + 1,
          firstSeen: existing?.firstSeen || nowIso,
          lastSeen: nowIso,
          isSolved: existing?.isSolved || isSolution,
        };
        currentVocab[lang][normWord] = updated;
      }

      // Always save to localStorage
      saveLocalVocabulary(currentVocab);

      // If logged in, persist to Firestore for matched languages
      if (currentUser?.uid) {
        const db = getFirestore();
        for (const lang of matchedLangs) {
          try {
            const docRef = doc(db, 'users', currentUser.uid, 'vocabulary', lang);
            await setDoc(
              docRef,
              {
                words: currentVocab[lang],
                totalCount: Object.keys(currentVocab[lang]).length,
              },
              { merge: true }
            );
          } catch (err) {
            console.error(`Failed to save vocabulary to Firestore for ${lang}:`, err);
          }
        }
      }

      return currentVocab;
    },
    onSuccess: (updatedVocab) => {
      if (updatedVocab) {
        queryClient.setQueryData(queryKey, updatedVocab);
      }
    },
  });

  const counts = {
    en: Object.keys(vocabulary.en || {}).length,
    es: Object.keys(vocabulary.es || {}).length,
    fr: Object.keys(vocabulary.fr || {}).length,
  };

  const totalWordsCount = counts.en + counts.es + counts.fr;

  return {
    vocabulary,
    counts,
    totalWordsCount,
    isLoading,
    isError,
    recordGuess: recordGuessMutation.mutateAsync,
  };
};
