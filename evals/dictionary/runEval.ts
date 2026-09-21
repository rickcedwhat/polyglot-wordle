import fs from 'fs';
import path from 'path';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { initExperiment, wrapTypeSafe } from 'braintrust';
import dotenv from 'dotenv';
import { loadAllDictionaries, loadDictionary, loadPilotSample } from './dataset';
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
  const isPilot = args.includes('--pilot');
  const isDryRun = args.includes('--dry-run');
  const isFull = args.includes('--full');
  const useBraintrust = args.includes('--braintrust');

  let langArg: Language | null = null;
  if (args.includes('--en')) {
    langArg = 'en';
  } else if (args.includes('--es')) {
    langArg = 'es';
  } else if (args.includes('--fr')) {
    langArg = 'fr';
  } else {
    const langIdx = args.indexOf('--lang');
    if (langIdx !== -1 && args[langIdx + 1]) {
      langArg = args[langIdx + 1] as Language;
    }
  }

  const braintrustKey = process.env.BRAINTRUST_API_KEY;
  const typesafeKey = process.env.TYPESAFE_API_KEY;

  if (!isDryRun && !typesafeKey) {
    console.error(`\n❌ Error: Missing TYPESAFE_API_KEY credentials!`);
    console.error(`Please provide TYPESAFE_API_KEY in:`);
    console.error(`  ${path.resolve(process.cwd(), '.env.local')}\n`);
    console.error(`Or run with --dry-run to test the pipeline with simulated responses:\n`);
    console.error(`  npm run eval:dict:pilot -- --dry-run\n`);
    process.exit(1);
  }

  if (useBraintrust && !braintrustKey) {
    console.error(`\n❌ Error: Missing BRAINTRUST_API_KEY credentials!`);
    console.error(`Please provide BRAINTRUST_API_KEY in .env.local to log to Braintrust.\n`);
    process.exit(1);
  }

  // Load dataset
  let entries: DictionaryEntry[] = [];
  if (langArg) {
    if (isPilot) {
      entries = loadPilotSample(25).filter((e) => e.lang === langArg);
    } else {
      entries = loadDictionary(langArg);
    }
  } else if (isFull) {
    entries = loadAllDictionaries();
  } else {
    entries = loadPilotSample(25);
  }

  console.log(`\n🚀 Initializing Jev Dictionary QA...`);
  console.log(
    `Mode: ${langArg ? `Single Language [${langArg.toUpperCase()}] (${entries.length} words)` : isFull ? 'Full Dictionary (all words)' : 'Pilot Sample'}`
  );
  console.log(`Dry Run: ${isDryRun ? 'YES (mock client)' : 'NO (live Jev API)'}`);
  console.log(
    `Braintrust: ${useBraintrust ? 'ENABLED (recording experiment)' : 'DISABLED (local evaluation only; pass --braintrust to enable)'}`
  );

  let client: any;
  let experiment: any = null;

  if (isDryRun) {
    client = new MockTypeSafeClient();
  } else {
    const rawClient = new TypeSafeClient({ apiKey: typesafeKey });
    if (useBraintrust) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const prefix = langArg
        ? `${langArg}-dictionary-qa`
        : isFull
          ? 'full-dictionary-qa'
          : 'pilot-qa';
      const expName = `${prefix}-${timestamp}`;
      experiment = initExperiment('polyglot-wordle-dict-qa', {
        experiment: expName,
        metadata: {
          mode: langArg ? `full-${langArg}` : isFull ? 'full' : 'pilot',
          language: langArg || 'all',
          model: 'jev-latest',
          entriesCount: entries.length,
        },
      });
      client = wrapTypeSafe(rawClient);
    } else {
      client = rawClient;
    }
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

  const concurrency = isDryRun ? 10 : 8;
  let completed = 0;
  let totalLatency = 0;
  const startTime = Date.now();

  const processEntry = async (entry: DictionaryEntry): Promise<JevEvaluationResult | null> => {
    const runOnce = async () => {
      const evalFn = async (span?: any) => {
        const res = await evaluateEntryWithJev(client, entry);
        if (span) {
          const pass =
            res.definitionVerdict === 'accurate' &&
            res.formatVerdict === 'clean_dictionary' &&
            res.difficultyMatches;

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
              quality_pass: pass ? 1.0 : 0.0,
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

      return experiment ? await experiment.traced(evalFn, { name: entry.word }) : await evalFn();
    };

    try {
      const res = await runOnce();
      completed++;
      if (completed % 25 === 0 || completed === entries.length) {
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(0);
        const rate = (completed / Math.max(1, (Date.now() - startTime) / 1000)).toFixed(1);
        process.stdout.write(
          `\rProgress: [${completed}/${entries.length}] (${((completed / entries.length) * 100).toFixed(1)}%) | ${rate} words/sec | ${elapsedSec}s elapsed`
        );
      }
      return res;
    } catch {
      // Retry once on transient network glitch
      try {
        const res = await runOnce();
        completed++;
        return res;
      } catch (err: any) {
        console.error(`\nFailed evaluating "${entry.word}":`, err.message);
        return null;
      }
    }
  };

  const rawResults: (JevEvaluationResult | null)[] = new Array(entries.length);
  let nextIdx = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (nextIdx < entries.length) {
      const i = nextIdx++;
      rawResults[i] = await processEntry(entries[i]);
    }
  });

  await Promise.all(workers);

  for (const res of rawResults) {
    if (!res) {
      continue;
    }
    results.push(res);
    stats.totalProcessed++;
    stats.byLanguage[res.lang].total++;
    stats.byDefinition[res.definitionVerdict]++;
    stats.byFormat[res.formatVerdict]++;
    stats.byJevTier[res.jevTier]++;
    totalLatency += res.latencyMs;

    if (!res.difficultyMatches) {
      stats.difficultyMismatches++;
    }

    if (res.severity !== 'none') {
      stats.flaggedCount++;
      stats.byLanguage[res.lang].flagged++;
      stats.byLanguage[res.lang].bySeverity[res.severity]++;

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
  } else if (!isDryRun) {
    console.log(
      `\n💡 Braintrust Logging: DISABLED (ran locally with Jev; pass --braintrust to log to Braintrust)`
    );
  }

  // Ensure artifacts directory exists
  const outDir = path.resolve(process.cwd(), 'evals/artifacts');
  fs.mkdirSync(outDir, { recursive: true });

  const suffix = langArg ? `_${langArg}` : '';

  // 1. Export JSON review queue
  const jsonPath = path.join(outDir, `review_queue${suffix}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({ stats, queue: items }, null, 2));
  console.log(`📄 Saved review queue JSON: ${jsonPath}`);

  // 2. Export CSV
  const csvPath = path.join(outDir, `review_queue${suffix}.csv`);
  fs.writeFileSync(csvPath, generateCsv(items));
  console.log(`📊 Saved review queue CSV: ${csvPath}`);

  // 3. Export Markdown summary
  const mdPath = path.join(outDir, `audit_summary${suffix}.md`);
  fs.writeFileSync(mdPath, generateMarkdownSummary(stats, items));
  console.log(`📝 Saved audit summary Markdown: ${mdPath}`);

  if (suffix) {
    fs.writeFileSync(
      path.join(outDir, 'review_queue.json'),
      JSON.stringify({ stats, queue: items }, null, 2)
    );
    fs.writeFileSync(path.join(outDir, 'review_queue.csv'), generateCsv(items));
    fs.writeFileSync(path.join(outDir, 'audit_summary.md'), generateMarkdownSummary(stats, items));
  }

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
