import { GameDoc } from '@/types/firestore';
import { gamePath, LANGUAGE_META, languagesFromGame } from '@/utils/languages';
import { getGuessStatuses, LetterStatus, normalizeWord } from '@/utils/wordUtils';

export interface SocialShareCardOptions {
  gameSession: GameDoc;
  challengerName?: string;
}

export interface EmojiScoreCardOptions {
  gameSession: GameDoc;
  challengeUrl: string;
}

/**
 * Generates a standard Wordle-style emoji scorecard text block.
 */
export const generateEmojiScoreCard = ({
  gameSession,
  challengeUrl,
}: EmojiScoreCardOptions): string => {
  const { words, guessHistory, score, isWin } = gameSession;
  const languages = languagesFromGame(gameSession);
  const maxGuesses = 8;
  const turnsTaken = guessHistory.length;

  const solvedLangs = languages.filter((lang) =>
    guessHistory.map(normalizeWord).includes(normalizeWord(words[lang]!))
  );
  const solvedCount = solvedLangs.length;

  const header = isWin
    ? `Polyglot Wordle ${turnsTaken}/${maxGuesses} • ${score ?? 0} pts`
    : `Polyglot Wordle ${solvedCount}/${languages.length} Solved (${turnsTaken}/${maxGuesses}) • ${score ?? 0} pts`;

  const boardLines = languages.map((lang) => {
    const meta = LANGUAGE_META[lang];
    const normSolution = normalizeWord(words[lang]!);
    const solvedTurn = guessHistory.map(normalizeWord).indexOf(normSolution);

    if (solvedTurn !== -1) {
      return `${meta.flag} ${solvedTurn + 1}/${maxGuesses} 🟩🟩🟩🟩🟩`;
    }

    // For unsolved, show status of the final guess if available
    const lastGuess = guessHistory[guessHistory.length - 1];
    if (lastGuess) {
      const statuses = getGuessStatuses(lastGuess, words[lang]!);
      const emojis = statuses
        .map((s) => {
          if (s === 'correct') {
            return '🟩';
          }
          if (s === 'present') {
            return '🟨';
          }
          return '⬛';
        })
        .join('');
      return `${meta.flag} X/${maxGuesses} ${emojis}`;
    }

    return `${meta.flag} X/${maxGuesses} ⬛⬛⬛⬛⬛`;
  });

  return `${header}\n\n${boardLines.join('\n')}\n\nCan you beat my score? ${challengeUrl}`;
};

/**
 * Helper to draw a rounded rectangle on a canvas 2D context.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Renders the spoiler-free graphic card onto an off-screen HTML5 Canvas (1200x630).
 * Tile statuses:
 *  - correct: #2f9e44 (green)
 *  - present: #f59f00 (yellow)
 *  - absent:  #373a40 (slate gray)
 *  - empty:   #1a1b1e with border
 */
