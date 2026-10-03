import { useSyncExternalStore } from 'react';
import { deleteDoc, doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { auth } from '@/firebase';
import type { Language } from '@/types/firestore';
import { flagFor } from '@/utils/languages';

type FlagReason = 'missing' | 'other';

interface FlaggedWordItem {
  id: string; // `${lang}:${wordKey}`
  lang: Language;
  wordKey: string;
  display?: string;
  pos?: string;
  d?: number;
  def?: string;
  note?: string;
  reason?: FlagReason;
  flaggedAt: number;
  /** Account the flag belongs to; unset for flags made while signed out. */
  ownerId?: string;
  /** True once the flag is saved in Firestore. */
  synced?: boolean;
}

const FLAGGED_WORDS_STORAGE_KEY = 'polyglot_flagged_words_v1';
const DELETED_FLAGS_STORAGE_KEY = 'polyglot_deleted_flags_v1';

type DeletedFlag = Pick<FlaggedWordItem, 'id' | 'lang' | 'wordKey'> & { ownerId: string };

const getDeletedFlags = (): DeletedFlag[] => {
  try {
    return JSON.parse(localStorage.getItem(DELETED_FLAGS_STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
};

let deletedFlags = getDeletedFlags();
const saveDeletedFlags = () => {
  try {
    localStorage.setItem(DELETED_FLAGS_STORAGE_KEY, JSON.stringify(deletedFlags));
  } catch (err) {
    console.error('Failed to save deleted flags:', err);
  }
};
export const MISSING_WORD_NOTE = 'Missing word (rejected as a guess)';

const getStoredFlaggedWords = (): FlaggedWordItem[] => {
  try {
    const raw = localStorage.getItem(FLAGGED_WORDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveFlaggedWords = (items: FlaggedWordItem[]) => {
  try {
    localStorage.setItem(FLAGGED_WORDS_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save flagged words:', e);
  }
};

type FlagEntry = {
  lang: Language;
  wordKey: string;
  display?: string;
  pos?: string;
  d?: number;
  def?: string;
  note?: string;
  reason?: FlagReason;
};

// One shared list so every component using the hook (e.g. each board) sees the same flags
// and never overwrites another's changes.
let current: FlaggedWordItem[] = getStoredFlaggedWords();
const listeners = new Set<() => void>();

const setFlaggedWords = (update: (prev: FlaggedWordItem[]) => FlaggedWordItem[]) => {
  current = update(current);
  saveFlaggedWords(current);
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const toItem = (entry: FlagEntry): FlaggedWordItem => ({
  id: `${entry.lang}:${entry.wordKey.toLowerCase()}`,
  lang: entry.lang,
  wordKey: entry.wordKey.toLowerCase(),
  display: entry.display || entry.wordKey,
  pos: entry.pos,
  d: entry.d,
  def: entry.def,
  note: entry.note || '',
  reason: entry.reason,
  flaggedAt: Date.now(),
  ownerId: auth.currentUser?.uid,
});

// --- Firestore mirror (`wordFlags/{uid}_{lang}_{wordKey}`) ---

const flagRef = (uid: string, item: Pick<FlaggedWordItem, 'lang' | 'wordKey'>) =>
  doc(getFirestore(), 'wordFlags', `${uid}_${item.lang}_${item.wordKey}`);

/** The signed-in uid if this flag may be written to their account. */
const remoteOwner = (item: FlaggedWordItem) => {
  const uid = auth.currentUser?.uid;
  return uid && (!item.ownerId || item.ownerId === uid) ? uid : null;
};

// Writes for the same word run in order, so a quick flag/unflag can't leave a stray doc.
const pending = new Map<string, Promise<void>>();
const enqueue = (id: string, op: () => Promise<void>) => {
  const next = (pending.get(id) ?? Promise.resolve()).then(op).catch((err) => {
    console.error(`Failed to sync flagged word ${id}:`, err);
  });
  pending.set(id, next);
  return next;
};

const pushFlag = (item: FlaggedWordItem, uid: string) =>
  enqueue(item.id, async () => {
    const latest = current.find((i) => i.id === item.id);
    if (!latest || (latest.ownerId && latest.ownerId !== uid)) {
      return;
    }
    const supersededDeletion = deletedFlags.find((i) => i.id === latest.id && i.ownerId === uid);
    await setDoc(flagRef(uid, latest), {
      uid,
      lang: latest.lang,
      wordKey: latest.wordKey,
      display: latest.display || latest.wordKey,
      note: latest.note || '',
      reason: latest.reason ?? (latest.note === MISSING_WORD_NOTE ? 'missing' : 'other'),
      flaggedAt: Timestamp.fromMillis(latest.flaggedAt),
    });
    if (supersededDeletion) {
      deletedFlags = deletedFlags.filter((i) => i !== supersededDeletion);
      saveDeletedFlags();
    }
    setFlaggedWords((prev) =>
      prev.map((i) => (i === latest ? { ...i, ownerId: uid, synced: true } : i))
    );
  });

const deleteRemoteFlag = (item: DeletedFlag) =>
  enqueue(item.id, async () => {
    if (!deletedFlags.includes(item)) {
      return;
    }
    await deleteDoc(flagRef(item.ownerId, item));
    deletedFlags = deletedFlags.filter((deleted) => deleted !== item);
    saveDeletedFlags();
  });

const removeRemoteFlag = (item: FlaggedWordItem) => {
  const uid = remoteOwner(item);
  const ownerId = item.ownerId ?? uid;
  if (!ownerId) {
    return Promise.resolve();
  }
  // Persist before attempting the delete so sign-out or a failed request cannot lose it.
  const deleted = { id: item.id, lang: item.lang, wordKey: item.wordKey, ownerId };
  deletedFlags = deletedFlags.filter((i) => i.id !== item.id || i.ownerId !== ownerId);
  deletedFlags.push(deleted);
  saveDeletedFlags();
  return uid ? deleteRemoteFlag(deleted) : Promise.resolve();
};

/** Replays this account's deletions before uploading its unsynced flags. */
export const syncFlaggedWords = (uid: string) =>
  Promise.all([
    ...deletedFlags.filter((item) => item.ownerId === uid).map(deleteRemoteFlag),
    ...current
      .filter((item) => !item.synced && (!item.ownerId || item.ownerId === uid))
      .map((item) => pushFlag(item, uid)),
  ]);

const addFlag = (item: FlaggedWordItem) => {
  setFlaggedWords((prev) => [...prev, item]);
  const uid = remoteOwner(item);
  if (uid) {
    void pushFlag(item, uid);
  }
};

const removeFlag = (item: FlaggedWordItem) => {
  setFlaggedWords((prev) => prev.filter((i) => i.id !== item.id));
  void removeRemoteFlag(item);
};

/** Flags a word (no-op if it's already flagged). Usable outside React. */
export const flagWord = (entry: FlagEntry) => {
  const item = toItem(entry);
  if (!current.some((i) => i.id === item.id)) {
    addFlag(item);
  }
};

export const useFlaggedWords = () => {
  const flaggedWords = useSyncExternalStore(subscribe, () => current);

  const isFlagged = (lang: Language, wordKey: string) => {
    const id = `${lang}:${wordKey.toLowerCase()}`;
    return flaggedWords.some((item) => item.id === id);
  };

  const toggleFlag = (entry: FlagEntry) => {
    const item = toItem(entry);
    const existing = current.find((i) => i.id === item.id);
    if (existing) {
      removeFlag(existing);
    } else {
      addFlag(item);
    }
  };

  const updateNote = (lang: Language, wordKey: string, note: string) => {
    const id = `${lang}:${wordKey.toLowerCase()}`;
    setFlaggedWords((prev) => prev.map((item) => (item.id === id ? { ...item, note } : item)));
    const updated = current.find((item) => item.id === id);
    const uid = updated ? remoteOwner(updated) : null;
    if (updated && uid) {
      void pushFlag(updated, uid);
    }
  };

  const clearAllFlagged = () => {
    const removed = current;
    setFlaggedWords(() => []);
    removed.forEach((item) => void removeRemoteFlag(item));
  };

  const generateMarkdownSummary = () => {
    if (flaggedWords.length === 0) {
      return 'No flagged words in discussion list.';
    }

    let md = `### 🚩 Flagged Dictionary Words for Discussion (${flaggedWords.length})\n\n`;
    flaggedWords.forEach((item, index) => {
      const flagEmoji = flagFor(item.lang);
      md += `${index + 1}. **${item.display || item.wordKey}** (${flagEmoji} ${item.lang.toUpperCase()})\n`;
      if (item.pos) {
        md += `   - **POS**: ${item.pos}\n`;
      }
      if (item.d !== undefined) {
        md += `   - **Difficulty**: ${item.d}\n`;
      }
      if (item.def) {
        md += `   - **Definition**: ${item.def}\n`;
      }
      if (item.note && item.note.trim()) {
        md += `   - **Discussion Note**: ${item.note.trim()}\n`;
      }
      md += `\n`;
    });
    return md.trim();
  };

  return {
    flaggedWords,
    isFlagged,
    toggleFlag,
    updateNote,
    clearAllFlagged,
    generateMarkdownSummary,
  };
};
