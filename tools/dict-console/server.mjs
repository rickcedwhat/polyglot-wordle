#!/usr/bin/env node
/**
 * Local dictionary development console API.
 *
 * Prefer: npm run dict:console  → Vite UI :4091 + this API :4092
 * Artifacts: evals/artifacts/dict-console/
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import {
  createDictConsole,
  dictConsolePaths,
  readDictConsoleSnapshot,
  readEventsTail,
} from '../../scripts/dictConsoleState.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.DICT_CONSOLE_PORT || 4092);
const API_ONLY = process.env.DICT_CONSOLE_API_ONLY === '1' || process.env.DICT_CONSOLE_API_ONLY === 'true';

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  pt: 'Portuguese',
  it: 'Italian',
  de: 'German',
};

/** @type {Map<string, import('child_process').ChildProcess>} */
const running = new Map();

function loadEnv() {
  for (const rel of ['.env.local', '.env']) {
    const file = path.join(ROOT_DIR, rel);
    if (!fs.existsSync(file)) continue;
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && val && !process.env[key]) process.env[key] = val;
    }
  }
}
loadEnv();

function sendJson(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function parseUrl(req) {
  return new URL(req.url || '/', `http://localhost:${PORT}`);
}

function normalizeLang(lang) {
  if (!lang || !/^[a-z]{2}$/.test(lang)) {
    throw new Error('lang must be a two-letter lowercase code (e.g. pt)');
  }
  return lang;
}

function serveStatic(req, res) {
  const url = parseUrl(req);
  let rel = url.pathname === '/' ? '/index.html' : url.pathname;
  rel = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end('Not found');
    return;
  }
  const ext = path.extname(file);
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
  };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

