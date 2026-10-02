import { GameDoc } from '@/types/firestore';
import { flagFor, gamePath, languagesFromGame } from '@/utils/languages';

export interface ShareTextOptions {
  gameSession: Pick<GameDoc, 'words' | 'score' | 'shuffledLanguages'>;
  challengeUrl: string;
}

/**
 * Short share text. The board grid is shown by the link's preview card (rendered server-side),
 * since emoji grids for multiple boards wrap badly in phone message bubbles.
 * Flags are alphabetical so they never reveal which board is which language.
 */
export const buildShareText = ({ gameSession, challengeUrl }: ShareTextOptions): string => {
  const flags = [...languagesFromGame(gameSession)].sort().map(flagFor).join(' ');
  return [`${flags} • ${gameSession.score ?? 0} pts`, 'Can you beat me?', challengeUrl].join('\n');
};

export interface ShareGameResultParams {
  gameSession: GameDoc;
  currentUserId?: string;
  onCopied?: () => void;
}

/**
 * Opens the native share sheet with the share text (link included in the text, no attachments,
 * since apps drop the text when an image is attached). Falls back to copying to the clipboard.
 */
export const shareGameResult = async ({
  gameSession,
  currentUserId,
  onCopied,
}: ShareGameResultParams): Promise<void> => {
  const challengeUrl = `${window.location.origin}${gamePath(
    gameSession.gameId,
    languagesFromGame(gameSession),
    currentUserId ? { challenger: currentUserId } : undefined
  )}`;
  const text = buildShareText({ gameSession, challengeUrl });

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        return;
      }
      // eslint-disable-next-line no-console
      console.warn('Native share failed, falling back to clipboard copy:', e);
    }
  }

  await navigator.clipboard.writeText(text);
  onCopied?.();
};
