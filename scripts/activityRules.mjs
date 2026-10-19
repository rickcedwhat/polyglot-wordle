import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, it } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

let env;
const words = (count) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, i) => [
      `word${i}`,
      { timesGuessed: 1, firstSeen: '2026-01-01', lastSeen: '2026-01-01' },
    ])
  );
const player = (uid = 'alice') => env.authenticatedContext(uid).firestore();
const seed = async (entries) =>
  env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const batch = writeBatch(db);
    for (const [path, data] of Object.entries(entries)) {
      batch.set(doc(db, path), data);
    }
    await batch.commit();
  });
const certificate = (overrides = {}) => ({
  userId: 'alice',
  lang: 'pt',
  level: 0,
  wordCount: 25,
  createdAt: serverTimestamp(),
  ...overrides,
});
const certBatch = (db, { after = 25, data = certificate(), id = 'cert_alice_pt_0' } = {}) => {
  const batch = writeBatch(db);
  batch.set(doc(db, 'users/alice/vocabulary/pt'), { words: words(after), totalCount: after });
  batch.set(doc(db, 'activityEvents', id), data);
  return batch.commit();
};
const reaction = (overrides = {}) => ({
  kind: 'game',
  sourceId: 'bob_game',
  ownerId: 'bob',
  targetKey: 'bob_game__game',
  userId: 'alice',
  emoji: 'applause',
  createdAt: serverTimestamp(),
  ...overrides,
});
const reactionId = (data) => `${data.targetKey}__${data.userId}__${data.emoji}`;
const react = (db, data = reaction(), id = reactionId(data)) =>
  setDoc(doc(db, 'reactions', id), data);

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-polyglot-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});
after(async () => {
  await env?.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

describe('certification milestones', () => {
  for (const [level, target] of [25, 75, 150, 300, 600, 1200].entries()) {
    it(`accepts atomic crossing of certification tier ${level}`, async () => {
      await seed({
        'users/alice/vocabulary/pt': { words: words(target - 1), totalCount: target - 1 },
      });
      const db = player();
      await assertSucceeds(
        certBatch(db, {
          after: target,
          data: certificate({ level, wordCount: target }),
          id: `cert_alice_pt_${level}`,
        })
      );
      const saved = await getDoc(doc(db, `activityEvents/cert_alice_pt_${level}`));
      assert.equal(saved.data().wordCount, target);
    });
  }
  it('denies an announcement without the crossing vocabulary write', async () => {
    await seed({ 'users/alice/vocabulary/pt': { words: words(24), totalCount: 24 } });
    await assertFails(setDoc(doc(player(), 'activityEvents/cert_alice_pt_0'), certificate()));
  });
  it('denies backdating a tier already reached before the transaction', async () => {
    await seed({ 'users/alice/vocabulary/pt': { words: words(25), totalCount: 25 } });
    await assertFails(certBatch(player(), { after: 26 }));
  });
  it('denies an event when the updated vocabulary is still below its threshold', async () => {
    await seed({ 'users/alice/vocabulary/pt': { words: words(23), totalCount: 23 } });
    await assertFails(certBatch(player(), { after: 24 }));
  });
  for (const [label, overrides, id] of [
    ['another player', { userId: 'bob' }, 'cert_bob_pt_0'],
    ['unsupported language', { lang: 'de' }, 'cert_alice_de_0'],
    ['out-of-range tier', { level: 6 }, 'cert_alice_pt_6'],
    ['noninteger tier', { level: 0.5 }, 'cert_alice_pt_0.5'],
    ['wrong threshold', { wordCount: 24 }, 'cert_alice_pt_0'],
    ['wrong document ID', {}, 'other'],
    ['client timestamp', { createdAt: Timestamp.fromMillis(1) }, 'cert_alice_pt_0'],
    ['extra private fields', { email: 'alice@example.test' }, 'cert_alice_pt_0'],
  ]) {
    it(`denies certification with ${label}`, async () => {
      await seed({ 'users/alice/vocabulary/pt': { words: words(24), totalCount: 24 } });
      await assertFails(certBatch(player(), { data: certificate(overrides), id }));
    });
  }
  it('accepts a tier after malformed stored records are removed in a separate cleanup', async () => {
    const db = player();
    const path = 'users/alice/vocabulary/pt';
    await seed({ [path]: { words: { ...words(24), invalid: null }, totalCount: 24 } });
    // The raw old map has 25 keys, even though only 24 records are valid.
    await assertFails(certBatch(db));
    assert.equal((await getDoc(doc(db, path))).data().words.invalid, null);
    await assertSucceeds(
      setDoc(
        doc(db, path),
        { words: words(24), totalCount: 24 },
        { mergeFields: ['words', 'totalCount'] }
      )
    );
    await assertSucceeds(certBatch(db));
    const saved = (await getDoc(doc(db, path))).data();
    assert.equal(saved.totalCount, 25);
    assert.equal('invalid' in saved.words, false);
  });
  it('preserves vocabulary with a word-only retry when the atomic certification write is denied', async () => {
    const db = player();
    const path = 'users/alice/vocabulary/pt';
    await seed({ [path]: { words: words(24), totalCount: 24 } });
    await assertFails(certBatch(db, { data: certificate({ wordCount: 75 }) }));
    assert.equal((await getDoc(doc(db, path))).data().totalCount, 24);
    await assertSucceeds(
      setDoc(
        doc(db, path),
        { words: words(25), totalCount: 25 },
        { mergeFields: ['words', 'totalCount'] }
      )
    );
    assert.equal((await getDoc(doc(db, path))).data().totalCount, 25);
    assert.equal((await getDoc(doc(db, 'activityEvents/cert_alice_pt_0'))).exists(), false);
  });
  it('does not let even the author edit or delete an earned milestone', async () => {
    await seed({
      'activityEvents/cert_alice_pt_0': { ...certificate(), createdAt: Timestamp.fromMillis(1) },
    });
    await assertFails(
      updateDoc(doc(player(), 'activityEvents/cert_alice_pt_0'), { wordCount: 75 })
    );
    await assertFails(deleteDoc(doc(player(), 'activityEvents/cert_alice_pt_0')));
  });
});

describe('public reactions with author-only writes', () => {
  beforeEach(async () =>
    seed({
      'games/bob_game': {
        userId: 'bob',
        isLiveGame: false,
        activity: {
          feats: [{ id: 'dePrimeira', guess: 1, lang: 'pt' }],
          personalBest: true,
          firstGame: true,
          streak: 7,
        },
      },
      'games/bob_live': { userId: 'bob', isLiveGame: true },
      'games/bob_ordinary': { userId: 'bob', isLiveGame: false },
      'activityEvents/cert_bob_pt_2': {
        userId: 'bob',
        lang: 'pt',
        level: 2,
        wordCount: 150,
        createdAt: Timestamp.fromMillis(1),
      },
    })
  );
  for (const emoji of ['applause', 'fire', 'mindBlown', 'laugh', 'heart']) {
    it(`accepts a player's own ${emoji} reaction`, async () => {
      await assertSucceeds(react(player(), reaction({ emoji })));
    });
  }
  for (const kind of ['feat', 'personalBest', 'streak', 'firstGame']) {
    it(`accepts reactions on a saved ${kind} milestone`, async () => {
      await assertSucceeds(react(player(), reaction({ kind, targetKey: `bob_game__${kind}` })));
    });
  }
  it('accepts reactions on an existing certification', async () => {
    await assertSucceeds(
      react(
        player(),
        reaction({
          kind: 'certification',
          sourceId: 'cert_bob_pt_2',
          targetKey: 'cert_bob_pt_2__certification',
        })
      )
    );
  });
  for (const [label, overrides, id] of [
    ['another reacting player', { userId: 'bob' }],
    ['an unsupported emoji', { emoji: 'arbitrary' }],
    ['a missing target', { sourceId: 'missing', targetKey: 'missing__game' }],
    ['a live game', { sourceId: 'bob_live', targetKey: 'bob_live__game' }],
    ['a forged owner', { ownerId: 'alice' }],
    ['a forged target key', { targetKey: 'other' }],
    ['an invalid kind', { kind: 'privateChallenge', targetKey: 'bob_game__privateChallenge' }],
    [
      'a milestone the game did not earn',
      { kind: 'personalBest', sourceId: 'bob_ordinary', targetKey: 'bob_ordinary__personalBest' },
    ],
    ['a client timestamp', { createdAt: Timestamp.fromMillis(1) }],
    ['an arbitrary document ID', {}, 'other'],
    ['extra fields', { comment: 'not supported' }],
  ]) {
    it(`denies a reaction with ${label}`, async () => {
      const data = reaction(overrides);
      await assertFails(react(player(), data, id ?? reactionId(data)));
    });
  }
  it('cannot overwrite a reaction but can remove only your own', async () => {
    const db = player();
    const data = reaction();
    await assertSucceeds(react(db, data));
    const path = `reactions/${reactionId(data)}`;
    await assertFails(updateDoc(doc(db, path), { emoji: 'fire' }));
    await assertFails(deleteDoc(doc(player('bob'), path)));
    await assertSucceeds(deleteDoc(doc(db, path)));
  });
  it('exposes public metadata only to signed-in players, including the feed query shapes', async () => {
    await assertSucceeds(react(player()));
    const guest = env.unauthenticatedContext().firestore();
    await assertSucceeds(
      getDocs(query(collection(player('carol'), 'activityEvents'), orderBy('createdAt', 'desc')))
    );
    await assertSucceeds(
      getDocs(
        query(collection(player('carol'), 'reactions'), where('targetKey', '==', 'bob_game__game'))
      )
    );
    await assertFails(getDocs(collection(guest, 'activityEvents')));
    await assertFails(getDocs(collection(guest, 'reactions')));
    await assertFails(react(guest));
  });
});
