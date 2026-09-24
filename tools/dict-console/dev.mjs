#!/usr/bin/env node
/**
 * Starts API (:4092) + Vite UI (:4091) for the dictionary console.
 * UI resolves @scaffold/ui from ~/Documents/Projects/scaffold source (HMR).
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const API_PORT = process.env.DICT_CONSOLE_API_PORT || '4092';
const UI_PORT = process.env.DICT_CONSOLE_UI_PORT || '4091';

const children = [];

function run(command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (signal) return;
    for (const c of children) {
      if (c !== child && !c.killed) c.kill('SIGTERM');
    }
    process.exit(code ?? 1);
  });
  return child;
}

function shutdown() {
  for (const c of children) {
    if (!c.killed) c.kill('SIGTERM');
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log(`Dict console UI  → http://127.0.0.1:${UI_PORT}`);
console.log(`Dict console API → http://127.0.0.1:${API_PORT}`);
console.log(`Scaffold UI src  → ${path.resolve(ROOT, '../scaffold/packages/ui/src')}`);

run('node', ['tools/dict-console/server.mjs'], {
  DICT_CONSOLE_PORT: API_PORT,
  DICT_CONSOLE_API_ONLY: '1',
});

run(
  'npx',
  ['vite', '--config', 'tools/dict-console/vite.config.ts'],
  {
    DICT_CONSOLE_API_PORT: API_PORT,
    DICT_CONSOLE_UI_PORT: UI_PORT,
  }
);
