import fs from 'fs';
import path from 'path';

/** Loads .env.local then .env into process.env without overriding existing values. */
export function loadEnv() {
  for (const rel of ['.env.local', '.env']) {
    const file = path.resolve(process.cwd(), rel);
    if (!fs.existsSync(file)) {
      continue;
    }
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eq = trimmed.indexOf('=');
      if (eq < 0) {
        continue;
      }
      const key = trimmed.slice(0, eq);
      const val = trimmed.slice(eq + 1).replace(/^["']|["']$/g, '');
      if (key && val && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

/** Runs `worker` over `items` with at most `concurrency` in flight, keeping input order. */
export async function mapPool<T, R>(
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
