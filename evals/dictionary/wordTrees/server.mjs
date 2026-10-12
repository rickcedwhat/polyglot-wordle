// Serves the word-trees page and saves look-over decisions to evals/dictionary/overrides.json.
// Usage: npm run eval:dict:trees [-- --port=5199]   (rebuilds the page first)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const PAGE = path.join(ROOT, 'evals/artifacts/word-trees.html');
const FILE = path.join(ROOT, 'evals/dictionary/overrides.json');
const portArg = process.argv.find((a) => a.startsWith('--port='));
const PORT = Number(portArg?.split('=')[1] ?? process.env.PORT ?? 5199);
const FATES = ['answer', 'guess_only', 'removed'];
const LEVELS = ['easy', 'intermediate', 'advanced'];

function build() {
  execSync('npx vite-node --script evals/dictionary/wordTrees/buildPage.ts', {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

const read = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));
function write(data) {
  const sorted = Object.fromEntries(
    Object.keys(data)
      .sort()
      .filter((l) => Object.keys(data[l]).length)
      .map((l) => [
        l,
        Object.fromEntries(
          Object.keys(data[l])
            .sort()
            .map((w) => [w, data[l][w]])
        ),
      ])
  );
  fs.writeFileSync(FILE, `${JSON.stringify(sorted, null, 2)}\n`);
  return sorted;
}

function body(req) {
  return new Promise((resolve, reject) => {
    let s = '';
    req.on('data', (c) => (s += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(s || '{}'));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function send(res, status, data, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(data) : data);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (url.pathname === '/' || url.pathname === '/word-trees.html') {
      return send(res, 200, fs.readFileSync(PAGE, 'utf8'), 'text/html; charset=utf-8');
    }
    if (url.pathname === '/api/overrides' && req.method === 'GET') {
      return send(res, 200, read());
    }
    if (url.pathname === '/api/overrides' && req.method === 'POST') {
      const { lang, word, fate, difficulty, reason } = await body(req);
      if (!/^[a-z]{2}$/.test(lang) || typeof word !== 'string' || !word || !FATES.includes(fate)) {
        return send(res, 400, { error: 'lang, word and fate are required' });
      }
      if (difficulty !== undefined && !LEVELS.includes(difficulty)) {
        return send(res, 400, { error: 'bad difficulty' });
      }
      const data = read();
      data[lang] ??= {};
      data[lang][word] = {
        fate,
        ...(fate === 'answer' && difficulty ? { difficulty } : {}),
        reason: String(reason || 'Looked over in review mode.'),
        date: new Date().toISOString().slice(0, 10),
      };
      return send(res, 200, write(data));
    }
    if (url.pathname === '/api/overrides' && req.method === 'DELETE') {
      const data = read();
      delete data[url.searchParams.get('lang')]?.[url.searchParams.get('word')];
      return send(res, 200, write(data));
    }
    send(res, 404, { error: 'not found' });
  } catch (err) {
    send(res, 500, { error: String(err) });
  }
});

build();
server.listen(PORT, () => console.log(`Word trees: http://localhost:${PORT}/word-trees.html`));