function startPipeline({ lang, step, rewriteLimit, name, batchSize }) {
  if (running.has(lang)) {
    const existing = running.get(lang);
    if (existing && !existing.killed && existing.exitCode === null) {
      throw new Error(`Pipeline already running for ${lang} (pid ${existing.pid})`);
    }
    running.delete(lang);
  }

  const args = [
    'run',
    'bootstrap:dict',
    '--',
    `--lang=${lang}`,
    `--step=${step}`,
  ];
  if (name) args.push(`--name=${name}`);
  if (step === 'remediate' || step === 'wave' || rewriteLimit !== undefined) {
    args.push(`--rewrite-limit=${rewriteLimit ?? 80}`);
  }
  if (step === 'wave') {
    args.push(`--wave-size=${rewriteLimit ?? 80}`);
  }
  if (batchSize) args.push(`--batch-size=${batchSize}`);
  const child = spawn('npm', args, {
    cwd: ROOT_DIR,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  running.set(lang, child);

  const consoleState = createDictConsole(ROOT_DIR, lang);
  consoleState.event('console_spawn', `Spawned npm ${args.join(' ')}`, { pid: child.pid, args });

  const pipeLog = (chunk, stream) => {
    const text = chunk.toString('utf8').trimEnd();
    if (!text) return;
    for (const line of text.split('\n').slice(-5)) {
      consoleState.event('log', line.slice(0, 400), { stream });
    }
  };
  child.stdout.on('data', (c) => pipeLog(c, 'stdout'));
  child.stderr.on('data', (c) => pipeLog(c, 'stderr'));

  child.on('exit', (code, signal) => {
    running.delete(lang);
    consoleState.event('console_exit', `Child exited code=${code} signal=${signal}`, {
      code,
      signal,
    });
    // If the child crashed before endRun, mark idle/error.
    const status = consoleState.readStatus();
    if (status.running) {
      consoleState.endRun({
        ok: code === 0,
        error: code === 0 ? null : `exited with code ${code}`,
      });
    }
  });

  return { pid: child.pid, args };
}

async function handleApi(req, res) {
  const url = parseUrl(req);
  const route = url.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  try {
    if (route === '/api/health') {
      return sendJson(res, 200, { ok: true, port: PORT, root: ROOT_DIR });
    }

    if (route === '/api/snapshot' && req.method === 'GET') {
      const lang = normalizeLang(url.searchParams.get('lang') || 'pt');
      const tail = Number(url.searchParams.get('tail') || 40);
      return sendJson(res, 200, readDictConsoleSnapshot(ROOT_DIR, lang, { eventTail: tail }));
    }

    if (route === '/api/status' && req.method === 'GET') {
      const lang = normalizeLang(url.searchParams.get('lang') || 'pt');
      const { status } = dictConsolePaths(ROOT_DIR, lang);
      const consoleState = createDictConsole(ROOT_DIR, lang);
      return sendJson(res, 200, consoleState.readStatus());
    }

    if (route === '/api/latest-batch' && req.method === 'GET') {
      const lang = normalizeLang(url.searchParams.get('lang') || 'pt');
      const { latestBatch } = dictConsolePaths(ROOT_DIR, lang);
      if (!fs.existsSync(latestBatch)) return sendJson(res, 200, null);
      return sendJson(res, 200, JSON.parse(fs.readFileSync(latestBatch, 'utf8')));
    }

    if (route === '/api/scorecard' && req.method === 'GET') {
      const lang = normalizeLang(url.searchParams.get('lang') || 'pt');
      const { scorecard } = dictConsolePaths(ROOT_DIR, lang);
      if (!fs.existsSync(scorecard)) return sendJson(res, 200, null);
      return sendJson(res, 200, JSON.parse(fs.readFileSync(scorecard, 'utf8')));
    }

    if (route === '/api/events' && req.method === 'GET') {
      const lang = normalizeLang(url.searchParams.get('lang') || 'pt');
      const tail = Number(url.searchParams.get('tail') || 50);
      return sendJson(res, 200, { lang, events: readEventsTail(ROOT_DIR, lang, tail) });
    }

    if (route === '/api/pause' && req.method === 'POST') {
      const body = await readBody(req);
      const lang = normalizeLang(body.lang || url.searchParams.get('lang') || 'pt');
      createDictConsole(ROOT_DIR, lang).requestPause();
      return sendJson(res, 200, { ok: true, pause: true, lang });
    }

    if (route === '/api/resume' && req.method === 'POST') {
      const body = await readBody(req);
      const lang = normalizeLang(body.lang || url.searchParams.get('lang') || 'pt');
      createDictConsole(ROOT_DIR, lang).clearPause();
      return sendJson(res, 200, { ok: true, pause: false, lang });
    }

    if (route === '/api/run' && req.method === 'POST') {
      const body = await readBody(req);
      const lang = normalizeLang(body.lang || 'pt');
      const step = body.step || 'remediate';
      const allowed = new Set([
        'seed',
        'ingest',
        'filter',
        'enrich',
        'eval',
        'remediate',
        'wave',
        'test',
      ]);
      if (!allowed.has(step)) {
        return sendJson(res, 400, { error: `Unsupported step: ${step}` });
      }
      const started = startPipeline({
        lang,
        step,
        rewriteLimit: body.rewriteLimit ?? 80,
        name: body.name || LANGUAGE_NAMES[lang] || lang,
        batchSize: body.batchSize,
      });
      return sendJson(res, 200, { ok: true, lang, step, ...started });
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    sendJson(res, 400, { error: err.message || String(err) });
  }
}

const server = http.createServer((req, res) => {
  if ((req.url || '').startsWith('/api/')) {
    handleApi(req, res).catch((err) => sendJson(res, 500, { error: String(err) }));
    return;
  }
  if (API_ONLY) {
    sendJson(res, 404, {
      error: 'UI is served by Vite on port 4091 — use npm run dict:console',
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Dictionary console API → http://127.0.0.1:${PORT}`);
  console.log(`Artifacts → ${path.join(ROOT_DIR, 'evals', 'artifacts', 'dict-console')}`);
  if (API_ONLY) {
    console.log('API-only mode (UI via Vite on :4091)');
  } else {
    console.log(`Static UI → http://127.0.0.1:${PORT} (legacy public/)`);
  }
  console.log(`Agent tip: curl -s http://127.0.0.1:${PORT}/api/snapshot?lang=pt | jq`);
});
