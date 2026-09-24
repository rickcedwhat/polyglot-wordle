/**
 * Jev verb-form screen — analysis only (does not modify dictionaries).
 *
 * For verb-tagged entries, classify:
 *   infinitive | finite (inflected) | not_a_verb
 * plus whether the current definition is primarily a non-verb POS sense,
 * and whether conjugated spellings should be rewritten to adj/noun/etc.
 *
 * Finite → recommended blockAsAnswer (still guessable), EXCEPT when the
 * definition primarily defines noun/adj/etc. — those stay answer-eligible.
 *
 * Finite + common non-verb reading still defined as a verb → needsPosRewrite
 * (written to verb_form_rewrite_queue_{lang}.json for remediate).
 *
 * Usage:
 *   npm run eval:dict:verb-form -- --lang es
 *   npm run eval:dict:verb-form -- --lang en,es,fr
 *   npm run eval:dict:verb-form -- --lang es --limit 50
 */
import fs from 'fs';
import path from 'path';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { loadDictionary } from './dataset';
import { DictionaryEntry, Language } from './types';
import {
  evaluateVerbFormWithJev,
  isVerbTagged,
  shouldBlockAsAnswer,
  shouldRewritePos,
  VerbFormResult,
  VerbFormVerdict,
} from './verbForm';

function loadEnv() {
  for (const rel of ['.env.local', '.env']) {
    const file = path.resolve(process.cwd(), rel);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq);
      const val = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '');
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  }
}
loadEnv();

const ARTIFACTS_DIR = path.resolve(process.cwd(), 'evals', 'artifacts');

