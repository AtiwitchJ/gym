import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: Body Measurements Tracker
 * Spec reference: GYM Manager brief for the Body Measurements Tracker round.
 *
 * Covers:
 * 1. Save + fetch through GET /api/body-measurements.
 * 2. Duplicate date updates the existing row (no duplicate rows).
 * 3. GET /api/body-measurements/latest returns entry + trend against the previous recording.
 * 4. Partial measurement (only some sites) is allowed.
 * 5. Invalid date / out-of-range value is rejected with HTTP 400.
 * 6. Empty database returns entries: [] and latest entry: null.
 *
 * Never touches data/gym.db: temp DB + GYM_FORBID_REAL_DB=1.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-body-measurements-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');
const bm = await import('../server/body-measurements.js');
const mod = bm.default || bm;

const {
  MEASUREMENT_KEYS,
  validateBodyMeasurement,
  computeMeasurementTrend
} = mod;

console.log('====================================================');
console.log('🧪 QA Test: Body Measurements Tracker API');
console.log('====================================================\n');

assert.ok(Array.isArray(MEASUREMENT_KEYS));
assert.deepStrictEqual(MEASUREMENT_KEYS, ['waist', 'chest', 'arm', 'thigh', 'hip']);

const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api/body-measurements`;

async function getJson(url) {
  const res = await fetch(url);
  return { status: res.status, body: await res.json() };
}

async function postJson(payload) {
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return { status: res.status, body: await res.json() };
}

try {
  // ----------------------------------------------------------------
  // Case 6 (first, DB must be empty): empty-state contract
  // ----------------------------------------------------------------
  console.log('▶ [6] Empty database contract...');
  const emptyList = await getJson(base);
  assert.strictEqual(emptyList.status, 200);
  assert.deepStrictEqual(emptyList.body, { entries: [] });
  const emptyLatest = await getJson(`${base}/latest`);
  assert.strictEqual(emptyLatest.status, 200);
  assert.strictEqual(emptyLatest.body.entry, null);
  assert.strictEqual(emptyLatest.body.trend, null);
  console.log('  ✓ Empty entries [] and latest entry null.\n');

  // ----------------------------------------------------------------
  // Case 1: save + fetch
  // ----------------------------------------------------------------
  console.log('▶ [1] Save and fetch measurements...');
  const first = { date: '2026-11-20', waist: 80, chest: 96, arm: 35, thigh: 55, hip: 94 };
  const saved = await postJson(first);
  assert.strictEqual(saved.status, 200);
  for (const key of MEASUREMENT_KEYS) {
    assert.strictEqual(saved.body.entry[key], first[key], `${key} persisted`);
  }
  const listAfterSave = await getJson(base);
  assert.strictEqual(listAfterSave.body.entries.length, 1);
  assert.strictEqual(listAfterSave.body.entries[0].date, '2026-11-20');
  console.log('  ✓ Saved entry fetched through GET list.\n');

  // ----------------------------------------------------------------
  // Case 2: duplicate date updates the same row
  // ----------------------------------------------------------------
  console.log('▶ [2] Duplicate date updates the existing row...');
  const updated = await postJson({ date: '2026-11-20', waist: 79, chest: 96, arm: 35, thigh: 55, hip: 94 });
  assert.strictEqual(updated.status, 200);
  assert.strictEqual(updated.body.entry.waist, 79);
  const listAfterUpdate = await getJson(base);
  assert.strictEqual(listAfterUpdate.body.entries.length, 1, 'no duplicate row for the same date');
  assert.strictEqual(listAfterUpdate.body.entries[0].waist, 79);
  assert.strictEqual(listAfterUpdate.body.entries[0].chest, 96);
  console.log('  ✓ Same date updated in place, row count unchanged.\n');

  // ----------------------------------------------------------------
  // Case 3: latest + trend vs previous recording
  // ----------------------------------------------------------------
  console.log('▶ [3] Latest entry and per-site trend...');
  await postJson({ date: '2026-11-23', waist: 78, chest: 97, arm: 35.5, thigh: 55, hip: 94 });
  const latest = await getJson(`${base}/latest`);
  assert.strictEqual(latest.status, 200);
  assert.strictEqual(latest.body.entry.date, '2026-11-23');
  assert.deepStrictEqual(latest.body.trend.waist, { delta: -1, direction: 'down' });
  assert.deepStrictEqual(latest.body.trend.chest, { delta: 1, direction: 'up' });
  assert.deepStrictEqual(latest.body.trend.arm, { delta: 0.5, direction: 'up' });
  assert.deepStrictEqual(latest.body.trend.thigh, { delta: 0, direction: 'same' });
  const pureTrend = computeMeasurementTrend([
    { date: '2026-11-20', waist: 80 },
    { date: '2026-11-23', waist: 78 }
  ]);
  assert.deepStrictEqual(pureTrend.trend.waist, { delta: -2, direction: 'down' });
  console.log('  ✓ Latest entry and deltas computed against previous values.\n');

  // ----------------------------------------------------------------
  // Case 4: partial measurement allowed
  // ----------------------------------------------------------------
  console.log('▶ [4] Partial measurement allowed...');
  const partial = validateBodyMeasurement({ date: '2026-11-22', hip: 93.5 });
  assert.strictEqual(partial.date, '2026-11-22');
  assert.strictEqual(partial.hip, 93.5);
  assert.strictEqual(partial.waist, null);
  const partialSaved = await postJson({ date: '2026-11-22', hip: 93.5 });
  assert.strictEqual(partialSaved.status, 200);
  assert.strictEqual(partialSaved.body.entry.hip, 93.5);
  console.log('  ✓ A single site is enough to save.\n');

  // ----------------------------------------------------------------
  // Case 5: invalid date / out-of-range values rejected
  // ----------------------------------------------------------------
  console.log('▶ [5] Invalid input rejected with HTTP 400...');
  const badDate = await postJson({ date: '2026-13-45', waist: 80 });
  assert.strictEqual(badDate.status, 400);
  const badRange = await postJson({ date: '2026-11-24', waist: 10 });
  assert.strictEqual(badRange.status, 400);
  const badTooBig = await postJson({ date: '2026-11-24', chest: 301 });
  assert.strictEqual(badTooBig.status, 400);
  const noSite = await postJson({ date: '2026-11-24' });
  assert.strictEqual(noSite.status, 400);
  assert.throws(() => validateBodyMeasurement({ date: '2026-11-24', arm: 0 }), err => err.status === 400);
  const listAfterInvalid = await getJson(base);
  assert.strictEqual(listAfterInvalid.body.entries.some(e => e.date === '2026-11-24'), false, 'rejected rows are not saved');
  console.log('  ✓ Bad date, out-of-range values and empty payload all 400.\n');

  assert.notStrictEqual(path.resolve(repo.getDbPath()), path.resolve('data/gym.db'), 'test must not use the real database');
  console.log('\n====================================================');
  console.log('🎉 ALL BODY MEASUREMENTS TESTS PASSED!');
  console.log('====================================================\n');
} finally {
  server.close();
}