export const generateSocialShareCanvas = (options: SocialShareCardOptions): HTMLCanvasElement => {
  const { gameSession, challengerName } = options;
  const { words, guessHistory, score, isWin } = gameSession;

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not supported');
  }

  // 1. Background
  const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
  bgGrad.addColorStop(0, '#090a0f');
  bgGrad.addColorStop(0.5, '#101114');
  bgGrad.addColorStop(1, '#0c0d12');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1200, 630);

  // Decorative subtle ambient glow
  const glowGrad1 = ctx.createRadialGradient(150, 120, 10, 150, 120, 450);
  glowGrad1.addColorStop(0, 'rgba(47, 158, 68, 0.12)');
  glowGrad1.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad1;
  ctx.fillRect(0, 0, 1200, 630);

  const glowGrad2 = ctx.createRadialGradient(1050, 500, 10, 1050, 500, 450);
  glowGrad2.addColorStop(0, 'rgba(34, 139, 230, 0.12)');
  glowGrad2.addColorStop(1, 'transparent');
  ctx.fillStyle = glowGrad2;
  ctx.fillRect(0, 0, 1200, 630);

  // Border frame
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 16, 16, 1168, 598, 20);
  ctx.stroke();

  // 2. Header
  // Logo & Title
  ctx.font = '900 32px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('POLYGLOT WORDLE', 50, 72);

  const languages = languagesFromGame(gameSession);

  // Board count badge
  ctx.fillStyle = '#2f9e44';
  drawRoundedRect(ctx, 420, 48, 80, 28, 14);
  ctx.fill();
  ctx.font = '800 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#000000';
  ctx.fillText(`${languages.length} BOARDS`, 431, 67);

  // Subtitle / Challenger info
  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#868e96';
  const subtitle = challengerName
    ? `Challenge against ${challengerName}`
    : languages.map((l) => LANGUAGE_META[l].name).join(' • ');
  ctx.fillText(subtitle, 50, 102);

  // Right Header: Score & Turns Badge
  const maxGuesses = 8;
  const turnsTaken = guessHistory.length;
  const solvedLangs = languages.filter((lang) =>
    guessHistory.map(normalizeWord).includes(normalizeWord(words[lang]!))
  );

  ctx.textAlign = 'right';
  ctx.font = '900 36px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffd43b';
  ctx.fillText(`${score ?? 0} PTS`, 1150, 72);

  ctx.font = '700 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = isWin ? '#69db7c' : '#adb5bd';
  const summaryStatus = isWin
    ? `🎉 Solved ${languages.length}/${languages.length} in ${turnsTaken}/${maxGuesses} turns`
    : `❌ ${solvedLangs.length}/${languages.length} Solved in ${turnsTaken}/${maxGuesses} turns`;
  ctx.fillText(summaryStatus, 1150, 102);
  ctx.textAlign = 'left'; // Reset

  // Header separator
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(50, 124);
  ctx.lineTo(1150, 124);
  ctx.stroke();

  // 3. Boards Side-by-Side
  const gapX = languages.length === 3 ? 40 : 20;
  const boardWidth = (1100 - gapX * (languages.length - 1)) / languages.length;
  const boardHeight = 400;
  const boardStartY = 144;
  const startX = 50;

  languages.forEach((lang, boardIndex) => {
    const bx = startX + boardIndex * (boardWidth + gapX);
    const by = boardStartY;
    const meta = LANGUAGE_META[lang];
    const normSolution = normalizeWord(words[lang]!);
    const solvedTurn = guessHistory.map(normalizeWord).indexOf(normSolution);
    const isLangSolved = solvedTurn !== -1;

    // Board container card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    drawRoundedRect(ctx, bx, by, boardWidth, boardHeight, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, bx, by, boardWidth, boardHeight, 14);
    ctx.stroke();

    // Board Header: Flag + Language Name
    ctx.font = `${languages.length > 3 ? 13 : 18}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${meta.flag}  ${meta.name.toUpperCase()}`, bx + 18, by + 34);

    // Tiles Grid: 8 rows of 5 tiles
    const tileW = Math.min(44, (boardWidth - 36 - 4 * 5) / 5);
    const tileH = 30;
    const tileGap = 5;
    const gridStartX = bx + (boardWidth - (5 * tileW + 4 * tileGap)) / 2;
    const gridStartY = by + 50;

    for (let row = 0; row < maxGuesses; row++) {
      const ry = gridStartY + row * (tileH + tileGap);
      const guess = guessHistory[row];

      // If this board was already solved on an earlier turn, subsequent rows are empty
      const isPastSolve = isLangSolved && row > solvedTurn;

      let statuses: (LetterStatus | 'empty')[] = Array(5).fill('empty');
      if (guess && !isPastSolve) {
        statuses = getGuessStatuses(guess, words[lang]!);
      }

      for (let col = 0; col < 5; col++) {
        const tx = gridStartX + col * (tileW + tileGap);
        const status = statuses[col];

        if (status === 'correct') {
          ctx.fillStyle = '#2f9e44';
          drawRoundedRect(ctx, tx, ry, tileW, tileH, 5);
          ctx.fill();
        } else if (status === 'present') {
          ctx.fillStyle = '#f59f00';
          drawRoundedRect(ctx, tx, ry, tileW, tileH, 5);
          ctx.fill();
        } else if (status === 'absent') {
          ctx.fillStyle = '#373a40';
          drawRoundedRect(ctx, tx, ry, tileW, tileH, 5);
          ctx.fill();
        } else {
          // Empty tile
          ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
          drawRoundedRect(ctx, tx, ry, tileW, tileH, 5);
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
          ctx.lineWidth = 1;
          drawRoundedRect(ctx, tx, ry, tileW, tileH, 5);
          ctx.stroke();
        }
      }
    }

    // Board Footer status
    ctx.textAlign = 'center';
    ctx.font = '700 13px system-ui, -apple-system, sans-serif';
    if (isLangSolved) {
      ctx.fillStyle = '#69db7c';
      ctx.fillText(`SOLVED ON TURN ${solvedTurn + 1}`, bx + boardWidth / 2, by + boardHeight - 16);
    } else {
      ctx.fillStyle = '#ff8787';
      ctx.fillText('UNSOLVED', bx + boardWidth / 2, by + boardHeight - 16);
    }
    ctx.textAlign = 'left'; // Reset
  });

  // 4. Card Footer
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.moveTo(50, 560);
  ctx.lineTo(1150, 560);
  ctx.stroke();

  ctx.font = '600 15px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#adb5bd';
  ctx.fillText('Can you beat this score?', 50, 592);

  ctx.font = '700 15px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#339af0';
  ctx.fillText('Play this challenge at polyglotwordle.web.app', 230, 592);

  return canvas;
};

