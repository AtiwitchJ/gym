import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import {
  mergeRestFromServer,
  syncRestFromServer,
  pushRestToServer,
  flushPendingRest,
  readPendingRest,
  queueRestPush,
  readRestMap,
  getCustomRest,
  saveCustomRest,
  restRevision,
  PENDING_REST_STORAGE_KEY,
  CUSTOM_REST_STORAGE_KEY
} from '../src/composables/useCustomRest.js';

/**
 * Custom rest per exercise, stored in SQLite (server) with a localStorage cache (browser).
 * Covers: the server table and repository, the request validation, and the client sync
 * (merge from the server, push, offline queue, retry).
 */

const require = createRequire(import.meta.url);

// A standalone run needs its own throwaway database; scripts/run-tests.js already sets one.
const ownDb = !process.env.GYM_DB_PATH;
if (ownDb) {
  process.env.GYM_DB_PATH = path.join(os.tmpdir(), `gym-rest-test-${process.pid}.db`);
  process.env.GYM_FORBID_REAL_DB = '1';
}
const repo = require('../server/db.js');
const exerciseRest = require('../server/exercise-rest.js');

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
    raw: data
  };
}

function fakeFetch(handler) {
  return async (url, options) => handler(url, options);
}

const ok = (body) => ({ ok: true, status: 200, json: async () => body });

console.log('====================================================');
console.log('🧪 QA Test: Custom rest per exercise stored in SQLite and synced');
console.log('====================================================\n');

console.log('▶ [1] The server refuses anything but whole seconds 10–600 and a real exercise id...');
assert.strictEqual(exerciseRest.MIN_SECONDS, 10);
assert.strictEqual(exerciseRest.MAX_SECONDS, 600);
assert.strictEqual(exerciseRest.validateSeconds(10), 10);
assert.strictEqual(exerciseRest.validateSeconds(600), 600);
assert.strictEqual(exerciseRest.validateSeconds('120'), 120, 'a numeric string is accepted');
for (const bad of [9, 601, 0, -30, 90.5, '90.5', '', null, undefined, true, {}]) {
  assert.throws(() => exerciseRest.validateSeconds(bad), /seconds must be a whole number/, `seconds ${JSON.stringify(bad)} must be rejected`);
}
assert.throws(() => exerciseRest.validateSeconds(9), (err) => err.status === 400, 'validation errors are HTTP 400');
assert.strictEqual(exerciseRest.validateExerciseId('  a1  '), 'a1', 'the id is trimmed');
for (const bad of ['', '   ', null, 42, 'x'.repeat(101)]) {
  assert.throws(() => exerciseRest.validateExerciseId(bad), /exerciseId/, `id ${JSON.stringify(bad)} must be rejected`);
}
console.log('  ✓ range, whole numbers and ids\n');

console.log('▶ [2] SQLite keeps one value per exercise and overwrites on save...');
assert.notStrictEqual(path.resolve(repo.getDbPath()), path.resolve('data/gym.db'), 'the test never opens the real database');
const tables = repo.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
assert.ok(tables.includes('exercise_rest'), 'the exercise_rest table exists');
repo.saveExerciseRest('a1', 90);
repo.saveExerciseRest('a2', 150);
assert.deepStrictEqual(repo.getExerciseRest(), { a1: 90, a2: 150 }, 'two exercises are stored side by side');
repo.saveExerciseRest('a1', 120);
assert.strictEqual(repo.getExerciseRest().a1, 120, 'saving again overwrites, it does not duplicate');
const row = repo.db.prepare('SELECT seconds, updated_at FROM exercise_rest WHERE exercise_id = ?').get('a1');
assert.strictEqual(row.seconds, 120);
assert.ok(row.updated_at && !Number.isNaN(Date.parse(row.updated_at)), 'updated_at is an ISO time');
assert.strictEqual(repo.db.prepare('SELECT COUNT(*) c FROM exercise_rest').get().c, 2, 'still two rows');
console.log('  ✓ one row per exercise, upsert works\n');

console.log('▶ [3] The server map wins in the local cache; out-of-range values are ignored...');
const storage = memoryStorage();
storage.setItem(CUSTOM_REST_STORAGE_KEY, JSON.stringify({ a1: 60, keep: 200 }));
const changed = mergeRestFromServer({ a1: 90, a2: 150, bad: 5000, worse: 'x' }, storage);
assert.strictEqual(changed, 2, 'a1 changed and a2 is new; bad values ignored');
assert.deepStrictEqual(readRestMap(storage), { a1: 90, keep: 200, a2: 150 }, 'local-only value "keep" survives');
assert.strictEqual(getCustomRest('a1', storage), 90);
assert.strictEqual(mergeRestFromServer({ a1: 90 }, storage), 0, 'a second merge changes nothing');
assert.ok(restRevision.value > 0, 'the card is told to refresh');
console.log('  ✓ server wins, local-only values kept, invalid ignored\n');

