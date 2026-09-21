import fs from 'fs';
import path from 'path';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { initLogger, wrapTypeSafe } from 'braintrust';
import dotenv from 'dotenv';
import { loadAllDictionaries, loadPilotSample } from './dataset';
import { evaluateEntryWithJev } from './scorers';
import {
  DictionaryEntry,
  EvalRunStats,
  JevEvaluationResult,
  Language,
  ReviewQueueItem,
} from './types';

// Load .env.local first, then fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export function generateCsv(items: ReviewQueueItem[]): string {
  const headers = [
    'Language',
    'Word',
    'Display',
    'POS',
    'Current D',
    'Jev Assessed D',
    'Jev Tier',
    'Accuracy',
    'Quality',
    'Severity',
    'Reasons',
    'Current Definition',
  ];

  const escapeCsv = (str: string | number) => {
    const val = String(str ?? '').replace(/"/g, '""');
    return `"${val}"`;
  };

  const rows = items.map((item) => [
    escapeCsv(item.lang.toUpperCase()),
    escapeCsv(item.word),
    escapeCsv(item.display),
    escapeCsv(item.pos),
    item.currentD.toFixed(2),
    item.assessedD.toFixed(2),
    escapeCsv(item.difficultyTier),
    escapeCsv(item.accuracy),
    escapeCsv(item.quality),
    escapeCsv(item.severity.toUpperCase()),
    escapeCsv(item.reasons.join('; ')),
    escapeCsv(item.currentDef),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function generateMarkdownSummary(stats: EvalRunStats, items: ReviewQueueItem[]): string {
  let md = `# 🔍 Jev + Braintrust Dictionary QA Audit Report\n\n`;
  md += `**Total Entries Evaluated:** ${stats.totalProcessed.toLocaleString()}\n`;
  md += `**Flagged for Reexamination:** ${stats.flaggedCount.toLocaleString()} (${(
    (stats.flaggedCount / Math.max(stats.totalProcessed, 1)) *
    100
  ).toFixed(1)}%)\n`;
  md += `**Average Latency:** ${stats.averageLatencyMs.toFixed(0)} ms/entry\n\n`;

  md += `## 📊 Language Summary\n\n`;
  md += `| Language | Evaluated | Flagged | High Severity | Med Severity | Low Severity |\n`;
  md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

  const langs: Language[] = ['en', 'es', 'fr'];
  for (const l of langs) {
    const s = stats.byLanguage[l];
    md += `| **${l.toUpperCase()}** | ${s.total.toLocaleString()} | ${s.flagged.toLocaleString()} | ${s.bySeverity.high} | ${s.bySeverity.medium} | ${s.bySeverity.low} |\n`;
  }
  md += `\n---\n\n`;

  // Top issues table
  const highItems = items.filter((i) => i.severity === 'high');
  if (highItems.length > 0) {
    md += `## 🚨 High Priority Flagged Words (${highItems.length})\n\n`;
    md += `| Lang | Word | POS | Issues | Current Definition |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;
    for (const item of highItems.slice(0, 50)) {
      const cleanDef = item.currentDef.replace(/\|/g, '\\|');
      md += `| **${item.lang.toUpperCase()}** | **${item.display}** | \`${item.pos}\` | ${item.reasons.join('; ')} | ${cleanDef} |\n`;
    }
    if (highItems.length > 50) {
      md += `\n*(...${highItems.length - 50} more high priority items in CSV/JSON)*\n`;
    }
    md += `\n`;
  }

  return md;
}

// Mock client for dry-runs and automated pipeline testing
class MockTypeSafeClient {
  async systemOne({ state }: { state: any }) {
    const isAback = state.word === 'aback';
    const isAbate = state.word === 'abate';

    return {
      answers: {
        difficulty: {
          choice: state.currentDifficultyScore > 0.7 ? 'Advanced' : 'Elementary',
          confidence: 0.95,
        },
        accuracy: {
          choice: isAback || isAbate ? 'wrong_pos' : 'accurate',
          confidence: 0.92,
        },
        quality: {
          choice: 'high_quality',
          confidence: 0.9,
        },
        needsReexamine: {
          answer: isAback || isAbate,
          probability: isAback || isAbate ? 0.95 : 0.05,
          confidence: 0.95,
        },
      },
    };
  }
}

export async function runDictionaryEval() {
  const args = process.argv.slice(2);
  const isPilot = args.includes('--pilot') || args.length === 0;
  const isDryRun = args.includes('--dry-run');
  const isFull = args.includes('--full');

  const braintrustKey = process.env.BRAINTRUST_API_KEY;
  const typesafeKey = process.env.TYPESAFE_API_KEY;

  if (!isDryRun && (!typesafeKey || !braintrustKey)) {
    console.error(`\n❌ Error: Missing API credentials!`);
    console.error(`Please provide BRAINTRUST_API_KEY and TYPESAFE_API_KEY in:`);
    console.error(`  ${path.resolve(process.cwd(), '.env.local')}\n`);
    console.error(`Or run with --dry-run to test the pipeline with simulated responses:\n`);
    console.error(`  npm run eval:dict:pilot -- --dry-run\n`);
    process.exit(1);
  }

  console.log(`\n🚀 Initializing Braintrust + Jev Dictionary QA...`);
  console.log(
    `Mode: ${isFull ? 'Full Dictionary (all words)' : isPilot ? 'Pilot Sample (25/lang)' : 'Custom Sample'}`
  );
  console.log(`Dry Run: ${isDryRun ? 'YES (mock client)' : 'NO (live Jev & Braintrust API)'}`);

  let client: any;
  if (isDryRun) {
    client = new MockTypeSafeClient();
  } else {
    initLogger({ projectName: 'polyglot-wordle-dict-qa' });
    const rawClient = new TypeSafeClient({ apiKey: typesafeKey });
    client = wrapTypeSafe(rawClient);
  }

  // Load dataset
  let entries: DictionaryEntry[] = [];
  if (isFull) {
    entries = loadAllDictionaries();
  } else {
    entries = loadPilotSample(25);
  }

  console.log(`Loaded ${entries.length} entries for evaluation.`);

  const results: JevEvaluationResult[] = [];
  const items: ReviewQueueItem[] = [];

  const stats: EvalRunStats = {
    totalProcessed: 0,
    flaggedCount: 0,
    byLanguage: {
      en: { total: 0, flagged: 0, bySeverity: { high: 0, medium: 0, low: 0 } },
      es: { total: 0, flagged: 0, bySeverity: { high: 0, medium: 0, low: 0 } },
      fr: { total: 0, flagged: 0, bySeverity: { high: 0, medium: 0, low: 0 } },
    },
    byAccuracy: {
      accurate: 0,
      wrong_pos: 0,
      wrong_meaning: 0,
      fabricated: 0,
    },
    byQuality: {
      high_quality: 0,
      vague_or_circular: 0,
      robotic_filler: 0,
      grammatical_glitch: 0,
    },
    averageLatencyMs: 0,
  };

  let totalLatency = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    process.stdout.write(
      `\rEvaluating [${i + 1}/${entries.length}] [${entry.lang.toUpperCase()}] ${entry.word}... `
    );

    try {
      const res = await evaluateEntryWithJev(client, entry);
      results.push(res);

      stats.totalProcessed++;
      stats.byLanguage[entry.lang].total++;
      stats.byAccuracy[res.accuracy]++;
      stats.byQuality[res.quality]++;
      totalLatency += res.latencyMs;

      if (res.needsReexamine && res.severity !== 'none') {
        stats.flaggedCount++;
        stats.byLanguage[entry.lang].flagged++;
        stats.byLanguage[entry.lang].bySeverity[res.severity]++;

        items.push({
          word: res.word,
          lang: res.lang,
          display: res.display,
          pos: res.currentPos,
          currentDef: res.currentDef,
          currentD: res.currentD,
          assessedD: res.assessedD,
          difficultyTier: res.difficultyTier,
          accuracy: res.accuracy,
          quality: res.quality,
          needsReexamineProb: res.needsReexamineProb,
          severity: res.severity,
          reasons: res.reasons,
        });
      }
    } catch (err: any) {
      console.error(`\nFailed evaluating "${entry.word}":`, err.message);
    }
  }

  stats.averageLatencyMs = stats.totalProcessed > 0 ? totalLatency / stats.totalProcessed : 0;
  console.log(`\n\n✅ Evaluation finished!`);

  // Ensure artifacts directory exists
  const outDir = path.resolve(process.cwd(), 'evals/artifacts');
  fs.mkdirSync(outDir, { recursive: true });

  // 1. Export JSON review queue
  const jsonPath = path.join(outDir, 'review_queue.json');
  fs.writeFileSync(jsonPath, JSON.stringify({ stats, queue: items }, null, 2));
  console.log(`📄 Saved review queue JSON: ${jsonPath}`);

  // 2. Export CSV
  const csvPath = path.join(outDir, 'review_queue.csv');
  fs.writeFileSync(csvPath, generateCsv(items));
  console.log(`📊 Saved review queue CSV: ${csvPath}`);

  // 3. Export Markdown summary
  const mdPath = path.join(outDir, 'audit_summary.md');
  fs.writeFileSync(mdPath, generateMarkdownSummary(stats, items));
  console.log(`📝 Saved audit summary Markdown: ${mdPath}`);
  console.log(
    `\nSummary: ${stats.flaggedCount} / ${stats.totalProcessed} entries flagged for review.\n`
  );
}

// Auto-run if executed directly via node or vite-node
if (process.argv[1]?.includes('runEval')) {
  runDictionaryEval().catch((err) => {
    console.error('Fatal error during evaluation run:', err);
    process.exit(1);
  });
}
