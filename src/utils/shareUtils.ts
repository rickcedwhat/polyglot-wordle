import i18n, { shareLanguage } from '@/i18n';
import type { GameDoc, Language } from '@/types/firestore';
import { flagFor, gamePath, languagesFromGame } from '@/utils/languages';
import { rememberSharedInvite } from './sharedInviteUtils';
import { showToast } from './toast';

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
  return [
    `${flags} • ${i18n.t('postGame.pts', { score: gameSession.score ?? 0 })}`,
    i18n.t('postGame.shareText'),
    challengeUrl,
  ].join('\n');
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
    { challenger: currentUserId, lang: shareLanguage() }
  )}`;
  const text = buildShareText({ gameSession, challengeUrl });

  await shareChallengeLink({
    gameId: gameSession.gameId,
    languages: languagesFromGame(gameSession),
    currentUserId,
    text,
    onCopied,
  });
};

/** Share/copy first to preserve mobile user activation; save only after successful transport. */
export const shareChallengeLink = async ({
  gameId,
  languages,
  currentUserId,
  text,
  onCopied,
  copyOnly = false,
}: {
  gameId: string;
  languages: Language[];
  currentUserId?: string;
  text?: string;
  onCopied?: () => void;
  copyOnly?: boolean;
}): Promise<void> => {
  const url = `${window.location.origin}${gamePath(gameId, languages, { challenger: currentUserId, lang: shareLanguage() })}`;
  let shared = false;
  if (!copyOnly && typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: text ?? url });
      shared = true;
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        return;
      }
    }
  }
  if (!shared) {
    await navigator.clipboard.writeText(text ?? url);
    onCopied?.();
  }
  if (currentUserId) {
    try {
      await rememberSharedInvite(currentUserId, gameId, languages);
    } catch {
      showToast(
        { message: i18n.t('sharedInvites.saveFailed'), color: 'orange' },
        { immediate: true }
      );
    }
  }
};
