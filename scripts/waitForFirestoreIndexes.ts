import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { waitForFirestoreIndexes, type DeploymentIndex } from './firestoreIndexReadiness';

// Reuse the pinned firebase-tools client's authentication and index normalization.
// Its deploy command submits index creation without waiting for READY.
const require = createRequire(import.meta.url);
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { FirestoreApi } = require('firebase-tools/lib/firestore/api');
const project = process.argv[process.argv.indexOf('--project') + 1];
if (!process.argv.includes('--project') || !project || project.startsWith('-')) {
  throw new Error(
    'Usage: vite-node --script scripts/waitForFirestoreIndexes.ts -- --project PROJECT'
  );
}
await requireAuth({ project, nonInteractive: true });
const api = new FirestoreApi();
const spec = JSON.parse(readFileSync('firestore.indexes.json', 'utf8'));
await waitForFirestoreIndexes({
  expected: spec.indexes.map((index: DeploymentIndex) =>
    FirestoreApi.processIndex({ ...index, fields: [...index.fields] })
  ),
  listIndexes: async () => {
    const indexes: DeploymentIndex[] = [];
    let pageToken: string | undefined;
    do {
      const response = await api.apiClient.get(
        `/projects/${project}/databases/(default)/collectionGroups/-/indexes`,
        { queryParams: { pageSize: 1000, ...(pageToken ? { pageToken } : {}) } }
      );
      for (const index of response.body.indexes ?? []) {
        indexes.push({
          ...index,
          collectionGroup: index.name.split('/collectionGroups/')[1].split('/')[0],
        });
      }
      pageToken = response.body.nextPageToken;
    } while (pageToken);
    return indexes;
  },
  // This script runs only in the deployment job, with no credential values in its output.
  log: console.log,
});
