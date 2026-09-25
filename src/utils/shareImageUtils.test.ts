import { describe, expect, it } from 'vitest';
import { GameDoc } from '@/types/firestore';
import { generateEmojiScoreCard } from './shareImageUtils';

describe('shareImageUtils', () => {
  const mockGameSessionWin: GameDoc = {
    userId: 'user123',
    gameId: '1234567890abcdef1234567890abcdef',
    words: { en: 'apple', es: 'queso', fr: 'fruit' },
    difficulties: { en: 'advanced', es: 'advanced', fr: 'advanced' },
    shuffledLanguages: ['en', 'es', 'fr'],
    isLiveGame: false,
    guessHistory: ['arise', 'apple', 'queso', 'fruit'],
    isWin: true,
    score: 420,
    startedAt: {} as any,
    completedAt: {} as any,
  };

  const mockGameSessionLoss: GameDoc = {
    userId: 'user123',
    gameId: '1234567890abcdef1234567890abcdef',
    words: { en: 'apple', es: 'queso', fr: 'fruit' },
    difficulties: { en: 'advanced', es: 'advanced', fr: 'advanced' },
    shuffledLanguages: ['en', 'es', 'fr'],
    isLiveGame: false,
    guessHistory: ['guess', 'arise', 'table', 'chair', 'plant', 'water', 'flame', 'earth'],
    isWin: false,
    score: 80,
    startedAt: {} as any,
    completedAt: {} as any,
  };

  it('generates correct emoji scorecard for a winning game', () => {
    const card = generateEmojiScoreCard({
      gameSession: mockGameSessionWin,
      challengeUrl: 'https://polyglotwordle.web.app/game/123?challenger=user123',
    });

    expect(card).toContain('Polyglot Wordle 4/8 • 420 pts');
    expect(card).toContain('🇬🇧 2/8 🟩🟩🟩🟩🟩');
    expect(card).toContain('🇪🇸 3/8 🟩🟩🟩🟩🟩');
    expect(card).toContain('🇫🇷 4/8 🟩🟩🟩🟩🟩');
    expect(card).toContain(
      'Can you beat my score? https://polyglotwordle.web.app/game/123?challenger=user123'
    );
  });

  it('generates correct emoji scorecard for an unsolved game', () => {
    const card = generateEmojiScoreCard({
      gameSession: mockGameSessionLoss,
      challengeUrl: 'https://polyglotwordle.web.app/game/123?challenger=user123',
    });

    expect(card).toContain('Polyglot Wordle 0/3 Solved (8/8) • 80 pts');
    expect(card).toContain('🇬🇧 X/8');
    expect(card).toContain('🇪🇸 X/8');
    expect(card).toContain('🇫🇷 X/8');
  });

  it('generates correct partial win scorecard', () => {
    const partialSession: GameDoc = {
      ...mockGameSessionLoss,
      guessHistory: [
        'apple', // solves en
        'guess',
        'table',
        'chair',
        'plant',
        'water',
        'flame',
        'earth',
      ],
      score: 180,
    };

    const card = generateEmojiScoreCard({
      gameSession: partialSession,
      challengeUrl: 'https://polyglotwordle.web.app/game/123',
    });

    expect(card).toContain('Polyglot Wordle 1/3 Solved (8/8) • 180 pts');
    expect(card).toContain('🇬🇧 1/8 🟩🟩🟩🟩🟩');
    expect(card).toContain('🇪🇸 X/8');
    expect(card).toContain('🇫🇷 X/8');
  });

  it('counts and lists all boards in an extended game', () => {
    const card = generateEmojiScoreCard({
      gameSession: {
        ...mockGameSessionLoss,
        words: { ...mockGameSessionLoss.words, it: 'pasta', pt: 'praia' },
        shuffledLanguages: ['en', 'es', 'fr', 'it', 'pt'],
      },
      challengeUrl: 'https://polyglotwordle.web.app/game/example',
    });
    expect(card).toContain('0/5 Solved');
    expect(card).toContain('🇮🇹 X/8');
    expect(card).toContain('🇵🇹 X/8');
  });
});
