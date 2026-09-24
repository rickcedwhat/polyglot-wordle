/**
 * Shared observability for the dictionary pipeline.
 *
 * Artifacts live under evals/artifacts/dict-console/ and are the source of truth
 * for both the local console UI (:4091) and agent chat (read files or curl API).
 *
 *   status_{lang}.json        — current step, counters, running/paused
 *   events_{lang}.ndjson      — append-only event log
 *   latest_batch_{lang}.json  — last enrich/remediate batch (before/after)
 *   scorecard_{lang}.json     — last eval / remediate summary
 *   control_{lang}.json       — { pause: boolean } cooperative pause flag
 */

import fs from 'fs';
import path from 'path';

const MAX_EVENTS_FILE_BYTES = 2_000_000;

export function dictConsolePaths(rootDir, lang) {
  const dir = path.resolve(rootDir, 'evals', 'artifacts', 'dict-console');
  return {
    dir,
    status: path.join(dir, `status_${lang}.json`),
    events: path.join(dir, `events_${lang}.ndjson`),
    latestBatch: path.join(dir, `latest_batch_${lang}.json`),
    scorecard: path.join(dir, `scorecard_${lang}.json`),
    control: path.join(dir, `control_${lang}.json`),
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJsonSafe(file, fallback = null) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

export function createDictConsole(rootDir, lang) {
  const paths = dictConsolePaths(rootDir, lang);

  const readStatus = () =>
    readJsonSafe(paths.status, {
      lang,
      phase: 'idle',
      step: null,
      running: false,
      paused: false,
      updatedAt: null,
    });

  const patchStatus = (partial) => {
    const next = {
      ...readStatus(),
      ...partial,
      lang,
      updatedAt: new Date().toISOString(),
    };
    writeJson(paths.status, next);
    return next;
  };

  const readControl = () => readJsonSafe(paths.control, { pause: false });

  const writeControl = (partial) => {
    const next = { ...readControl(), ...partial, updatedAt: new Date().toISOString() };
    writeJson(paths.control, next);
    return next;
  };

  const event = (type, message, data = undefined) => {
    ensureDir(paths.dir);
    if (fs.existsSync(paths.events)) {
      const size = fs.statSync(paths.events).size;
      if (size > MAX_EVENTS_FILE_BYTES) {
        const keep = fs.readFileSync(paths.events, 'utf8').split('\n').slice(-500).join('\n');
        fs.writeFileSync(paths.events, keep.endsWith('\n') ? keep : keep + '\n');
      }
    }
    const row = {
      ts: new Date().toISOString(),
      type,
      message,
      ...(data !== undefined ? { data } : {}),
    };
    fs.appendFileSync(paths.events, JSON.stringify(row) + '\n');
    return row;
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  return {
    paths,
    readStatus,
    patchStatus,
    readControl,
    writeControl,
    event,

    beginRun({ step, pid = process.pid, extra = {} } = {}) {
      writeControl({ pause: false });
      const status = patchStatus({
        phase: 'running',
        step: step || null,
        running: true,
        paused: false,
        pid,
        startedAt: new Date().toISOString(),
        error: null,
        counters: {
          enriched: 0,
          skipped: 0,
          rateLimits: 0,
          batchIndex: 0,
          batchTotal: 0,
          queueSize: null,
          ...(extra.counters || {}),
        },
        ...extra,
      });
      event('run_start', `Pipeline started (step=${step || 'all'})`, { step, pid });
      return status;
    },

    setStep(step, message) {
      patchStatus({ step, phase: 'running' });
      event('step', message || `Step: ${step}`, { step });
    },

    writeLatestBatch(batch) {
      const payload = {
        lang,
        updatedAt: new Date().toISOString(),
        ...batch,
      };
      writeJson(paths.latestBatch, payload);
      event('batch', `Batch ${batch.batchIndex}/${batch.batchTotal}`, {
        step: batch.step,
        batchIndex: batch.batchIndex,
        batchTotal: batch.batchTotal,
        count: Array.isArray(batch.items) ? batch.items.length : 0,
        enriched: batch.enriched,
        skipped: batch.skipped,
        rateLimits: batch.rateLimits,
      });
      return payload;
    },

    writeScorecard(scorecard) {
      const payload = {
        lang,
        updatedAt: new Date().toISOString(),
        ...scorecard,
      };
      writeJson(paths.scorecard, payload);
      event('scorecard', scorecard.summary || 'Scorecard updated', scorecard);
      patchStatus({ lastScorecard: payload });
      return payload;
    },

    async waitIfPaused() {
      // Cooperative pause — checked between batches / before Gemini calls.
      while (readControl().pause) {
        const was = readStatus();
        if (!was.paused) {
          patchStatus({ paused: true, phase: 'paused' });
          event('paused', 'Paused by console control flag');
        }
        await sleep(500);
      }
      if (readStatus().paused) {
        patchStatus({ paused: false, phase: 'running' });
        event('resumed', 'Resumed after pause');
      }
    },

    requestPause() {
      writeControl({ pause: true });
      event('pause_requested', 'Pause requested');
    },

    clearPause() {
      writeControl({ pause: false });
      event('resume_requested', 'Resume requested');
    },

    endRun({ ok = true, error = null } = {}) {
      patchStatus({
        phase: ok ? 'idle' : 'error',
        running: false,
        paused: false,
        pid: null,
        error: error ? String(error) : null,
        finishedAt: new Date().toISOString(),
      });
      writeControl({ pause: false });
      event(ok ? 'run_end' : 'run_error', ok ? 'Pipeline finished' : `Pipeline failed: ${error}`, {
        ok,
        error: error ? String(error) : null,
      });
    },
  };
}

export function readEventsTail(rootDir, lang, tail = 50) {
  const { events } = dictConsolePaths(rootDir, lang);
  if (!fs.existsSync(events)) return [];
  const lines = fs.readFileSync(events, 'utf8').split('\n').filter(Boolean);
  return lines.slice(-Math.max(1, tail)).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return { ts: null, type: 'raw', message: line };
    }
  });
}

