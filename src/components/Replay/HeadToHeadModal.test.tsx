import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { getDoc, Timestamp } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import type { GameDoc } from '@/types/firestore';
import { calculateScoreFromHistory } from '@/utils/wordUtils';
import { HeadToHeadModal } from './HeadToHeadModal';
import { TurnDuel } from './TurnDuel';

// Show final standings without waiting for replay animations.
vi.mock('@/hooks/useReplay', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useReplay')>();
  return {
    useReplay: (guesses: string[]) => actual.useReplay(guesses, { startAt: 'end' }),
  };
});

const game: GameDoc = {
  userId: 'me',
  gameId: 'puzzle',
  words: { en: 'apple', es: 'rubia', fr: 'merci' },
  difficulties: {},
  shuffledLanguages: ['en', 'es', 'fr'],
  guessHistory: ['apple', 'rubia', 'merci'],
  isLiveGame: false,
  isWin: true,
  score: 0,
  startedAt: Timestamp.fromMillis(0),
  completedAt: Timestamp.fromMillis(1),
  scoringVersion: 2,
};

function renderGames(games: (GameDoc | null)[]) {
  for (const data of games) {
    vi.mocked(getDoc).mockResolvedValueOnce({
      exists: () => data !== null,
      data: () => data,
    } as unknown as Awaited<ReturnType<typeof getDoc>>);
  }
  return render(
    <MantineProvider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <HeadToHeadModal
          opened
          onClose={() => {}}
          gameId="puzzle"
          sides={[
            { userId: 'me', name: 'You' },
            { userId: 'friend', name: 'Friend' },
          ]}
        />
      </QueryClientProvider>
    </MantineProvider>
  );
}

beforeEach(() => vi.mocked(getDoc).mockClear());

it.each([0, 1, 3])('renders nothing with %i duel players', (count) => {
  const { container } = render(
    <MantineProvider withGlobalClasses={false} withCssVariables={false}>
      <TurnDuel
        words={game.words}
        languages={game.shuffledLanguages}
        scoringVersion={2}
        players={Array.from({ length: count }, (_, i) => ({
          id: String(i),
          name: `Player ${i}`,
          color: 'blue',
          guesses: game.guessHistory,
        }))}
      />
    </MantineProvider>
  );
  expect(container).toBeEmptyDOMElement();
});

describe('head-to-head game loading', () => {
  it.each([
    [null, game],
    [game, null],
    [null, null],
  ])('shows a load error if either game is missing (%#)', async (first, second) => {
    renderGames([first, second]);
    expect(await screen.findByText('Couldn’t load this game.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Replay' })).not.toBeInTheDocument();
  });

  it.each([1, undefined])('scores each fetched game with its own version (%s)', async (version) => {
    renderGames([game, { ...game, userId: 'friend', scoringVersion: version }]);
    const modern = calculateScoreFromHistory(game.guessHistory, game.words, 2);
    const legacy = calculateScoreFromHistory(game.guessHistory, game.words, 1);
    expect(modern).not.toBe(legacy);
    expect(await screen.findByText(String(modern))).toBeInTheDocument();
    expect(screen.getByText(String(legacy))).toBeInTheDocument();
    expect(screen.queryByText('Couldn’t load this game.')).not.toBeInTheDocument();
  });
});

it('uses the shared scoring version when a player has no version', () => {
  render(
    <MantineProvider>
      <TurnDuel
        words={game.words}
        languages={game.shuffledLanguages}
        scoringVersion={2}
        players={[
          { id: 'me', name: 'You', color: 'blue', guesses: game.guessHistory },
          {
            id: 'friend',
            name: 'Friend',
            color: 'orange',
            guesses: game.guessHistory,
            scoringVersion: 1,
          },
        ]}
      />
    </MantineProvider>
  );
  for (const version of [1, 2]) {
    expect(
      screen.getByText(String(calculateScoreFromHistory(game.guessHistory, game.words, version)))
    ).toBeInTheDocument();
  }
});
