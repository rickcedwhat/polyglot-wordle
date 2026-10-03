import * as firestore from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChallengeDoc } from '@/types/firestore';
import { recordChallengeGameCompletion } from './challengeUtils';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn((_db, name) => name),
    doc: vi.fn((_db, collection, id) => `${collection}/${id}`),
    getDocs: vi.fn(),
    getFirestore: vi.fn(() => 'db'),
    query: vi.fn((ref, ...constraints) => ({ ref, constraints })),
    runTransaction: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
    where: vi.fn((field, op, value) => ({ field, op, value })),
  };
});

const challenge = (
  firstScore: number | null,
  secondScore: number | null,
  opponentId = 'player-b'
): ChallengeDoc => ({
  gameId: 'game-id',
  createdAt: 'CREATED_AT' as never,
  createdBy: 'player-a',
  source: 'share',
  type: 'direct',
  maxPlayers: 2,
  status: 'active',
  participants: {
    'player-a': {
      displayName: 'Player A',
      photoURL: '',
      score: firstScore,
      rsvp: 'accepted',
      completedAt: null,
      resultSeenAt: null,
    },
    [opponentId]: {
      displayName: 'Player B',
      photoURL: '',
      score: secondScore,
      rsvp: 'accepted',
      completedAt: null,
      resultSeenAt: null,
    },
  },
  participantIds: ['player-a', opponentId],
  winnerId: null,
});

/** Backs runTransaction with an in-memory challenges collection keyed by doc path. */
const mockChallenges = (docs: Record<string, ChallengeDoc>) => {
  const update = vi.fn();
  vi.mocked(firestore.runTransaction).mockImplementation(async (_db, callback) =>
    callback({
      get: vi.fn(async (path: string) => ({
        exists: () => path in docs,
        data: () => docs[path],
      })),
      update,
    } as never)
  );
  return update;
};

describe('recordChallengeGameCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const finishAsOpponent = (userId: string, score: number) =>
    recordChallengeGameCompletion({ userId, gameId: 'game-id', challengerId: 'player-a', score });

  it('preserves the current status until both participants finish', async () => {
    const update = mockChallenges({
      'challenges/player-a_game-id_player-b': challenge(null, null),
    });
    await finishAsOpponent('player-b', 5);

    expect(update).toHaveBeenCalledWith(
      'challenges/player-a_game-id_player-b',
      expect.objectContaining({
        status: 'active',
        winnerId: null,
        participants: expect.objectContaining({
          'player-a': expect.objectContaining({ score: null, resultSeenAt: null }),
          'player-b': expect.objectContaining({
            score: 5,
            completedAt: 'MOCK_TIMESTAMP',
            resultSeenAt: null,
          }),
        }),
      })
    );
  });

  it('merges scores and computes the winner in the same transaction', async () => {
    const update = mockChallenges({
      'challenges/player-a_game-id_player-b': challenge(8, null),
    });
    await finishAsOpponent('player-b', 5);

    expect(update).toHaveBeenCalledWith(
      'challenges/player-a_game-id_player-b',
      expect.objectContaining({
        status: 'completed',
        winnerId: 'player-a',
        participants: expect.objectContaining({
          'player-a': expect.objectContaining({ score: 8, resultSeenAt: null }),
          'player-b': expect.objectContaining({
            score: 5,
            completedAt: 'MOCK_TIMESTAMP',
            resultSeenAt: 'MOCK_TIMESTAMP',
          }),
        }),
      })
    );
  });

  it('falls back to the legacy one-opponent doc id', async () => {
    const update = mockChallenges({ 'challenges/player-a_game-id': challenge(8, null) });
    await finishAsOpponent('player-b', 5);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(
      'challenges/player-a_game-id',
      expect.objectContaining({ status: 'completed' })
    );
  });

  it('ignores a legacy doc that belongs to a different opponent', async () => {
    const update = mockChallenges({
      'challenges/player-a_game-id': challenge(8, null, 'player-c'),
    });
    await finishAsOpponent('player-b', 5);

    expect(update).not.toHaveBeenCalled();
  });

  it('updates every challenge the challenger sent on the game', async () => {
    const update = mockChallenges({
      'challenges/player-a_game-id_player-b': challenge(null, 4),
      'challenges/player-a_game-id_player-c': challenge(null, null, 'player-c'),
    });
    vi.mocked(firestore.getDocs).mockResolvedValueOnce({
      docs: [{ id: 'player-a_game-id_player-b' }, { id: 'player-a_game-id_player-c' }],
    } as never);

    await recordChallengeGameCompletion({
      userId: 'player-a',
      gameId: 'game-id',
      challengerId: null,
      score: 6,
    });

    expect(firestore.where).toHaveBeenCalledWith('createdBy', '==', 'player-a');
    expect(firestore.where).toHaveBeenCalledWith('gameId', '==', 'game-id');
    expect(update).toHaveBeenCalledWith(
      'challenges/player-a_game-id_player-b',
      expect.objectContaining({ status: 'completed', winnerId: 'player-a' })
    );
    expect(update).toHaveBeenCalledWith(
      'challenges/player-a_game-id_player-c',
      expect.objectContaining({ status: 'active', winnerId: null })
    );
  });
});
