import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { MantineProvider } from '@mantine/core';
import { VocabularyTab } from './VocabularyTab';

vi.mock('@/hooks/useVocabulary', () => ({
  useVocabulary: () => ({
    vocabulary: { en: {}, es: {}, fr: {}, it: {}, pt: {} },
    counts: { en: 0, es: 0, fr: 0, it: 0, pt: 0 },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({}) }))
  );
});

it('shows a card for every language', async () => {
  render(
    <MemoryRouter>
      <MantineProvider>
        <VocabularyTab profileUserId="me" />
      </MantineProvider>
    </MemoryRouter>
  );

  for (const name of ['English', 'Spanish', 'French', 'Italian', 'Portuguese']) {
    expect(await screen.findByRole('button', { name: new RegExp(name) })).toBeInTheDocument();
  }
});
