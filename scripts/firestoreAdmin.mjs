/**
 * Read-only Firestore access for local scripts, using the service-account key at
 * FIREBASE_SERVICE_ACCOUNT (default ~/.config/polyglot-wordle-admin.json).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const keyPath = (
  process.env.FIREBASE_SERVICE_ACCOUNT || '~/.config/polyglot-wordle-admin.json'
).replace(/^~/, os.homedir());

const sa = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = crypto
    .sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key)
    .toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

/** Firestore typed value -> plain JS. */
function decode(value) {
  if (value == null) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  if ('nullValue' in value) return null;
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, decode(v)])
    );
  }
  return value;
}

/** Every document in a top-level collection, as `{ id, ...fields }`. */
export async function fetchCollection(name) {
  const token = await getAccessToken();
  const base = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
  const docs = [];
  let pageToken;
  do {
    const url = new URL(`${base}/${name}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json.error) throw new Error(JSON.stringify(json.error));
    for (const doc of json.documents || []) {
      docs.push({ id: path.basename(doc.name), ...decode({ mapValue: { fields: doc.fields } }) });
    }
    pageToken = json.nextPageToken;
  } while (pageToken);
  return docs;
}
