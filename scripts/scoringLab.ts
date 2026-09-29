/**
 * Scoring lab: re-scores saved games under candidate scoring systems and reports metrics,
 * per-game scores and ranks. Read-only; works off a local export from analyzeScores.mjs.
 *
 * Usage:
 *   node scripts/analyzeScores.mjs --out /tmp/pw/games.json
 *   npx vite-node scripts/scoringLab.ts -- /tmp/pw/games.json /tmp/pw/lab.json
 */
import fs from 'node:fs';
import { MAX_GUESSES } from '../src/config';
import {
  calculateScoreFromHistory,
  getGuessStatuses,
  getLatestTurnScoreEvents,
  normalizeWord,
} from '../src/utils/wordUtils';

interface SavedGame {
  id: string;
  score: number;
  isWin: boolean;
  guessHistory: string[];
  words: Record<string, string>;
}

type Component =
  | 'green'
  | 'yellow'
  | 'wordSolved'
  | 'gameSolved'
  | 'penalty'
  | 'crack'
  | 'hatTrick'
  | 'bridge';

/** Normalized 5-letter words per language, used to tell whether a guess is native to a board. */
const DICTS: Record<string, Set<string>> = Object.fromEntries(
  ['en', 'es', 'fr', 'it', 'pt'].map((lang) => [
    lang,
    new Set(
      Object.keys(JSON.parse(fs.readFileSync(`public/${lang}.json`, 'utf8'))).map(normalizeWord)
    ),
  ])
);

interface Variant {
  key: string;
  name: string;
  rules: string[];
  params?: {
    yellowPerM: number;
    crackPerM: number;
    hatTrickPerM: number;
    /** Extra multiplier when every board gets 2+ new greens in one guess. */
    doubleHatTrickFactor: number;
    /** Flat hat-trick points instead of `hatTrickPerM × m`. */
    hatTrickFlat?: number;
    unsolvedPenalty?: number;
    /** Bridge: a guess not valid in a board's language still finds new greens there. Paid per bridged board. */
    bridgeFlat?: number;
    bridgePerM?: number;
    bridgeGreenPerM?: number;
  };
}

/** m = 11 − guess number (10 on guess 1 … 3 on guess 8). */
const mult = (guessNumber: number) => MAX_GUESSES + 3 - guessNumber;

export const VARIANTS: Variant[] = [
  {
    key: 'current',
    name: 'Current',
    rules: [
      'Green 5×m per new slot',
      'Yellow 5, 10, 15… per yellow within a guess, every guess, no m',
      'Word solved 20×m · All solved 25×m · Unsolved −250',
    ],
  },
  {
    key: 'yellowFix',
    name: 'A · Yellow fix',
    rules: ['Yellow 2×m, first time a letter is yellow on a board', 'Everything else as Current'],
    params: { yellowPerM: 2, crackPerM: 0, hatTrickPerM: 0, doubleHatTrickFactor: 1 },
  },
  {
    key: 'crack30',
    name: 'B · Yellow fix + crack',
    rules: ['A', 'Crack bonus 30×m of the guess that solves your first word'],
    params: { yellowPerM: 2, crackPerM: 30, hatTrickPerM: 0, doubleHatTrickFactor: 1 },
  },
  {
    key: 'crack30hat15',
    name: 'C · B + hat trick 15',
    rules: ['B', 'Hat trick 15×m: one guess adds new greens on all three unsolved boards'],
    params: { yellowPerM: 2, crackPerM: 30, hatTrickPerM: 15, doubleHatTrickFactor: 1 },
  },
  {
    key: 'crack20hat25',
    name: 'D · Lighter crack, bigger hat trick',
    rules: ['A', 'Crack 20×m', 'Hat trick 25×m'],
    params: { yellowPerM: 2, crackPerM: 20, hatTrickPerM: 25, doubleHatTrickFactor: 1 },
  },
  {
    key: 'crack40hat15double',
    name: 'E · Steeper crack + double hat trick',
    rules: [
      'Yellow 3×m first-seen',
      'Crack 40×m',
      'Hat trick 15×m, doubled if every board gets 2+ new greens',
    ],
    params: { yellowPerM: 3, crackPerM: 40, hatTrickPerM: 15, doubleHatTrickFactor: 2 },
  },
  {
    key: 'crack30hat15pen350',
    name: 'F · C + penalty −350',
    rules: ['C', 'Unsolved word −350 (was −250) to keep losses below wins'],
    params: {
      yellowPerM: 2,
      crackPerM: 30,
      hatTrickPerM: 15,
      doubleHatTrickFactor: 1,
      unsolvedPenalty: -350,
    },
  },
  {
    key: 'crack30hatFlat75',
    name: 'G · B + flat hat trick 75',
    rules: ['B', 'Hat trick +75 flat (not time-weighted)'],
    params: {
      yellowPerM: 2,
      crackPerM: 30,
      hatTrickPerM: 0,
      doubleHatTrickFactor: 1,
      hatTrickFlat: 75,
    },
  },
  {
    key: 'gBridgeFlat25',
    name: 'H · G + bridge 25 flat',
    rules: ['G', 'Bridge +25 per board where a foreign-language guess finds new greens'],
    params: {
      yellowPerM: 2,
      crackPerM: 30,
      hatTrickPerM: 0,
      doubleHatTrickFactor: 1,
      hatTrickFlat: 75,
      bridgeFlat: 25,
    },
  },
  {
    key: 'gBridge5m',
    name: 'I · G + bridge 5×m',
    rules: ['G', 'Bridge 5×m per bridged board (time-weighted)'],
    params: {
      yellowPerM: 2,
      crackPerM: 30,
      hatTrickPerM: 0,
      doubleHatTrickFactor: 1,
      hatTrickFlat: 75,
      bridgePerM: 5,
    },
  },
  {
    key: 'gBridgeGreens',
    name: 'J · G + foreign greens count double',
    rules: [
      'G',
      'New greens from a guess not valid in that board’s language pay an extra 5×m each',
    ],
    params: {
      yellowPerM: 2,
      crackPerM: 30,
      hatTrickPerM: 0,
      doubleHatTrickFactor: 1,
      hatTrickFlat: 75,
      bridgeGreenPerM: 5,
    },
  },
];