function parseArgs(argv: string[]) {
  let langs: Language[] = ['en', 'es', 'fr'];
  let limit = 0;
  let concurrency = 10;
  let minConfidence = 0.5;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--lang' && argv[i + 1]) {
      langs = argv[++i].split(',').map((l) => l.trim()) as Language[];
    } else if (arg.startsWith('--lang=')) {
      langs = arg
        .slice('--lang='.length)
        .split(',')
        .map((l) => l.trim()) as Language[];
    } else if (arg === '--limit' && argv[i + 1]) limit = Number(argv[++i]);
    else if (arg.startsWith('--limit=')) limit = Number(arg.slice('--limit='.length));
    else if (arg === '--concurrency' && argv[i + 1]) concurrency = Number(argv[++i]);
    else if (arg.startsWith('--concurrency=')) {
      concurrency = Number(arg.slice('--concurrency='.length));
    } else if (arg === '--min-confidence' && argv[i + 1]) minConfidence = Number(argv[++i]);
    else if (arg.startsWith('--min-confidence=')) {
      minConfidence = Number(arg.slice('--min-confidence='.length));
    }
  }

  for (const lang of langs) {
    if (!/^[a-z]{2}$/.test(lang)) {
      throw new Error(`Invalid language code: ${lang}`);
    }
  }
  if (!Number.isFinite(limit) || limit < 0) throw new Error('--limit must be >= 0');
  if (!Number.isFinite(concurrency) || concurrency < 1) {
    throw new Error('--concurrency must be >= 1');
  }
  if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 1) {
    throw new Error('--min-confidence must be between 0 and 1');
  }

  return { langs, limit, concurrency, minConfidence };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  let done = 0;

  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
      done++;
      onProgress?.(done, items.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

function annotate(results: VerbFormResult[], minConfidence: number): VerbFormResult[] {
  return results.map((r) => ({
    ...r,
    blockAsAnswer: shouldBlockAsAnswer(
      r.verdict,
      r.confidence,
      r.defSense,
      r.defSenseConfidence,
      minConfidence
    ),
    needsPosRewrite: shouldRewritePos(
      r.verdict,
      r.confidence,
      r.altPos,
      r.altPosConfidence,
      minConfidence
    ),
  }));
}

function summarize(results: VerbFormResult[], minConfidence: number) {
  const annotated = annotate(results, minConfidence);
  const byVerdict = { infinitive: 0, finite: 0, not_a_verb: 0 } as Record<VerbFormVerdict, number>;
  for (const r of annotated) byVerdict[r.verdict]++;

  const finiteKeptNonVerb = annotated.filter(
    (r) =>
      r.verdict === 'finite' &&
      r.confidence >= minConfidence &&
      r.defSense === 'non_verb_primary' &&
      r.defSenseConfidence >= minConfidence
  );

  const needsPosRewrite = annotated.filter((r) => r.needsPosRewrite);
  const blockAsAnswer = annotated.filter((r) => r.blockAsAnswer);
  const blockLowConf = annotated.filter(
    (r) =>
      r.verdict === 'finite' &&
      r.confidence < minConfidence &&
      !(r.defSense === 'non_verb_primary' && r.defSenseConfidence >= minConfidence)
  );

  return {
    annotated,
    byVerdict,
    blockAsAnswer,
    blockLowConf,
    finiteKeptNonVerb,
    needsPosRewrite,
    total: annotated.length,
  };
}

async function runLang(
  lang: Language,
  client: TypeSafeClient,
  options: { limit: number; concurrency: number; minConfidence: number }
) {
  const all = loadDictionary(lang);
  let entries: DictionaryEntry[] = all.filter((e) => isVerbTagged(e.pos));
  if (options.limit > 0) entries = entries.slice(0, options.limit);

  console.log(`\n🔎 Verb-form screen — ${lang.toUpperCase()}`);
  console.log(
    `   Dictionary: ${all.length} · verb-tagged: ${entries.length}${options.limit ? ' (limited)' : ''}`
  );

  const failures: { word: string; error: string }[] = [];
  const start = Date.now();

  const settled = await mapPool(
    entries,
    options.concurrency,
    async (entry) => {
      try {
        return await evaluateVerbFormWithJev(client, entry);
      } catch (err) {
        failures.push({
          word: entry.word,
          error: err instanceof Error ? err.message : String(err),
        });
        return null;
      }
    },
    (done, total) => {
      if (done % 50 === 0 || done === total) {
        const elapsed = ((Date.now() - start) / 1000).toFixed(0);
        process.stdout.write(`\r  Progress ${done}/${total} (${elapsed}s)   `);
      }
    }
  );

  console.log('\n');

  const results = settled.filter((r): r is VerbFormResult => r !== null);
  const {
    annotated,
    byVerdict,
    blockAsAnswer,
    blockLowConf,
    finiteKeptNonVerb,
    needsPosRewrite,
    total,
  } = summarize(results, options.minConfidence);

  const dictByWord = new Map(all.map((e) => [e.word, e]));

  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const jsonPath = path.join(ARTIFACTS_DIR, `verb_form_${lang}.json`);
  const blockPath = path.join(ARTIFACTS_DIR, `verb_form_block_answers_${lang}.txt`);
  const keepPath = path.join(ARTIFACTS_DIR, `verb_form_keep_nonverb_${lang}.txt`);
  const rewritePath = path.join(ARTIFACTS_DIR, `verb_form_rewrite_queue_${lang}.json`);
  const rewriteTxtPath = path.join(ARTIFACTS_DIR, `verb_form_rewrite_${lang}.txt`);
  const mdPath = path.join(ARTIFACTS_DIR, `verb_form_summary_${lang}.md`);

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        lang,
        generatedAt: new Date().toISOString(),
        analysisOnly: true,
        minConfidence: options.minConfidence,
        dictSize: all.length,
        verbTagged: entries.length,
        total,
        byVerdict,
        blockAsAnswerCount: blockAsAnswer.length,
        finiteKeptNonVerbCount: finiteKeptNonVerb.length,
        needsPosRewriteCount: needsPosRewrite.length,
        blockLowConfCount: blockLowConf.length,
        results: annotated,
      },
      null,
      2
    ) + '\n'
  );

  fs.writeFileSync(
    blockPath,
    blockAsAnswer
      .sort((a, b) => a.word.localeCompare(b.word))
      .map(
        (r) =>
          `${r.word}\t${r.display}\t${r.pos}\t${r.defSense}\t${r.altPos}\t${r.confidence.toFixed(3)}`
      )
      .join('\n') + (blockAsAnswer.length ? '\n' : '')
  );

  fs.writeFileSync(
    keepPath,
    finiteKeptNonVerb
      .sort((a, b) => a.word.localeCompare(b.word))
      .map(
        (r) =>
          `${r.word}\t${r.display}\t${r.pos}\t${r.defSense}\t${r.defSenseConfidence.toFixed(3)}`
      )
      .join('\n') + (finiteKeptNonVerb.length ? '\n' : '')
  );

  const rewriteQueue = {
    lang,
    generatedAt: new Date().toISOString(),
    reason: 'pos_rewrite_non_verb',
    total: needsPosRewrite.length,
    queue: needsPosRewrite
      .sort((a, b) => a.word.localeCompare(b.word))
      .map((r) => {
        const entry = dictByWord.get(r.word);
        return {
          word: r.word,
          lang,
          display: r.display,
          pos: r.pos,
          currentDef: entry?.def || '',
          currentD: entry?.d ?? 0.7,
          definitionVerdict: 'wrong_pos',
          formatVerdict: 'clean_dictionary',
          severity: 'medium',
          reasons: [
            'Conjugated verb spelling with a common non-verb reading — rewrite POS+definition to noun/adj/adv',
          ],
          verbForm: r.verdict,
          defSense: r.defSense,
          altPos: r.altPos,
          altPosConfidence: r.altPosConfidence,
        };
      }),
  };
  fs.writeFileSync(rewritePath, JSON.stringify(rewriteQueue, null, 2) + '\n');
  fs.writeFileSync(
    rewriteTxtPath,
    needsPosRewrite
      .sort((a, b) => a.word.localeCompare(b.word))
      .map((r) => `${r.word}\t${r.display}\t${r.pos}\t${r.altPosConfidence.toFixed(3)}`)
      .join('\n') + (needsPosRewrite.length ? '\n' : '')
  );

  let md = `# Verb form screen — ${lang.toUpperCase()}\n\n`;
  md += `Analysis only (dictionaries not modified).\n\n`;
  md += `**Verb-tagged evaluated:** ${total}\n`;
  md += `**Infinitive:** ${byVerdict.infinitive}\n`;
  md += `**Finite (form):** ${byVerdict.finite}\n`;
  md += `**Finite kept (non-verb definition):** ${finiteKeptNonVerb.length}\n`;
  md += `**Needs POS rewrite (participle/adj/noun reading):** ${needsPosRewrite.length}\n`;
  md += `**Finite → block as answer (conf ≥ ${options.minConfidence}):** ${blockAsAnswer.length}\n`;
  md += `**Finite low-conf:** ${blockLowConf.length}\n`;
  md += `**Not a verb:** ${byVerdict.not_a_verb}\n\n`;
  md += `## Sample needs POS rewrite (up to 20)\n\n| Word | Display | POS | Alt conf |\n| :--- | :--- | :--- | ---: |\n`;
  for (const r of needsPosRewrite.slice(0, 20)) {
    md += `| ${r.word} | ${r.display} | ${r.pos} | ${r.altPosConfidence.toFixed(2)} |\n`;
  }
  md += `\n## Sample kept despite finite form (up to 20)\n\n| Word | Display | POS | DefSense conf |\n| :--- | :--- | :--- | ---: |\n`;
  for (const r of finiteKeptNonVerb.slice(0, 20)) {
    md += `| ${r.word} | ${r.display} | ${r.pos} | ${r.defSenseConfidence.toFixed(2)} |\n`;
  }
  md += `\n## Sample finite blocked (up to 40)\n\n| Word | Display | DefSense | AltPos | Conf |\n| :--- | :--- | :--- | :--- | ---: |\n`;
  for (const r of blockAsAnswer.slice(0, 40)) {
    md += `| ${r.word} | ${r.display} | ${r.defSense} | ${r.altPos} | ${r.confidence.toFixed(2)} |\n`;
  }
  fs.writeFileSync(mdPath, md);

  console.log(
    `✅ ${lang.toUpperCase()}: infinitive ${byVerdict.infinitive} · finite ${byVerdict.finite} (keep ${finiteKeptNonVerb.length} · rewrite ${needsPosRewrite.length} · block ${blockAsAnswer.length}) · not_a_verb ${byVerdict.not_a_verb}`
  );
  console.log(`   📄 ${mdPath}`);
  console.log(`   📝 rewrite queue → ${rewritePath} (${needsPosRewrite.length})`);
  if (failures.length) {
    console.warn(`   ⚠️ ${failures.length} failures`);
  }

  return {
    lang,
    total,
    byVerdict,
    blockAsAnswer: blockAsAnswer.length,
    finiteKeptNonVerb: finiteKeptNonVerb.length,
    needsPosRewrite: needsPosRewrite.length,
    blockLowConf: blockLowConf.length,
    failures: failures.length,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const typesafeKey = process.env.TYPESAFE_API_KEY;
  if (!typesafeKey) {
    console.error('Missing TYPESAFE_API_KEY in .env.local');
    process.exit(1);
  }

  const client = new TypeSafeClient({ apiKey: typesafeKey });
  console.log(`\nVerb-form answer-eligibility analysis`);
  console.log(`Languages: ${options.langs.join(', ')}`);
  console.log(`Block finite when confidence ≥ ${options.minConfidence}`);
  console.log(`Keep finite when definition is primarily non-verb (same confidence gate)`);
  console.log(`Flag rewrite_as_non_verb for remediate (participle→adj, etc.)`);
  console.log(`(No dictionary writes.)\n`);

  const summaries = [];
  for (const lang of options.langs) {
    summaries.push(await runLang(lang, client, options));
  }

  console.log(`\n📋 Rollup`);
  for (const s of summaries) {
    console.log(
      `   ${s.lang}: block ${s.blockAsAnswer}/${s.total} · keep ${s.finiteKeptNonVerb} · rewrite ${s.needsPosRewrite} · infinitive ${s.byVerdict.infinitive}`
    );
  }
}

main().catch((err) => {
  console.error('\n❌ Verb-form screen failed:', err);
  process.exit(1);
});