export function readDictConsoleSnapshot(rootDir, lang, { eventTail = 40 } = {}) {
  const paths = dictConsolePaths(rootDir, lang);
  const funnel = buildDictFunnel(rootDir, lang);
  return {
    lang,
    status: readJsonSafe(paths.status),
    latestBatch: readJsonSafe(paths.latestBatch),
    scorecard: readJsonSafe(paths.scorecard),
    control: readJsonSafe(paths.control, { pause: false }),
    events: readEventsTail(rootDir, lang, eventTail),
    funnel,
    pipeline: buildPipelineStudio(rootDir, lang, funnel, readJsonSafe(paths.status)),
    paths,
  };
}

function countLines(file) {
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  if (!text.trim()) return 0;
  return text.split('\n').filter((line) => line.trim()).length;
}

function countDictEntries(file) {
  const data = readJsonSafe(file, null);
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  return Object.keys(data).length;
}

function countReviewed(file) {
  const data = readJsonSafe(file, null);
  if (!data || typeof data !== 'object') return { total: null, reviewed: null, stubs: null };
  const keys = Object.keys(data);
  let reviewed = 0;
  let stubs = 0;
  for (const key of keys) {
    const e = data[key];
    const hasDef = typeof e?.def === 'string' && e.def.trim().length >= 15;
    if (e?.reviewed && hasDef) reviewed++;
    else stubs++;
  }
  return { total: keys.length, reviewed, stubs };
}

/**
 * Aggregate stage counts from on-disk artifacts so the console can show a funnel.
 */
