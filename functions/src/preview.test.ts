import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { buildBoards, guessStatuses } from './grid.js';
import { gameIdFromPath, imageIdsFromPath, injectPreviewMeta, isValidUid } from './meta.js';
import { HEIGHT, renderBoardsPng, WIDTH } from './renderPng.js';

const game = {
  words: { en: 'apple', es: 'queso', fr: 'fruit' },
  shuffledLanguages: ['fr', 'en', 'es'],
  guessHistory: ['arise', 'apple', 'queso', 'fruit'],
  score: 420,
};

describe('buildBoards', () => {
  it('builds an 8×5 grid per board in board order, empty after each solve', () => {
    const boards = buildBoards(game);
    expect(boards).toHaveLength(3);
    expect(boards.every((b) => b.length === 8 && b.every((r) => r.length === 5))).toBe(true);
    // en (board 2) is solved on turn 2, so turn 3 onward is empty.
    expect(boards[1][1]).toEqual(Array(5).fill('correct'));
    expect(boards[1][2]).toEqual(Array(5).fill('empty'));
    // fr (board 1) is solved on turn 4.
    expect(boards[0][3]).toEqual(Array(5).fill('correct'));
    expect(boards[0][4]).toEqual(Array(5).fill('empty'));
  });

  it('matches accents and case like the app', () => {
    expect(guessStatuses('sueno', 'Sueño')).toEqual(Array(5).fill('correct'));
    expect(guessStatuses('speed', 'abide')).toEqual([
      'absent',
      'absent',
      'present',
      'absent',
      'present',
    ]);
  });
});

describe('renderBoardsPng', () => {
  it('renders a 1200×630 PNG with the tile colors', () => {
    const png = PNG.sync.read(renderBoardsPng(buildBoards(game)));
    expect(png.width).toBe(WIDTH);
    expect(png.height).toBe(HEIGHT);
    const pixels = new Set<string>();
    for (let i = 0; i < png.data.length; i += 4 * 97) {
      pixels.add(png.data.slice(i, i + 3).join(','));
    }
    expect(pixels.has('47,158,68')).toBe(true);
  });
});

describe('meta', () => {
  const html = `<head>
    <meta property="og:title" content="Polyglot Wordle" />
    <meta
      property="og:image"
      content="https://polyglot-wordle.web.app/og-image.png"
    />
    <meta name="twitter:image" content="https://polyglot-wordle.web.app/og-image.png" />
    <meta name="description" content="keep me" />
  </head>`;

  it('replaces preview tags and adds og:url, leaving other tags alone', () => {
    const out = injectPreviewMeta(html, {
      title: 'Can you beat 420 pts?',
      description: 'd',
      image: 'https://x/og/u/g.png',
      url: 'https://x/game/en-es-fr/g?challenger=u&a="b"',
    });
    expect(out).toContain('property="og:title" content="Can you beat 420 pts?"');
    expect(out).toMatch(/property="og:image"\s+content="https:\/\/x\/og\/u\/g.png"/);
    expect(out).toContain('name="twitter:image" content="https://x/og/u/g.png"');
    expect(out).toContain('name="description" content="keep me"');
    expect(out).toContain('content="https://x/game/en-es-fr/g?challenger=u&amp;a=&quot;b&quot;"');
  });

  it('parses game and image paths', () => {
    const id = '31393401d8fa47ffa9e61ce3aaaf041v';
    expect(gameIdFromPath(`/game/en-es-pt/${id}`)).toBe(id);
    expect(gameIdFromPath(`/game/${id}`)).toBe(id);
    expect(gameIdFromPath('/game/en-es-pt/../secret')).toBeNull();
    expect(imageIdsFromPath(`/og/abcUID123/${id}.png`)).toEqual({ uid: 'abcUID123', gameId: id });
    expect(imageIdsFromPath(`/og/a/b/${id}.png`)).toBeNull();
    expect(isValidUid('abc123')).toBe(true);
    expect(isValidUid('abc/123')).toBe(false);
  });
});