const emptyComponents = (): Record<Component, number> => ({
  green: 0,
  yellow: 0,
  wordSolved: 0,
  gameSolved: 0,
  penalty: 0,
  crack: 0,
  hatTrick: 0,
  bridge: 0,
});

function scoreCurrent(game: SavedGame) {
  const components = emptyComponents();
  for (let n = 1; n <= game.guessHistory.length; n++) {
    for (const event of getLatestTurnScoreEvents(game.guessHistory.slice(0, n), game.words)) {
      components[event.kind] += event.points;
    }
  }
  return {
    total: calculateScoreFromHistory(game.guessHistory, game.words),
    components,
    hatTricks: 0,
    bridges: 0,
  };
}

function scoreVariant(game: SavedGame, p: NonNullable<Variant['params']>) {
  const langs = Object.keys(game.words).filter((lang) => game.words[lang]);
  const components = emptyComponents();
  const greenSlots = Object.fromEntries(langs.map((l) => [l, Array(5).fill(false) as boolean[]]));
  const yellowSeen = Object.fromEntries(langs.map((l) => [l, new Set<string>()]));
  const solvedAt: Record<string, number | null> = Object.fromEntries(langs.map((l) => [l, null]));
  let hatTricks = 0;
  let bridges = 0;

  game.guessHistory.forEach((guess, i) => {
    const n = i + 1;
    const m = mult(n);
    const letters = normalizeWord(guess);
    const openBefore = langs.filter((l) => solvedAt[l] == null);
    const newGreensPerBoard: number[] = [];

    openBefore.forEach((lang) => {
      const statuses = getGuessStatuses(guess, game.words[lang]);
      let fresh = 0;
      statuses.forEach((status, idx) => {
        if (status === 'correct' && !greenSlots[lang][idx]) {
          greenSlots[lang][idx] = true;
          components.green += 5 * m;
          fresh += 1;
        }
        if (status === 'present' && !yellowSeen[lang].has(letters[idx])) {
          yellowSeen[lang].add(letters[idx]);
          components.yellow += p.yellowPerM * m;
        }
      });
      newGreensPerBoard.push(fresh);
      if (fresh > 0 && !DICTS[lang]?.has(letters)) {
        bridges += 1;
        components.bridge +=
          (p.bridgeFlat ?? 0) + (p.bridgePerM ?? 0) * m + (p.bridgeGreenPerM ?? 0) * m * fresh;
      }
      if (letters === normalizeWord(game.words[lang])) {
        solvedAt[lang] = n;
        components.wordSolved += 20 * m;
      }
    });

    const allBoards = openBefore.length === langs.length && langs.length >= 3;
    const hatTrickBase = p.hatTrickFlat ?? p.hatTrickPerM * m;
    if (hatTrickBase && allBoards && newGreensPerBoard.every((g) => g >= 1)) {
      hatTricks += 1;
      const double = newGreensPerBoard.every((g) => g >= 2) ? p.doubleHatTrickFactor : 1;
      components.hatTrick += hatTrickBase * double;
    }
  });

  const solvedTurns = langs.map((l) => solvedAt[l]).filter((t): t is number => t != null);
  if (p.crackPerM && solvedTurns.length) {
    components.crack += p.crackPerM * mult(Math.min(...solvedTurns));
  }
  if (solvedTurns.length === langs.length) {
    components.gameSolved += 25 * mult(Math.max(...solvedTurns));
  } else if (game.guessHistory.length >= MAX_GUESSES) {
    components.penalty += (p.unsolvedPenalty ?? -250) * (langs.length - solvedTurns.length);
  }
  const total = Object.values(components).reduce((a, b) => a + b, 0);
  return { total, components, hatTricks, bridges };
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
const sd = (xs: number[]) => Math.sqrt(mean(xs.map((x) => (x - mean(xs)) ** 2)));
const corr = (a: number[], b: number[]) => {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  a.forEach((v, i) => {
    num += (v - ma) * (b[i] - mb);
    da += (v - ma) ** 2;
    db += (b[i] - mb) ** 2;
  });
  return da && db ? num / Math.sqrt(da * db) : 0;
};
const round = (x: number, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

/** 1 = best. Ties share the better rank. */
const ranksOf = (scores: number[]) => scores.map((s) => 1 + scores.filter((o) => o > s).length);

function run(inPath: string, outPath: string) {
  const games = (JSON.parse(fs.readFileSync(inPath, 'utf8')) as SavedGame[]).filter(
    (g) => g.words && g.guessHistory?.length
  );
  const solveTurns = (g: SavedGame) =>
    Object.keys(g.words)
      .filter((l) => g.words[l])
      .map((l) => {
        const i = g.guessHistory.findIndex((x) => normalizeWord(x) === normalizeWord(g.words[l]));
        return i < 0 ? null : i + 1;
      });

  const scored = VARIANTS.map((variant) =>
    games.map((g) => (variant.params ? scoreVariant(g, variant.params) : scoreCurrent(g)))
  );
  const currentRanks = ranksOf(scored[0].map((s) => s.total));

  const metrics = VARIANTS.map((variant, vi) => {
    const totals = scored[vi].map((s) => s.total);
    const ranks = ranksOf(totals);
    const winIdx = games.map((g, i) => (g.isWin ? i : -1)).filter((i) => i >= 0);
    const lossIdx = games.map((g, i) => (!g.isWin ? i : -1)).filter((i) => i >= 0);
    const winScores = winIdx.map((i) => totals[i]);
    const lossScores = lossIdx.map((i) => totals[i]);

    const buckets = [5, 6, 7, 8].map((n) => {
      const idx = winIdx.filter((i) => games[i].guessHistory.length === n);
      const s = idx.map((i) => totals[i]);
      const first = idx.map((i) => Math.min(...(solveTurns(games[i]).filter(Boolean) as number[])));
      return {
        guesses: n,
        n: idx.length,
        mean: Math.round(mean(s)),
        sd: Math.round(sd(s)),
        firstSolveCorr: round(corr(s, first)),
      };
    });
    const weighted = (key: 'sd' | 'firstSolveCorr') =>
      round(
        buckets.reduce((a, b) => a + b[key] * b.n, 0) / buckets.reduce((a, b) => a + b.n, 0),
        key === 'sd' ? 0 : 2
      );

    // Share of win-score variance explained by guess count (eta²).
    const grand = mean(winScores);
    const between = buckets.reduce((a, b) => a + b.n * (b.mean - grand) ** 2, 0);
    const total = winScores.reduce((a, s) => a + (s - grand) ** 2, 0);

    const componentShare = Object.fromEntries(
      (Object.keys(emptyComponents()) as Component[]).map((c) => [
        c,
        Math.round(mean(winIdx.map((i) => scored[vi][i].components[c]))),
      ])
    );

    return {
      key: variant.key,
      winRange: [Math.min(...winScores), Math.max(...winScores)],
      lossRange: [Math.min(...lossScores), Math.max(...lossScores)],
      winLossGap: Math.min(...winScores) - Math.max(...lossScores),
      guessCountShare: round(between / total),
      sameGuessSpread: weighted('sd'),
      firstSolveLink: weighted('firstSolveCorr'),
      buckets,
      rankVsCurrent: round(corr(ranks, currentRanks)),
      meanRankShift: round(mean(ranks.map((r, i) => Math.abs(r - currentRanks[i]))), 1),
      hatTrickGames: scored[vi].filter((s, i) => games[i].isWin && s.hatTricks > 0).length,
      bridgeGames: scored[vi].filter((s) => s.bridges > 0).length,
      avgBridgePoints: Math.round(mean(scored[vi].map((s) => s.components.bridge))),
      avgWinComponents: componentShare,
    };
  });

  const perGame = games.map((g, gi) => ({
    index: gi,
    isWin: g.isWin,
    guesses: g.guessHistory.length,
    guessHistory: g.guessHistory,
    words: g.words,
    solveTurns: solveTurns(g),
    scores: Object.fromEntries(VARIANTS.map((v, vi) => [v.key, scored[vi][gi].total])),
    ranks: Object.fromEntries(
      VARIANTS.map((v, vi) => [v.key, ranksOf(scored[vi].map((s) => s.total))[gi]])
    ),
    components: Object.fromEntries(VARIANTS.map((v, vi) => [v.key, scored[vi][gi].components])),
    hatTricks: Object.fromEntries(VARIANTS.map((v, vi) => [v.key, scored[vi][gi].hatTricks])),
    bridges: scored[VARIANTS.findIndex((v) => v.key === 'gBridgeFlat25')][gi].bridges,
  }));

  const wins = perGame.filter((g) => g.isWin);
  const losses = perGame.filter((g) => !g.isWin);
  const firstSolve = (g: (typeof perGame)[number]) =>
    Math.min(...(g.solveTurns.filter(Boolean) as number[]));
  const byCurrent = (a: (typeof perGame)[number], b: (typeof perGame)[number]) =>
    b.scores.current - a.scores.current;
  const picked = new Set<number>();
  const pick = (label: string, candidates: typeof perGame) => {
    const g = candidates.find((c) => !picked.has(c.index));
    if (!g) {
      return null;
    }
    picked.add(g.index);
    return { label, index: g.index };
  };
  const eights = wins.filter((g) => g.guesses === 8);
  const sevens = [...wins.filter((g) => g.guesses === 7)].sort(byCurrent);
  const maxShift = (g: (typeof perGame)[number]) =>
    Math.max(...VARIANTS.map((v) => Math.abs(g.ranks[v.key] - g.ranks.current)));
  const samples = [
    pick('Top current win', [...wins].sort(byCurrent)),
    pick(
      '8-guess win, lots of yellows',
      [...eights].sort((a, b) => b.components.current.yellow - a.components.current.yellow)
    ),
    pick(
      '8-guess win, early first solve',
      [...eights].sort((a, b) => firstSolve(a) - firstSolve(b))
    ),
    pick(
      'Hat-trick win',
      [...wins]
        .filter((g) => g.hatTricks.crack30hat15 > 0)
        .sort((a, b) => maxShift(b) - maxShift(a))
    ),
    pick(
      '6-guess win, early first solve',
      [...wins].filter((g) => g.guesses === 6).sort((a, b) => firstSolve(a) - firstSolve(b))
    ),
    pick('Median 7-guess win', sevens.slice(Math.floor(sevens.length / 2))),
    pick(
      'Biggest rank mover',
      [...perGame].sort((a, b) => maxShift(b) - maxShift(a))
    ),
    pick(
      'Most bridges',
      [...perGame].sort((a, b) => b.bridges - a.bridges)
    ),
    pick('Near-miss loss (2 of 3)', [...losses].sort(byCurrent)),
    pick(
      'Rough loss (1 of 3)',
      [...losses].sort((a, b) => -byCurrent(a, b))
    ),
  ].filter(Boolean);

  fs.writeFileSync(
    outPath,
    JSON.stringify(
      { gameCount: games.length, variants: VARIANTS, metrics, samples, perGame },
      null,
      1
    )
  );
  console.table(
    metrics.map((m) => ({
      variant: m.key,
      wins: m.winRange.join('–'),
      losses: m.lossRange.join('–'),
      gap: m.winLossGap,
      guessShare: m.guessCountShare,
      spread: m.sameGuessSpread,
      firstSolve: m.firstSolveLink,
      rankR: m.rankVsCurrent,
      rankShift: m.meanRankShift,
      hatTricks: m.hatTrickGames,
      bridgeGames: m.bridgeGames,
      bridgePts: m.avgBridgePoints,
    }))
  );
}

const [inPath = '/tmp/pw/games.json', outPath = '/tmp/pw/lab.json'] = process.argv
  .slice(2)
  .filter((a) => a !== '--');
run(inPath, outPath);
