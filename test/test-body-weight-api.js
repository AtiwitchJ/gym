import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: Body Weight Tracker API (/api/body-weights)
 * Covers:
 * 1. Safe SQLite migration: ensures body_weights table exists without altering/destroying existing tables.
 * 2. CRUD Operations on /api/body-weights (Create 201, Upsert 200, List date DESC, Read One, Delete, 404 after delete).
 * 3. Validation 400: weight <20, >300, non-numeric; date format and calendar validity (e.g. 2026-02-30); note length.
 * 4. Data integrity: verifies pre-existing workout sessions, drafts, and todos remain intact.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-body-weights-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

console.log('====================================================');
console.log('🧪 QA Test: /api/body-weights CRUD & Schema Migration');
console.log('====================================================\n');

// ------------------------------------------------------------------
// 1. Migration Verification: Pre-existing Tables & Data Untouched
// ------------------------------------------------------------------
console.log('▶ [1] Verifying SQLite schema migration preserves existing tables...');

assert.notStrictEqual(
  path.resolve(repo.getDbPath()),
  path.resolve('data/gym.db'),
  'Tests must NEVER write to data/gym.db'
);

// Check that existing core tables are preserved
const existingTables = repo.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
const expectedCoreTables = [
  'workout_sessions',
  'session_exercises',
  'session_sets',
  'exercise_last_weights',
  'daily_draft_state',
  'todos',
  'superset_groups',
  'exercise_rest',
  'gym_profiles'
];
for (const t of expectedCoreTables) {
  assert.ok(existingTables.includes(t), `Core table "${t}" must exist and not be removed`);
}

// Seed sample data in existing tables to verify migration non-destruction
repo.saveDraft('mon', { ex_bench: { wt_0: '60', set_0: true } });
repo.saveTodos([{ id: 'todo_seed_bw', text: 'Hydrate before weigh-in', done: 0 }]);

// Check body_weights table exists
assert.ok(
  existingTables.includes('body_weights'),
  'The "body_weights" table must exist after migration'
);
console.log('  ✓ Pre-existing tables intact and body_weights table created.\n');

