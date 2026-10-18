interface IndexField {
  fieldPath: string;
  order?: string;
  arrayConfig?: string;
}

export interface DeploymentIndex {
  collectionGroup: string;
  queryScope: string;
  fields: IndexField[];
  state?: string;
}

const signature = (index: DeploymentIndex) =>
  JSON.stringify([
    index.collectionGroup,
    index.queryScope,
    index.fields.map(({ fieldPath, order, arrayConfig }) => [fieldPath, order, arrayConfig]),
  ]);

/** Gate Hosting on every configured composite index; fail closed on timeout or repair errors. */
export async function waitForFirestoreIndexes({
  expected,
  listIndexes,
  now = Date.now,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  timeoutMs = 20 * 60_000,
  pollMs = 10_000,
  log = () => {},
}: {
  expected: DeploymentIndex[];
  listIndexes: () => Promise<DeploymentIndex[]>;
  now?: () => number;
  sleep?: (ms: number) => Promise<unknown>;
  timeoutMs?: number;
  pollMs?: number;
  log?: (message: string) => void;
}): Promise<void> {
  const deadline = now() + timeoutMs;
  while (true) {
    const live = new Map((await listIndexes()).map((index) => [signature(index), index]));
    const pending = expected.filter((index) => live.get(signature(index))?.state !== 'READY');
    if (pending.length === 0) {
      log('All configured Firestore indexes are READY.');
      return;
    }
    if (pending.some((index) => live.get(signature(index))?.state === 'NEEDS_REPAIR')) {
      throw new Error('A required Firestore index NEEDS_REPAIR; Hosting deployment stopped.');
    }
    const remaining = deadline - now();
    if (remaining <= 0) {
      throw new Error(
        `Timed out waiting for ${pending.length} Firestore index(es); Hosting deployment stopped.`
      );
    }
    log(`Waiting for ${pending.length} Firestore index(es) to become READY.`);
    await sleep(Math.min(pollMs, remaining));
  }
}