/**
 * Returns a PNG Blob of the social share card.
 */
export const generateSocialShareBlob = (options: SocialShareCardOptions): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = generateSocialShareCanvas(options);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
};

export interface ShareGameResultParams {
  gameSession: GameDoc;
  currentUserId?: string;
  challengerName?: string;
  onSuccess?: () => void;
  onFallbackCopied?: () => void;
}

/**
 * Executes native sharing with image file via Web Share API when supported,
 * or copies the challenge link & emoji card to clipboard as a fallback.
 */
export const shareGameResult = async ({
  gameSession,
  currentUserId,
  challengerName,
  onSuccess,
  onFallbackCopied,
}: ShareGameResultParams): Promise<void> => {
  const origin = window.location.origin;
  const challengeUrl = `${origin}${gamePath(
    gameSession.gameId,
    languagesFromGame(gameSession),
    currentUserId ? { challenger: currentUserId } : undefined
  )}`;

  const emojiText = generateEmojiScoreCard({ gameSession, challengeUrl });

  // 1. Attempt image generation and native Web Share with file attachment
  try {
    const blob = await generateSocialShareBlob({ gameSession, challengerName });
    const file = new File([blob], 'polyglot-wordle-challenge.png', {
      type: 'image/png',
    });

    if (typeof navigator !== 'undefined' && navigator.share) {
      const shareData: ShareData = {
        title: 'Polyglot Wordle Challenge',
        text: `Can you beat my score of ${gameSession.score ?? 0} pts in Polyglot Wordle?`,
        url: challengeUrl,
      };
      if (navigator.canShare?.({ files: [file] })) {
        shareData.files = [file];
      }
      await navigator.share(shareData);
      onSuccess?.();
      return;
    }
  } catch (e) {
    // If user cancelled native share sheet or canvas generation failed, don't crash
    if ((e as Error)?.name === 'AbortError') {
      return;
    }
    // eslint-disable-next-line no-console
    console.warn('Native image share not available, falling back to clipboard copy:', e);
  }

  // 2. Fallback: Copy emoji scorecard + challenge URL to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(emojiText);
    onFallbackCopied?.();
  }
};