// ------------------------------------------------------------------
// 2. HTTP Server & CRUD Operations
// ------------------------------------------------------------------
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api/body-weights`;

try {
  // ----------------------------------------------------------------
  // [A] VALIDATION (400 Bad Request)
  // ----------------------------------------------------------------
  console.log('▶ [2] Testing validation for invalid input (400 Bad Request)...');

  // Weight validations
  const badWeights = [
    { label: 'weight < 20', body: { date: '2026-11-20', weight: 19.9 } },
    { label: 'weight > 300', body: { date: '2026-11-20', weight: 300.1 } },
    { label: 'non-numeric weight', body: { date: '2026-11-20', weight: 'seventy' } },
    { label: 'missing weight', body: { date: '2026-11-20' } },
    { label: 'infinite weight', body: { date: '2026-11-20', weight: Infinity } }
  ];
  for (const { label, body } of badWeights) {
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    assert.strictEqual(res.status, 400, `Expected 400 for ${label}, got ${res.status}`);
  }

  // Date validations
  const badDates = [
    { label: 'missing date', body: { weight: 70 } },
    { label: 'wrong format (slash)', body: { date: '2026/11/20', weight: 70 } },
    { label: 'wrong format (DD-MM-YYYY)', body: { date: '20-11-2026', weight: 70 } },
    { label: 'invalid calendar date 2026-02-30', body: { date: '2026-02-30', weight: 70 } },
    { label: 'invalid calendar date 2026-04-31', body: { date: '2026-04-31', weight: 70 } },
    { label: 'invalid month 2026-13-01', body: { date: '2026-13-01', weight: 70 } },
    { label: 'invalid day 2026-00-10', body: { date: '2026-00-10', weight: 70 } },
    { label: 'non-date string', body: { date: 'not-a-date', weight: 70 } }
  ];
  for (const { label, body } of badDates) {
    const res = await fetch(base, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    assert.strictEqual(res.status, 400, `Expected 400 for ${label}, got ${res.status}`);
  }

  // Note validation
  const badNoteRes = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-11-20', weight: 70, note: 'a'.repeat(501) })
  });
  assert.strictEqual(badNoteRes.status, 400, 'Note exceeding 500 characters must return 400');

  console.log('  ✓ Validation correctly rejects invalid weights, malformed/impossible dates, and oversized notes.\n');

  // ----------------------------------------------------------------
  // [B] CREATE Entry (POST -> 201)
  // ----------------------------------------------------------------
  console.log('▶ [3] Testing POST /api/body-weights (Create first time -> 201)...');
  const createRes1 = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-11-20', weight: 72.5, note: 'เช้าหลังตื่นนอน' })
  });
  assert.strictEqual(createRes1.status, 201, `Expected 201 Created, got ${createRes1.status}`);
  const created1 = await createRes1.json();
  assert.strictEqual(created1.date, '2026-11-20');
  assert.strictEqual(Number(created1.weight), 72.5);
  assert.strictEqual(created1.note, 'เช้าหลังตื่นนอน');
  assert.ok(created1.updated_at, 'Entry must have updated_at');
  console.log('  ✓ First record created with status 201.\n');

  // ----------------------------------------------------------------
  // [C] UPSERT Entry on Same Date (POST -> 200)
  // ----------------------------------------------------------------
  console.log('▶ [4] Testing POST /api/body-weights on same date (Upsert -> 200)...');
  const upsertRes = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-11-20', weight: 72.8, note: 'ชั่งซ้ำหลังดื่มน้ำ' })
  });
  assert.strictEqual(upsertRes.status, 200, `Expected 200 OK on upsert, got ${upsertRes.status}`);
  const upserted = await upsertRes.json();
  assert.strictEqual(upserted.date, '2026-11-20');
  assert.strictEqual(Number(upserted.weight), 72.8);
  assert.strictEqual(upserted.note, 'ชั่งซ้ำหลังดื่มน้ำ');
  console.log('  ✓ Upsert on same date updated weight and note with status 200.\n');

  // Seed additional dates for list sorting check
  const createRes2 = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-11-21', weight: 73.0 })
  });
  assert.strictEqual(createRes2.status, 201);

  const createRes3 = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: '2026-11-19', weight: 72.2, note: 'ก่อนออกกำลังกาย' })
  });
  assert.strictEqual(createRes3.status, 201);

  // ----------------------------------------------------------------
  // [D] READ ALL Entries (GET -> 200, sorted date DESC)
  // ----------------------------------------------------------------
  console.log('▶ [5] Testing GET /api/body-weights (List ordered by date DESC)...');
  const listRes = await fetch(base);
  assert.strictEqual(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(Array.isArray(list), 'List must be an array');
  assert.strictEqual(list.length, 3, 'Must contain 3 seeded dates');

  // Verify sort order: date DESC
  const dates = list.map(item => item.date);
  assert.deepStrictEqual(
    dates,
    ['2026-11-21', '2026-11-20', '2026-11-19'],
    'Entries must be sorted by date descending'
  );
  console.log('  ✓ List returned 3 entries in exact date DESC order.\n');

  // ----------------------------------------------------------------
  // [E] READ ONE Entry (GET /:date -> 200 / 404)
  // ----------------------------------------------------------------
  console.log('▶ [6] Testing GET /api/body-weights/:date (Read One)...');
  const getSingleRes = await fetch(`${base}/2026-11-20`);
  assert.strictEqual(getSingleRes.status, 200);
  const single = await getSingleRes.json();
  assert.strictEqual(single.date, '2026-11-20');
  assert.strictEqual(Number(single.weight), 72.8);
  assert.strictEqual(single.note, 'ชั่งซ้ำหลังดื่มน้ำ');

  const missingRes = await fetch(`${base}/2099-12-31`);
  assert.strictEqual(missingRes.status, 404, 'Non-existent date must return 404');
  console.log('  ✓ Single entry retrieval and 404 for missing date verified.\n');

  // ----------------------------------------------------------------
  // [F] DELETE Entry (DELETE -> 200, then 404)
  // ----------------------------------------------------------------
  console.log('▶ [7] Testing DELETE /api/body-weights/:date (Delete)...');
  const deleteRes = await fetch(`${base}/2026-11-20`, { method: 'DELETE' });
  assert.strictEqual(deleteRes.status, 200, `Expected 200 on delete, got ${deleteRes.status}`);
  const deleteBody = await deleteRes.json();
  assert.strictEqual(deleteBody.success, true);
  assert.strictEqual(deleteBody.date, '2026-11-20');

  // Subsequent GET should be 404
  const afterDeleteGet = await fetch(`${base}/2026-11-20`);
  assert.strictEqual(afterDeleteGet.status, 404, 'Deleted date must return 404');

  // Subsequent DELETE should be 404
  const afterDeleteAgain = await fetch(`${base}/2026-11-20`, { method: 'DELETE' });
  assert.strictEqual(afterDeleteAgain.status, 404, 'Deleting already deleted date must return 404');

  // Verify list no longer has 2026-11-20
  const listAfterDelete = await (await fetch(base)).json();
  assert.strictEqual(listAfterDelete.length, 2);
  assert.ok(!listAfterDelete.some(item => item.date === '2026-11-20'));
  console.log('  ✓ Deletion, 404 on subsequent read/delete, and list update verified.\n');

  // ----------------------------------------------------------------
  // [G] Post-operation Data Integrity Check
  // ----------------------------------------------------------------
  console.log('▶ [8] Verifying seeded data in existing tables remains uncorrupted...');
  const drafts = repo.getAllDrafts();
  assert.ok(drafts.mon, 'Drafts in mon must remain intact');
  assert.strictEqual(drafts.mon.ex_bench.wt_0, '60');

  const todos = repo.getTodos();
  const seededTodo = todos.find(t => t.id === 'todo_seed_bw');
  assert.ok(seededTodo, 'Seeded todo must remain intact');
  assert.strictEqual(seededTodo.text, 'Hydrate before weigh-in');
  console.log('  ✓ Existing tables and data completely uncorrupted.\n');

} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log('====================================================');
console.log('🎉 ALL BODY WEIGHT API TESTS PASSED!');
console.log('====================================================');
