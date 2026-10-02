import { GameDoc } from '@/types/firestore';
import { flagFor, gamePath, languagesFromGame } from '@/utils/languages';
import { getGuessStatuses, LetterStatus, normalizeWord } from '@/utils/wordUtils';

const MAX_GUESSES = 8;
const WORD_LENGTH = 5;
const BOARD_GUTTER = '  ';

const SQUARES: Record<LetterStatus | 'empty', string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
  unknown: '⬛',
  empty: '⬛',
};

export interface ShareTextOptions {
  gameSession: Pick<GameDoc, 'words' | 'guessHistory' | 'score' | 'shuffledLanguages'>;
  challengeUrl: string;
}

/**
 * Wordle-style share text: a full 8-row grid per board, boards side by side in board order.
 * The flags line is alphabetical so it never reveals which board is which language.
 */
export const buildShareText = ({ gameSession, challengeUrl }: ShareTextOptions): string => {
  const { words, guessHistory, score } = gameSession;
  const languages = languagesFromGame(gameSession);
  const guesses = guessHistory.map(normalizeWord);

  const boards = languages.map((lang) => {
    const solution = words[lang]!;
    const solvedTurn = guesses.indexOf(normalizeWord(solution));
    return Array.from({ length: MAX_GUESSES }, (_, row) => {
      const guess = guessHistory[row];
      const isAfterSolve = solvedTurn !== -1 && row > solvedTurn;
      if (!guess || isAfterSolve) {
        return SQUARES.empty.repeat(WORD_LENGTH);
      }
      return getGuessStatuses(guess, solution)
        .map((status) => SQUARES[status])
        .join('');
    });
  });

  const rows = Array.from({ length: MAX_GUESSES }, (_, row) =>
    boards.map((board) => board[row]).join(BOARD_GUTTER)
  );
  const flags = [...languages].sort().map(flagFor).join(' ');

  return [
    `Polyglot Wordle • ${score ?? 0} pts`,
    flags,
    ...rows,
    'Can you beat me?',
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
