import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameDoc } from '@/types/firestore';
import { rememberSharedInvite } from './sharedInviteUtils';
import { buildShareText, shareChallengeLink, shareGameResult } from './shareUtils';
import { showToast } from './toast';

const URL = 'https://polyglot-wordle.web.app/game/en-es-fr/abc?challenger=user123';

describe('buildShareText', () => {
  it('is alphabetical flags with the score, the prompt, then the link', () => {
    const text = buildShareText({
      gameSession: {
        words: { en: 'apple', es: 'queso', fr: 'fruit' },
        shuffledLanguages: ['fr', 'en', 'es'],
        score: 420,
      },
      challengeUrl: URL,
    });
    expect(text).toBe(`🇬🇧 🇪🇸 🇫🇷 • 420 pts\nCan you beat me?\n${URL}`);
  });

  it('lists every language in extended games', () => {
    const text = buildShareText({
      gameSession: {
        words: { en: 'apple', es: 'queso', fr: 'fruit', it: 'pasta', pt: 'praia' },
        shuffledLanguages: ['pt', 'en', 'it', 'fr', 'es'],
        score: 0,
      },
      challengeUrl: URL,
    });
    expect(text.split('\n')[0]).toBe('🇬🇧 🇪🇸 🇫🇷 🇮🇹 🇵🇹 • 0 pts');
  });
});

vi.mock('./sharedInviteUtils', () => ({
  rememberSharedInvite: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('./toast', () => ({ showToast: vi.fn() }));
const game = {
  gameId: 'puzzle',
  userId: 'me',
  words: { en: 'apple', es: 'queso', fr: 'fruit' },
  shuffledLanguages: ['en', 'es', 'fr'],
  score: 420,
} as GameDoc;
const copy = vi.fn();
const nativeShare = vi.fn();
beforeEach(() => {
  vi.mocked(rememberSharedInvite).mockReset().mockResolvedValue(undefined);
  vi.mocked(showToast).mockClear();
  copy.mockReset().mockResolvedValue(undefined);
  nativeShare.mockReset().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
  Object.defineProperty(navigator, 'share', { configurable: true, value: nativeShare });
});
it('records an invitation after a successful native share', async () => {
  await shareGameResult({ gameSession: game, currentUserId: 'me' });
  expect(rememberSharedInvite).toHaveBeenCalledWith('me', 'puzzle', ['en', 'es', 'fr']);
  expect(nativeShare.mock.invocationCallOrder[0]).toBeLessThan(
    vi.mocked(rememberSharedInvite).mock.invocationCallOrder[0]
  );
  expect(copy).not.toHaveBeenCalled();
});
it('creates nothing when the share sheet is cancelled', async () => {
  nativeShare.mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
  await shareGameResult({ gameSession: game, currentUserId: 'me' });
  expect(rememberSharedInvite).not.toHaveBeenCalled();
  expect(copy).not.toHaveBeenCalled();
});
it('records a copied link and reports copying', async () => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  const onCopied = vi.fn();
  await shareGameResult({ gameSession: game, currentUserId: 'me', onCopied });
  expect(copy).toHaveBeenCalledWith(expect.stringContaining('challenger=me'));
  expect(onCopied).toHaveBeenCalledOnce();
  expect(rememberSharedInvite).toHaveBeenCalledOnce();
});
it('falls back to copying after a non-cancellation share failure', async () => {
  nativeShare.mockRejectedValue(new Error('Not supported'));
  await shareGameResult({ gameSession: game, currentUserId: 'me' });
  expect(copy).toHaveBeenCalledOnce();
  expect(rememberSharedInvite).toHaveBeenCalledOnce();
});
it('does not create an invitation if both sharing and copying fail', async () => {
  nativeShare.mockRejectedValue(new Error('Not supported'));
  copy.mockRejectedValue(new Error('Clipboard denied'));
  await expect(shareGameResult({ gameSession: game, currentUserId: 'me' })).rejects.toThrow(
    'Clipboard denied'
  );
  expect(rememberSharedInvite).not.toHaveBeenCalled();
});
it('warns about tracking failure without claiming that the successful share failed', async () => {
  vi.mocked(rememberSharedInvite).mockRejectedValue(new Error('Offline'));
  await expect(
    shareGameResult({ gameSession: game, currentUserId: 'me' })
  ).resolves.toBeUndefined();
  expect(nativeShare).toHaveBeenCalledOnce();
  expect(copy).not.toHaveBeenCalled();
  expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ color: 'orange' }), {
    immediate: true,
  });
});

it('reports copying while invitation tracking is still pending', async () => {
  let finishTracking!: () => void;
  const tracking = new Promise<void>((resolve) => {
    finishTracking = resolve;
  });
  vi.mocked(rememberSharedInvite).mockReturnValue(tracking);
  const onCopied = vi.fn();
  const sharing = shareChallengeLink({
    gameId: game.gameId,
    languages: ['en', 'es', 'fr'],
    currentUserId: 'me',
    copyOnly: true,
    onCopied,
  });
  await Promise.resolve();
  expect(onCopied).toHaveBeenCalledOnce();
  expect(rememberSharedInvite).toHaveBeenCalledOnce();
  finishTracking();
  await sharing;
});
