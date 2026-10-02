import { PNG } from 'pngjs';
import type { TileStatus } from './grid.js';

export const WIDTH = 1200;
export const HEIGHT = 630;

type Rgb = [number, number, number];

const BACKGROUND: Rgb = [18, 19, 22];
const COLORS: Record<TileStatus, Rgb> = {
  correct: [47, 158, 68],
  present: [245, 159, 0],
  absent: [72, 76, 84],
  empty: [34, 36, 41],
};

/** Coverage (0–1) of pixel (px, py) inside a rounded rect, for anti-aliased corners. */
const coverage = (px: number, py: number, x: number, y: number, size: number, r: number) => {
  const cx = Math.min(Math.max(px + 0.5, x + r), x + size - r);
  const cy = Math.min(Math.max(py + 0.5, y + r), y + size - r);
  const d = Math.hypot(px + 0.5 - cx, py + 0.5 - cy);
  return Math.min(Math.max(r - d + 0.5, 0), 1);
};

/** Draws boards side by side (board order, no labels) on a 1200×630 link-preview PNG. */
export const renderBoardsPng = (boards: TileStatus[][][]): Buffer => {
  const png = new PNG({ width: WIDTH, height: HEIGHT });
  const { data } = png;
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    data.set([...BACKGROUND, 255], i * 4);
  }

  const n = Math.max(boards.length, 1);
  const rows = boards[0]?.length ?? 8;
  const cols = boards[0]?.[0]?.length ?? 5;
  // Tile gap = 12% of a tile, board gap = 70% of a tile.
  const unitsWide = n * (cols + (cols - 1) * 0.12) + (n - 1) * 0.7;
  const unitsTall = rows + (rows - 1) * 0.12;
  const tile = Math.floor(Math.min((WIDTH - 120) / unitsWide, (HEIGHT - 80) / unitsTall));
  const gap = Math.round(tile * 0.12);
  const boardGap = Math.round(tile * 0.7);
  const boardWidth = cols * tile + (cols - 1) * gap;
  const totalWidth = n * boardWidth + (n - 1) * boardGap;
  const totalHeight = rows * tile + (rows - 1) * gap;
  const left = Math.floor((WIDTH - totalWidth) / 2);
  const top = Math.floor((HEIGHT - totalHeight) / 2);
  const radius = Math.max(2, Math.round(tile * 0.14));

  boards.forEach((board, b) => {
    board.forEach((row, r) => {
      row.forEach((status, c) => {
        const x = left + b * (boardWidth + boardGap) + c * (tile + gap);
        const y = top + r * (tile + gap);
        const color = COLORS[status];
        for (let py = y; py < y + tile; py++) {
          for (let px = x; px < x + tile; px++) {
            const a = coverage(px, py, x, y, tile, radius);
            if (a === 0) {
              continue;
            }
            const i = (py * WIDTH + px) * 4;
            for (let k = 0; k < 3; k++) {
              data[i + k] = Math.round(color[k] * a + BACKGROUND[k] * (1 - a));
            }
          }
        }
      });
    });
  });

  return PNG.sync.write(png);
};
