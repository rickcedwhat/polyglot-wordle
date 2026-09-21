import fs from 'fs';
import path from 'path';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { initExperiment, wrapTypeSafe } from 'braintrust';
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
    'Our Tier',
    'Jev Tier',
    'Tier Match',
    'Definition Verdict',
    'Format Verdict',
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
    escapeCsv(item.ourTier.toUpperCase()),
    escapeCsv(item.jevTier.toUpperCase()),
    escapeCsv(item.difficultyMatches ? 'MATCH' : 'MISMATCH'),
    escapeCsv(item.definitionVerdict),
    escapeCsv(item.formatVerdict),
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
  md += `**Difficulty Mismatches:** ${stats.difficultyMismatches.toLocaleString()} (${(
    (stats.difficultyMismatches / Math.max(stats.totalProcessed, 1)) *
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

  // High priority table (wrong meaning, fabricated, wrong POS)
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

  // Difficulty mismatches table
  const diffMismatches = items.filter((i) => !i.difficultyMatches);
  if (diffMismatches.length > 0) {
    md += `## ⚖️ Difficulty Tier Mismatches (${diffMismatches.length})\n\n`;
    md += `| Lang | Word | POS | Current Dict Tier | Jev Assessed Tier | Current Definition |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    for (const item of diffMismatches.slice(0, 50)) {
      const cleanDef = item.currentDef.replace(/\|/g, '\\|');
      md += `| **${item.lang.toUpperCase()}** | **${item.display}** | \`${item.pos}\` | **${item.ourTier}** | **${item.jevTier}** | ${cleanDef} |\n`;
    }
    if (diffMismatches.length > 50) {
      md += `\n*(...${diffMismatches.length - 50} more difficulty mismatches in CSV/JSON)*\n`;
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
        definition: {
          choice: isAback || isAbate ? 'wrong_pos' : 'accurate',
          confidence: 0.95,
        },
        format: {
          choice: 'clean_dictionary',
          confidence: 0.95,
        },
        difficulty: {
          choice: state.word === 'apple' ? 'elementary' : 'intermediate',
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
  let experiment: any = null;

  // Load dataset
  let entries: DictionaryEntry[] = [];
  if (isFull) {
    entries = loadAllDictionaries();
  } else {
    entries = loadPilotSample(25);
  }

  if (isDryRun) {
    client = new MockTypeSafeClient();
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const expName = isFull ? `full-dictionary-qa-${timestamp}` : `pilot-qa-${timestamp}`;
    experiment = initExperiment('polyglot-wordle-dict-qa', {
      experiment: expName,
      metadata: {
        mode: isFull ? 'full' : 'pilot',
        model: 'jev-latest',
        entriesCount: entries.length,
      },
    });
    const rawClient = new TypeSafeClient({ apiKey: typesafeKey });
    client = wrapTypeSafe(rawClient);
  }

  console.log(`Loaded ${entries.length} entries for evaluation.`);

  const results: JevEvaluationResult[] = [];
  const items: ReviewQueueItem[] = [];

  const stats: EvalRunStats = {
    totalProcessed: 0,
    flaggedCount: 0,
    difficultyMismatches: 0,
    byLanguage: {
      en: { total: 0, flagged: 0, bySeverity: { high: 0, medium: 0, low: 0 } },
      es: { total: 0, flagged: 0, bySeverity: { high: 0, medium: 0, low: 0 } },
      fr: { total: 0, flagged: 0, bySeverity: { high: 0, medium: 0, low: 0 } },
    },
    byDefinition: {
      accurate: 0,
      wrong_pos: 0,
      wrong_meaning: 0,
      fabricated: 0,
    },
    byFormat: {
      clean_dictionary: 0,
      vague_circular: 0,
      robotic_filler: 0,
      malformed_syntax: 0,
    },
    byJevTier: {
      elementary: 0,
      intermediate: 0,
      advanced: 0,
      obscure: 0,
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
      const evalFn = async (span?: any) => {
        const res = await evaluateEntryWithJev(client, entry);
        if (span) {
          span.log({
            input: {
              word: entry.word,
              display: entry.display,
              language: entry.lang,
              pos: entry.pos,
              definition: entry.def,
              our_tier: res.ourTier,
            },
            output: {
              definition_verdict: res.definitionVerdict,
              format_verdict: res.formatVerdict,
              jev_tier: res.jevTier,
              difficulty_match: res.difficultyMatches ? 'MATCH' : 'MISMATCH',
              reasons: res.reasons,
            },
            scores: {
              good_definition: res.definitionVerdict === 'accurate' ? 1.0 : 0.0,
              clean_format: res.formatVerdict === 'clean_dictionary' ? 1.0 : 0.0,
              difficulty_match: res.difficultyMatches ? 1.0 : 0.0,
              all_pass:
                res.definitionVerdict === 'accurate' &&
                res.formatVerdict === 'clean_dictionary' &&
                res.difficultyMatches
                  ? 1.0
                  : 0.0,
            },
            metadata: {
              severity: res.severity,
              latencyMs: res.latencyMs,
              definitionConfidence: res.definitionConfidence,
              formatConfidence: res.formatConfidence,
              difficultyConfidence: res.difficultyConfidence,
            },
          });
        }
        return res;
      };

      const res: JevEvaluationResult = experiment
        ? await experiment.traced(evalFn, { name: entry.word })
        : await evalFn();

      results.push(res);

      stats.totalProcessed++;
      stats.byLanguage[entry.lang].total++;
      stats.byDefinition[res.definitionVerdict]++;
      stats.byFormat[res.formatVerdict]++;
      stats.byJevTier[res.jevTier]++;
      totalLatency += res.latencyMs;

      if (!res.difficultyMatches) {
        stats.difficultyMismatches++;
      }

      if (res.severity !== 'none') {
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
          ourTier: res.ourTier,
          jevTier: res.jevTier,
          difficultyMatches: res.difficultyMatches,
          definitionVerdict: res.definitionVerdict,
          formatVerdict: res.formatVerdict,
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

  if (experiment) {
    await experiment.flush();
    const summary = await experiment.summarize();
    console.log(`\n🎉 Braintrust Experiment created!`);
    if (summary && (summary as any).experimentUrl) {
      console.log(`🔗 Experiment URL: ${(summary as any).experimentUrl}`);
    }
  }

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
    `\nSummary: ${stats.flaggedCount} / ${stats.totalProcessed} entries flagged for review (${stats.difficultyMismatches} difficulty mismatches).\n`
  );
}

// Auto-run if executed directly via node or vite-node
if (process.argv[1]?.includes('runEval')) {
  runDictionaryEval().catch((err) => {
    console.error('Fatal error during evaluation run:', err);
    process.exit(1);
  });
}