export function buildDictFunnel(rootDir, lang) {
  const artifacts = path.resolve(rootDir, 'evals', 'artifacts');
  const wordsPath = path.resolve(rootDir, 'data', `${lang}_words.txt`);
  const dictPath = path.resolve(rootDir, 'public', `${lang}.json`);
  const validityPath = path.join(artifacts, `validity_${lang}.json`);
  const prunePath = path.join(artifacts, `validity_remove_${lang}.txt`);
  const reviewPath = path.join(artifacts, `review_queue_${lang}.json`);
  const verbFormPath = path.join(artifacts, `verb_form_${lang}.json`);
  const rewritePath = path.join(artifacts, `verb_form_rewrite_queue_${lang}.json`);
  const remediatePath = path.join(artifacts, `remediate_progress_${lang}.json`);
  const scorecard = readJsonSafe(path.join(artifacts, 'dict-console', `scorecard_${lang}.json`));

  const seedCount = countLines(wordsPath);
  const dictStats = countReviewed(dictPath);
  const validity = readJsonSafe(validityPath, null);
  const pruneCount = countLines(prunePath);
  const review = readJsonSafe(reviewPath, null);
  const verbForm = readJsonSafe(verbFormPath, null);
  const rewrite = readJsonSafe(rewritePath, null);
  const remediate = readJsonSafe(remediatePath, null);

  const validityEvaluated =
    validity?.total ??
    validity?.results?.length ??
    (Array.isArray(validity?.entries) ? validity.entries.length : null);
  const validityPruned =
    validity?.removeCount ??
    pruneCount ??
    validity?.shouldRemoveCount ??
    validity?.pruneCount ??
    (Array.isArray(validity?.results)
      ? validity.results.filter((r) => r.shouldRemove).length
      : null);

  const reviewQueue = Array.isArray(review?.queue) ? review.queue.length : review?.total ?? null;
  const vf = verbForm
    ? {
        verbTagged: verbForm.verbTagged ?? verbForm.total ?? null,
        infinitive: verbForm.byVerdict?.infinitive ?? null,
        finiteKeptNonVerb: verbForm.finiteKeptNonVerbCount ?? null,
        needsPosRewrite:
          verbForm.needsPosRewriteCount ?? rewrite?.total ?? rewrite?.queue?.length ?? null,
        blockAsAnswer: verbForm.blockAsAnswerCount ?? null,
        generatedAt: verbForm.generatedAt ?? null,
      }
    : null;

  const stages = [
    {
      id: 'seed',
      title: 'Seed',
      count: seedCount,
      detail: seedCount == null ? 'No wordlist yet' : `${seedCount.toLocaleString()} 5-letter seeds`,
      delta: null,
    },
    {
      id: 'ingest',
      title: 'Ingest',
      count: dictStats.total,
      detail:
        dictStats.total == null
          ? 'No dictionary'
          : `${dictStats.total.toLocaleString()} entries in public/${lang}.json`,
      delta:
        seedCount != null && dictStats.total != null ? dictStats.total - seedCount : null,
    },
    {
      id: 'filter',
      title: 'Filter',
      count:
        validityEvaluated != null && validityPruned != null
          ? validityEvaluated - validityPruned
          : dictStats.total,
      detail:
        validityEvaluated == null
          ? 'No validity run'
          : `Evaluated ${validityEvaluated.toLocaleString()} · pruned ${
              validityPruned ?? '?'
            }`,
      delta: validityPruned != null ? -validityPruned : null,
      drop: validityPruned,
    },
    {
      id: 'enrich',
      title: 'Enrich',
      count: dictStats.reviewed,
      detail:
        dictStats.total == null
          ? '—'
          : `${dictStats.reviewed.toLocaleString()} reviewed · ${dictStats.stubs.toLocaleString()} stubs`,
      delta: null,
      stubs: dictStats.stubs,
    },
    {
      id: 'eval',
      title: 'Eval',
      count: reviewQueue,
      detail:
        reviewQueue == null
          ? 'No review queue'
          : `${reviewQueue.toLocaleString()} in review queue`,
      delta: null,
      queue: reviewQueue,
    },
    {
      id: 'verbform',
      title: 'Verb form',
      count: vf?.verbTagged ?? null,
      detail: vf
        ? `inf ${vf.infinitive ?? '?'} · keep ${vf.finiteKeptNonVerb ?? '?'} · rewrite ${vf.needsPosRewrite ?? '?'} · block ${vf.blockAsAnswer ?? '?'}`
        : 'Not run yet — npm run eval:dict:verb-form',
      delta: null,
      verbForm: vf,
    },
    {
      id: 'remediate',
      title: 'Remediate',
      count: remediate?.queueAfter ?? scorecard?.queueAfter ?? reviewQueue,
      detail: remediate
        ? `Queue ${remediate.queueBefore} → ${remediate.queueAfter} (${remediate.resolvedThisWave ?? 0} resolved)`
        : scorecard?.summary || 'No remediate wave yet',
      delta:
        remediate?.queueBefore != null && remediate?.queueAfter != null
          ? remediate.queueAfter - remediate.queueBefore
          : null,
    },
  ];

  return {
    lang,
    updatedAt: new Date().toISOString(),
    dictSize: dictStats.total,
    reviewed: dictStats.reviewed,
    stubs: dictStats.stubs,
    reviewQueue,
    stages,
    validity,
    verbForm,
    rewrite,
    remediate,
    scorecard,
  };
}

