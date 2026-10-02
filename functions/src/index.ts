import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { buildBoards, type GameData } from './grid.js';
import { gameIdFromPath, imageIdsFromPath, injectPreviewMeta, isValidUid } from './meta.js';
import { renderBoardsPng } from './renderPng.js';

initializeApp();

const ALLOWED_HOSTS = new Set(['polyglot-wordle.web.app', 'polyglot-wordle.firebaseapp.com']);
const DEFAULT_HOST = 'polyglot-wordle.web.app';
const INDEX_TTL_MS = 60_000;
const SHARED_CACHE = 'public, max-age=0, s-maxage=300';
/** Fallback pages must not be CDN-cached, or a transient lookup failure sticks for that URL. */
const NO_SHARED_CACHE = 'no-cache';

let indexCache: { host: string; html: string; at: number } | null = null;

const siteHost = (forwarded: string | undefined) => {
  const host = forwarded?.split(',')[0]?.trim();
  return host && ALLOWED_HOSTS.has(host) ? host : DEFAULT_HOST;
};

/** The deployed index.html (a static file, so Hosting serves it without hitting this function). */
const loadIndexHtml = async (host: string): Promise<string> => {
  if (indexCache && indexCache.host === host && Date.now() - indexCache.at < INDEX_TTL_MS) {
    return indexCache.html;
  }
  const res = await fetch(`https://${host}/index.html`, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    throw new Error(`index.html fetch failed: ${res.status}`);
  }
  const html = await res.text();
  indexCache = { host, html, at: Date.now() };
  return html;
};

const loadGame = async (uid: string, gameId: string): Promise<GameData | null> => {
  const snap = await getFirestore().doc(`games/${uid}_${gameId}`).get();
  const data = snap.data();
  if (!data || !Array.isArray(data.guessHistory) || data.guessHistory.length === 0 || !data.words) {
    return null;
  }
  return data as GameData;
};

export const gamePreview = onRequest(
  { region: 'us-central1', memory: '256MiB', maxInstances: 10, concurrency: 40 },
  async (req, res) => {
    const host = siteHost(req.get('x-forwarded-host'));

    const imageIds = imageIdsFromPath(req.path);
    if (imageIds) {
      try {
        const game = await loadGame(imageIds.uid, imageIds.gameId);
        if (!game) {
          res.redirect(302, '/og-image.png');
          return;
        }
        res.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');
        res.type('png').send(renderBoardsPng(buildBoards(game)));
      } catch (err) {
        logger.error('preview image failed', err);
        res.redirect(302, '/og-image.png');
      }
      return;
    }

    let html: string;
    try {
      html = await loadIndexHtml(host);
    } catch (err) {
      logger.error('index.html unavailable', err);
      res.status(502).send('Temporarily unavailable, please refresh.');
      return;
    }

    const gameId = gameIdFromPath(req.path);
    const challenger = typeof req.query.challenger === 'string' ? req.query.challenger : '';
    if (!gameId || !isValidUid(challenger)) {
      res.set('Cache-Control', SHARED_CACHE).type('html').send(html);
      return;
    }

    try {
      const game = await loadGame(challenger, gameId);
      if (!game) {
        res.set('Cache-Control', NO_SHARED_CACHE).type('html').send(html);
        return;
      }
      res.set('Cache-Control', SHARED_CACHE);
      res.type('html').send(
        injectPreviewMeta(html, {
          title: `Can you beat ${game.score ?? 0} pts?`,
          description: 'Polyglot Wordle: one guess, three languages.',
          image: `https://${host}/og/${challenger}/${gameId}.png`,
          url: `https://${host}${req.originalUrl}`,
        })
      );
    } catch (err) {
      logger.error('preview meta failed', err);
      res.set('Cache-Control', NO_SHARED_CACHE).type('html').send(html);
    }
  }
);