console.log('▶ [4] A save reaches the server; a failed save is queued and retried later...');
const store = memoryStorage();
const sent = [];
const workingFetch = fakeFetch((url, options) => {
  sent.push({ url, method: options.method, body: JSON.parse(options.body) });
  return ok({ success: true });
});
const pushed = await pushRestToServer('a1', 120, { fetchImpl: workingFetch, storage: store });
assert.deepStrictEqual(pushed, { ok: true });
assert.strictEqual(sent[0].url, '/api/exercise-rest/a1');
assert.strictEqual(sent[0].method, 'PUT');
assert.deepStrictEqual(sent[0].body, { seconds: 120 });
assert.deepStrictEqual(readPendingRest(store), {}, 'nothing is left in the queue');

const offlineFetch = fakeFetch(() => { throw new Error('offline'); });
const failed = await pushRestToServer('a2', 150, { fetchImpl: offlineFetch, storage: store });
assert.strictEqual(failed.ok, false);
assert.strictEqual(failed.queued, true, 'an offline save is queued, not lost');
assert.deepStrictEqual(readPendingRest(store), { a2: 150 });

const failing = await pushRestToServer('a3', 180, { fetchImpl: fakeFetch(() => ({ ok: false, status: 500 })), storage: store });
assert.strictEqual(failing.ok, false);
assert.strictEqual(readPendingRest(store).a3, 180, 'a 500 is queued too');

const flushed = await flushPendingRest({ fetchImpl: workingFetch, storage: store });
assert.strictEqual(flushed.ok, true);
assert.strictEqual(flushed.sent, 2, 'both queued values go out');
assert.deepStrictEqual(readPendingRest(store), {}, 'the queue is empty afterwards');
assert.deepStrictEqual(sent.slice(1).map((s) => s.url), ['/api/exercise-rest/a2', '/api/exercise-rest/a3']);

queueRestPush('a9', 240, store);
assert.strictEqual(readPendingRest(store).a9, 240);
assert.strictEqual(store.getItem(PENDING_REST_STORAGE_KEY) !== null, true);
const noFetch = await flushPendingRest({ fetchImpl: null, storage: store });
assert.strictEqual(noFetch.ok, false, 'without a network nothing is sent and nothing is lost');
assert.strictEqual(readPendingRest(store).a9, 240);
console.log('  ✓ push, queue on failure, retry, empty queue\n');

console.log('▶ [5] Sync pulls the server map, then retries queued values; offline never throws...');
const syncStore = memoryStorage();
queueRestPush('a3', 180, syncStore);
const syncFetch = fakeFetch((url) => {
  if (url === '/api/exercise-rest') return ok({ a1: 120, a2: 150 });
  return ok({ success: true });
});
const synced = await syncRestFromServer({ fetchImpl: syncFetch, storage: syncStore });
assert.strictEqual(synced.ok, true);
assert.strictEqual(synced.changed, 2, 'a1 and a2 arrive from the server');
assert.strictEqual(synced.sent, 1, 'the queued a3 goes out in the same pass');
assert.deepStrictEqual(readRestMap(syncStore), { a1: 120, a2: 150 }, 'the cache now matches the server');
assert.deepStrictEqual(readPendingRest(syncStore), {});

const broken = await syncRestFromServer({ fetchImpl: fakeFetch(() => { throw new Error('offline'); }), storage: syncStore });
assert.strictEqual(broken.ok, false);
assert.deepStrictEqual(readRestMap(syncStore), { a1: 120, a2: 150 }, 'the cache is untouched when the server is unreachable');
const noServer = await syncRestFromServer({ fetchImpl: fakeFetch(() => ({ ok: false, status: 503 })), storage: syncStore });
assert.strictEqual(noServer.ok, false, 'a 503 is reported, not thrown');
console.log('  ✓ sync, retry in the same pass, offline safe\n');

console.log('▶ [6] The browser save keeps the local value and queues when the server is down...');
const saveStore = memoryStorage();
const saved = saveCustomRest('a1', '135', saveStore);
assert.deepStrictEqual(saved, { ok: true, seconds: 135 });
assert.strictEqual(getCustomRest('a1', saveStore), 135, 'the value is in the cache at once');
assert.deepStrictEqual(readPendingRest(saveStore), {}, 'no push happens outside a browser (no window)');
console.log('  ✓ local save first\n');

console.log('✅ custom rest persistence checks passed');

if (ownDb) {
  try {
    repo.db.close();
    for (const suffix of ['', '-wal', '-shm']) {
      const file = `${process.env.GYM_DB_PATH}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  } catch (err) {
    // cleanup only
  }
}