function pct(part, whole) {
  if (!whole || part == null) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

function stageStatus(status, stageId, funnelStage) {
  if (status?.running && status.step === stageId) {
    return status.paused ? 'queued' : 'running';
  }
  if (status?.phase === 'error' && status.step === stageId) return 'error';
  if (funnelStage?.queue > 0 || funnelStage?.verbForm?.needsPosRewrite > 0) return 'flagged';
  if (typeof funnelStage?.count === 'number' && funnelStage.count > 0) return 'success';
  if (funnelStage?.count == null) return 'idle';
  return 'idle';
}

/**
 * Scaffold PipelineGraph-compatible studio payload (stages + step graphs).
 */
export function buildPipelineStudio(rootDir, lang, funnel = null, status = null) {
  const f = funnel || buildDictFunnel(rootDir, lang);
  const byId = Object.fromEntries(f.stages.map((s) => [s.id, s]));
  const validity = f.validity;
  const verbForm = f.verbForm;
  const rewrite = f.rewrite;

  const STAGE_META = {
    seed: {
      name: 'Seed',
      description: 'OpenSubtitles FrequencyWords → 5-letter wordlist',
      type: 'transform',
      badge: 'TRANSFORM',
    },
    ingest: {
      name: 'Ingest',
      description: 'Stub dictionary JSON in public/{lang}.json',
      type: 'transform',
      badge: 'TRANSFORM',
    },
    filter: {
      name: 'Jev Lexical Filter',
      description: 'Definition-free validity screen + prune script',
      type: 'jev',
      badge: 'JEV+SCRIPT',
    },
    enrich: {
      name: 'Gemini Lexicography',
      description: 'POS + English definitions (prefer non-verb when dual sense)',
      type: 'llm',
      badge: 'GEMINI',
    },
    eval: {
      name: 'Jev Definition Eval',
      description: 'Accuracy, format, difficulty → review queue',
      type: 'jev',
      badge: 'JEV',
    },
    verbform: {
      name: 'Verb Form Screen',
      description: 'Infinitive vs finite; non-verb keep; POS rewrite queue',
      type: 'jev',
      badge: 'JEV',
    },
    remediate: {
      name: 'Remediate',
      description: 'Wave rewrite + difficulty calibration',
      type: 'llm',
      badge: 'AUTO-FIX',
    },
  };

  const stages = f.stages.map((s) => {
    const meta = STAGE_META[s.id] || {
      name: s.title,
      description: s.detail,
      type: 'transform',
      badge: s.id.toUpperCase(),
    };
    return {
      id: s.id,
      name: meta.name,
      description: meta.description,
      type: meta.type,
      status: stageStatus(status, s.id, s),
      itemCount: typeof s.count === 'number' ? s.count : 0,
      badge: meta.badge,
      summaryMetric: s.detail || undefined,
    };
  });

  /** @type {Record<string, object>} */
  const stepGraphs = {};

  // Filter step graph from validity artifact
  if (validity?.byVerdict) {
    const total = validity.total || 1;
    const options = Object.entries(validity.byVerdict).map(([key, count]) => ({
      key,
      label: key,
      count,
      percentage: pct(count, total),
      isFlag: key !== 'valid',
    }));
    const kept = byId.filter?.count ?? total - (validity.removeCount || 0);
    const pruned = validity.removeCount || 0;
    stepGraphs.filter = {
      stageId: 'filter',
      stageName: 'Lexical Validity Filter',
      stageType: 'jev',
      scriptLabel: 'applyValidityPrune.ts',
      source: {
        label: 'Ingested dictionary',
        sublabel: lang.toUpperCase(),
        count: total,
        description: 'Candidates evaluated by Jev lexical + form dual signal',
      },
      questionNodes: [
        {
          id: 'filter-lexical',
          type: 'choice',
          title: 'Jev Lexical Validity',
          subtitle: 'Names, foreign leaks, gibberish',
          options,
        },
      ],
      scriptNode: {
        id: 'filter-script',
        type: 'script',
        title: 'decideShouldRemove()',
        subtitle: 'Dual-signal prune thresholds',
        filePath: 'scripts/applyValidityPrune.ts',
        consumedInputs: ['lexical.verdict', 'lexical.confidence', 'form.verdict'],
        ruleBadge: 'hardReject / validDisagree / soft band',
        codeSnippet: `if (shouldRemove(result, thresholds)) {
  prune(word);
} else {
  keep(word);
}`,
        decisionStats: {
          primaryLabel: 'pruned',
          primaryCount: pruned,
          secondaryLabel: 'kept',
          secondaryCount: kept,
        },
      },
      destinationBuckets: [
        {
          id: 'kept',
          title: 'Kept for enrich',
          count: kept,
          percentage: pct(kept, total),
          intent: 'success',
        },
        {
          id: 'pruned',
          title: 'Pruned',
          count: pruned,
          percentage: pct(pruned, total),
          intent: 'error',
          isFlag: true,
        },
      ],
    };
  }

  // Verb-form step graph
  if (verbForm?.byVerdict) {
    const total = verbForm.total || verbForm.verbTagged || 1;
    const inf = verbForm.byVerdict.infinitive || 0;
    const finite = verbForm.byVerdict.finite || 0;
    const notVerb = verbForm.byVerdict.not_a_verb || 0;
    const keep = verbForm.finiteKeptNonVerbCount || 0;
    const rewriteN =
      verbForm.needsPosRewriteCount ?? rewrite?.total ?? rewrite?.queue?.length ?? 0;
    const block = verbForm.blockAsAnswerCount || 0;
    stepGraphs.verbform = {
      stageId: 'verbform',
      stageName: 'Verb Form Answer Eligibility',
      stageType: 'jev',
      scriptLabel: 'evals/dictionary/verbForm.ts',
      source: {
        label: 'Verb-tagged entries',
        sublabel: lang.toUpperCase(),
        count: total,
        description: 'POS includes verb (slash tags OK)',
      },
      questionNodes: [
        {
          id: 'vf-form',
          type: 'choice',
          title: 'Verb form',
          subtitle: 'Infinitive vs finite vs not-a-verb',
          options: [
            { key: 'infinitive', label: 'infinitive', count: inf, percentage: pct(inf, total) },
            { key: 'finite', label: 'finite', count: finite, percentage: pct(finite, total) },
            {
              key: 'not_a_verb',
              label: 'not_a_verb',
              count: notVerb,
              percentage: pct(notVerb, total),
              isFlag: true,
            },
          ],
        },
        {
          id: 'vf-alt',
          type: 'choice',
          title: 'Non-verb rewrite?',
          subtitle: 'Participle/adj/noun reading for answer pool',
          options: [
            {
              key: 'keep_nonverb_def',
              label: 'keep (already non-verb def)',
              count: keep,
              percentage: pct(keep, total),
            },
            {
              key: 'rewrite_as_non_verb',
              label: 'needs POS rewrite',
              count: rewriteN,
              percentage: pct(rewriteN, total),
              isFlag: true,
            },
            {
              key: 'block_conjugation',
              label: 'block as answer (conjugation-only)',
              count: block,
              percentage: pct(block, total),
              isFlag: true,
            },
          ],
        },
      ],
      destinationBuckets: [
        {
          id: 'answer_ok',
          title: 'Answer-eligible verbs',
          count: inf + keep,
          percentage: pct(inf + keep, total),
          intent: 'success',
          description: 'Infinitives + finite with non-verb definitions',
        },
        {
          id: 'rewrite',
          title: 'POS rewrite queue',
          count: rewriteN,
          percentage: pct(rewriteN, total),
          intent: 'warning',
          isFlag: true,
        },
        {
          id: 'block',
          title: 'Guessable only',
          count: block,
          percentage: pct(block, total),
          intent: 'error',
          isFlag: true,
        },
      ],
    };
  }

  // Eval / remediate lightweight graphs
  const queue = f.reviewQueue ?? 0;
  const dictSize = f.dictSize || 1;
  stepGraphs.eval = {
    stageId: 'eval',
    stageName: 'Definition Eval → Review Queue',
    stageType: 'jev',
    source: {
      label: 'Enriched dictionary',
      count: f.reviewed ?? dictSize,
      description: 'Jev accuracy / format / difficulty',
    },
    questionNodes: [],
    destinationBuckets: [
      {
        id: 'clean',
        title: 'Clean',
        count: Math.max(0, (f.reviewed ?? dictSize) - queue),
        percentage: pct(Math.max(0, (f.reviewed ?? dictSize) - queue), f.reviewed ?? dictSize),
        intent: 'success',
      },
      {
        id: 'review',
        title: 'Review queue',
        count: queue,
        percentage: pct(queue, f.reviewed ?? dictSize),
        intent: 'warning',
        isFlag: true,
      },
    ],
  };

  if (f.remediate || f.scorecard) {
    const before = f.remediate?.queueBefore ?? f.scorecard?.queueBefore ?? queue;
    const after = f.remediate?.queueAfter ?? f.scorecard?.queueAfter ?? queue;
    const resolved = f.remediate?.resolvedThisWave ?? f.scorecard?.resolved ?? Math.max(0, before - after);
    stepGraphs.remediate = {
      stageId: 'remediate',
      stageName: 'Remediation Wave',
      stageType: 'llm',
      source: {
        label: 'Review queue',
        count: before,
        description: 'Includes verb-form POS rewrite merges',
      },
      questionNodes: [],
      destinationBuckets: [
        {
          id: 'resolved',
          title: 'Resolved this wave',
          count: resolved,
          percentage: pct(resolved, before || 1),
          intent: 'success',
        },
        {
          id: 'remaining',
          title: 'Still queued',
          count: after,
          percentage: pct(after, before || 1),
          intent: 'warning',
          isFlag: after > 0,
        },
      ],
    };
  }

  // Generic transform stages
  for (const id of ['seed', 'ingest', 'enrich']) {
    const s = byId[id];
    if (!s || stepGraphs[id]) continue;
    stepGraphs[id] = {
      stageId: id,
      stageName: STAGE_META[id]?.name || s.title,
      stageType: STAGE_META[id]?.type || 'transform',
      source: {
        label: s.title,
        count: typeof s.count === 'number' ? s.count : 0,
        description: s.detail,
      },
      questionNodes: [],
      destinationBuckets: [
        {
          id: `${id}-out`,
          title: 'Output',
          count: typeof s.count === 'number' ? s.count : 0,
          percentage: 100,
          intent: 'success',
          description: s.detail,
        },
      ],
    };
  }

  return {
    lang,
    updatedAt: f.updatedAt,
    stages,
    stepGraphs,
    slices: {},
  };
}
