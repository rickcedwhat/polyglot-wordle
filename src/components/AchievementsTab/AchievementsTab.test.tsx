import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { AchievementsTab } from './AchievementsTab';

vi.mock('@/hooks/useAchievements', () => ({
  useAchievements: () => ({ achievements: [], isLoading: false }),
}));
vi.mock('@/hooks/useAllGames', () => ({
  useAllGames: () => ({
    data: [{ words: { en: 'apple', es: 'fresa' }, guessHistory: [] }],
    isLoading: false,
  }),
}));
vi.mock('@/hooks/useVocabulary', () => ({
  useVocabulary: () => ({ vocabulary: {}, isLoading: false }),
}));

afterEach(() => vi.unstubAllGlobals());

describe('AchievementsTab dictionary requests', () => {
  it('hides partial counts on failure and shows them after recovery', async () => {
    let fails = true;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: !(fails && url === '/es.json'),
        json: async () => ({}),
      }))
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(
      <QueryClientProvider client={client}>
        <MantineProvider>
          <AchievementsTab profileUserId="test-user" />
        </MantineProvider>
      </QueryClientProvider>
    );

    expect(screen.queryByRole('tab', { name: /Feats/ })).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load achievements');
    expect(client.getQueryData(['dictionary', 'en'])).toEqual({});
    expect(screen.queryByRole('tab', { name: /Feats/ })).not.toBeInTheDocument();

    fails = false;
    await act(async () => {
      await client.refetchQueries({ queryKey: ['dictionary', 'es'] });
    });
    expect(await screen.findByRole('tab', { name: /Feats/ })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    view.unmount();
    client.clear();
  });
});
