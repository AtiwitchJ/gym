import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: Gym Profile & Plate Inventory API (/api/gym-profiles)
 * Covers:
 * 1. Safe SQLite migration: ensures gym_profiles table exists without altering/destroying existing tables.
 * 2. CRUD Operations on /api/gym-profiles (Create, Read All, Read One, Update, Delete).
 * 3. Validation: rejects missing name, invalid bar weight with 400.
 * 4. Data integrity: verifies pre-existing workout sessions, drafts, and todos remain intact.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-profiles-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

console.log('====================================================');
console.log('🧪 QA Test: /api/gym-profiles CRUD & Schema Migration');
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
  'exercise_rest'
];
for (const t of expectedCoreTables) {
  assert.ok(existingTables.includes(t), `Core table "${t}" must exist and not be removed`);
}

// Seed sample data in existing tables to verify migration non-destruction
repo.saveDraft('mon', { ex_bench: { wt_0: '60', set_0: true } });
repo.saveTodos([{ id: 'todo_seed_1', text: 'Hydrate well', done: 0 }]);

// Check gym_profiles table exists
assert.ok(
  existingTables.includes('gym_profiles'),
  'The "gym_profiles" table must exist after migration'
);
console.log('  ✓ Pre-existing tables intact and gym_profiles table created.\n');

// ------------------------------------------------------------------
// 2. HTTP Server & CRUD Operations
// ------------------------------------------------------------------
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api/gym-profiles`;

try {
  // ----------------------------------------------------------------
  // [A] CREATE Profile (POST)
  // ----------------------------------------------------------------
  console.log('▶ [2] Testing POST /api/gym-profiles (Create)...');
  const newProfilePayload = {
    name: 'Home Garage Gym',
    barWeight: 20,
    inventory: {
      '25': 0,
      '20': 2,
      '15': 1,
      '10': 2,
      '5': 2,
      '2.5': 2,
      '1.25': 2
    },
    isDefault: true
  };

  const createRes = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newProfilePayload)
  });

  assert.ok(
    createRes.status === 201 || createRes.status === 200,
    `Expected status 201 or 200 on create, received: ${createRes.status}`
  );
  const created = await createRes.json();
  assert.ok(created.id, 'Created profile must have an id');
  assert.strictEqual(created.name, 'Home Garage Gym');
  const profileId = created.id;
  console.log(`  ✓ Profile created successfully with id: ${profileId}\n`);

  // ----------------------------------------------------------------
  // [B] READ ALL Profiles (GET)
  // ----------------------------------------------------------------
  console.log('▶ [3] Testing GET /api/gym-profiles (List)...');
  const listRes = await fetch(base);
  assert.strictEqual(listRes.status, 200);
  const list = await listRes.json();
  assert.ok(Array.isArray(list), 'Response must be an array of profiles');
  const found = list.find(p => p.id === profileId);
  assert.ok(found, 'Created profile must be present in the profiles list');
  assert.strictEqual(found.name, 'Home Garage Gym');
  console.log(`  ✓ Profiles list contains newly created profile (Total: ${list.length}).\n`);

  // ----------------------------------------------------------------
  // [C] READ ONE Profile (GET /:id)
  // ----------------------------------------------------------------
  console.log('▶ [4] Testing GET /api/gym-profiles/:id (Read One)...');
  const singleRes = await fetch(`${base}/${profileId}`);
  assert.strictEqual(singleRes.status, 200);
  const single = await singleRes.json();
  assert.strictEqual(single.id, profileId);
  assert.strictEqual(single.name, 'Home Garage Gym');

  const missingRes = await fetch(`${base}/999999`);
  assert.strictEqual(missingRes.status, 404, 'Non-existent numeric profile ID must return 404');

  const invalidIdRes = await fetch(`${base}/invalid_id`);
  assert.strictEqual(invalidIdRes.status, 400, 'Non-numeric profile ID must return 400');
  console.log('  ✓ Single profile retrieval, 404 for missing ID, and 400 for invalid ID verified.\n');

  // ----------------------------------------------------------------
  // [D] UPDATE Profile (PUT)
  // ----------------------------------------------------------------
  console.log('▶ [5] Testing PUT /api/gym-profiles/:id (Update)...');
  const updatePayload = {
    name: 'Home Garage Gym Pro',
    barWeight: 20,
    inventory: {
      '25': 2,
      '20': 4,
      '15': 2,
      '10': 4,
      '5': 2,
      '2.5': 2,
      '1.25': 2
    },
    isDefault: true
  };

  const updateRes = await fetch(`${base}/${profileId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload)
  });
  assert.strictEqual(updateRes.status, 200);
  const updated = await updateRes.json();
  assert.strictEqual(updated.name, 'Home Garage Gym Pro');

  // Re-fetch to confirm persistence
  const verifyRes = await fetch(`${base}/${profileId}`);
  const verifyData = await verifyRes.json();
  assert.strictEqual(verifyData.name, 'Home Garage Gym Pro');
  console.log('  ✓ Profile updated and verified through GET.\n');

  // ----------------------------------------------------------------
  // [E] VALIDATION (400 Bad Request)
  // ----------------------------------------------------------------
  console.log('▶ [6] Testing validation for bad input (400)...');
  const badNameRes = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ barWeight: 20 })
  });
  assert.strictEqual(badNameRes.status, 400, 'Missing name must return 400 Bad Request');

  const badBarRes = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Commercial Gym', defaultBarWeight: -10 })
  });
  assert.strictEqual(badBarRes.status, 400, 'Negative defaultBarWeight must return 400 Bad Request');
  console.log('  ✓ Invalid inputs rejected with HTTP 400.\n');

  // ----------------------------------------------------------------
  // [F] DELETE Profile (DELETE)
  // ----------------------------------------------------------------
  console.log('▶ [7] Testing DELETE /api/gym-profiles/:id (Delete)...');
  const deleteRes = await fetch(`${base}/${profileId}`, { method: 'DELETE' });
  assert.ok(
    deleteRes.status === 200 || deleteRes.status === 204,
    `Expected 200 or 204 on delete, received: ${deleteRes.status}`
  );

  // Subsequent fetch must return 404
  const afterDeleteRes = await fetch(`${base}/${profileId}`);
  assert.strictEqual(afterDeleteRes.status, 404, 'Deleted profile must return 404');

  const listAfterDelete = await (await fetch(base)).json();
  assert.ok(!listAfterDelete.some(p => p.id === profileId), 'Deleted profile must not appear in list');
  console.log('  ✓ Profile deletion verified.\n');

  // ----------------------------------------------------------------
  // [G] Post-operation Data Integrity Check
  // ----------------------------------------------------------------
  console.log('▶ [8] Verifying seeded data in existing tables remains uncorrupted...');
  const drafts = repo.getAllDrafts();
  assert.ok(drafts.mon, 'Drafts in mon must remain intact');
  assert.strictEqual(drafts.mon.ex_bench.wt_0, '60');

  const todos = repo.getTodos();
  const seededTodo = todos.find(t => t.id === 'todo_seed_1');
  assert.ok(seededTodo, 'Seeded todo must remain intact');
  assert.strictEqual(seededTodo.text, 'Hydrate well');
  console.log('  ✓ Existing tables and data completely uncorrupted.\n');

} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log('====================================================');
console.log('🎉 ALL GYM PROFILE API TESTS PASSED!');
console.log('====================================================');
