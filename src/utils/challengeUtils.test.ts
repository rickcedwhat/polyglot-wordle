import * as firestore from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChallengeDoc } from '@/types/firestore';
import { recordChallengeGameCompletion } from './challengeUtils';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    doc: vi.fn((_db, collection, id) => `${collection}/${id}`),
    getFirestore: vi.fn(() => 'db'),
    runTransaction: vi.fn(),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  };
});

const challenge = (firstScore: number | null, secondScore: number | null): ChallengeDoc => ({
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
    'player-b': {
      displayName: 'Player B',
      photoURL: '',
      score: secondScore,
      rsvp: 'accepted',
      completedAt: null,
      resultSeenAt: null,
    },
  },
  participantIds: ['player-a', 'player-b'],
  winnerId: null,
});

describe('recordChallengeGameCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const runWithChallenge = async (data: ChallengeDoc, userId: string, score: number) => {
    const update = vi.fn();
    vi.mocked(firestore.runTransaction).mockImplementationOnce(async (_db, callback) =>
      callback({
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => data }),
        update,
      } as never)
    );

    await recordChallengeGameCompletion({
      userId,
      gameId: 'game-id',
      challengerId: 'player-a',
      score,
    });

    return update;
  };

  it('preserves the current status until both participants finish', async () => {
    const update = await runWithChallenge(challenge(null, null), 'player-b', 5);

    expect(update).toHaveBeenCalledWith(
      'challenges/player-a_game-id',
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
    const update = await runWithChallenge(challenge(8, null), 'player-b', 5);

    expect(update).toHaveBeenCalledWith(
      'challenges/player-a_game-id',
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
});
