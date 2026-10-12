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
const QUESTION = /^[a-zA-Z_]{1,40}$/;

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
      const { lang, word, question, choice, fate, difficulty, reason } = await body(req);
      if (!/^[a-z]{2}$/.test(lang) || typeof word !== 'string' || !word) {
        return send(res, 400, { error: 'lang and word are required' });
      }
      const data = read();
      data[lang] ??= {};
      const date = new Date().toISOString().slice(0, 10);
      if (question !== undefined) {
        if (!QUESTION.test(question) || typeof choice !== 'string' || !QUESTION.test(choice)) {
          return send(res, 400, { error: 'bad question or choice' });
        }
        const entry = data[lang][word] ?? {};
        entry.answers = { ...entry.answers, [question]: choice };
        entry.date = date;
        if (reason) {
          entry.reason = String(reason);
        }
        data[lang][word] = entry;
        return send(res, 200, write(data));
      }
      if (!FATES.includes(fate) || (difficulty !== undefined && !LEVELS.includes(difficulty))) {
        return send(res, 400, { error: 'bad fate or difficulty' });
      }
      data[lang][word] = {
        fate,
        ...(fate === 'answer' && difficulty ? { difficulty } : {}),
        ...(reason ? { reason: String(reason) } : {}),
        date,
      };
      return send(res, 200, write(data));
    }
    if (url.pathname === '/api/overrides' && req.method === 'DELETE') {
      const data = read();
      const lang = url.searchParams.get('lang');
      const word = url.searchParams.get('word');
      const question = url.searchParams.get('question');
      const entry = data[lang]?.[word];
      if (entry && question && entry.answers) {
        delete entry.answers[question];
        if (!Object.keys(entry.answers).length) {
          delete entry.answers;
        }
        if (!entry.fate && !entry.answers) {
          delete data[lang][word];
        }
      } else if (entry) {
        delete data[lang][word];
      }
      return send(res, 200, write(data));
    }
    send(res, 404, { error: 'not found' });
  } catch (err) {
    send(res, 500, { error: String(err) });
  }
});

build();
server.listen(PORT, () => console.log(`Word trees: http://localhost:${PORT}/word-trees.html`));
