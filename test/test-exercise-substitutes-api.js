import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: Exercise Substitution & Equipment Alternative Engine API (/api/exercises/:id/substitutes)
 * Spec reference: docs/COMPETITOR-RE-NEXT-FEATURE-20261126.md (Section 6)
 *
 * Covers:
 * 1. Safe SQLite schema migration: exercise_substitutions table & index exist, core tables untouched.
 * 2. GET /api/exercises/:id/substitutes default retrieval by muscle group:
 *    - All returned substitutes have identical muscleGroup to source and weightRatio > 0.
 * 3. Equipment filter accuracy:
 *    - ?equipment=dumbbell, cable, machine returns only matching equipment items.
 * 4. POST /api/exercises/:id/substitutes (Add & Upsert favorite substitute):
 *    - Validates substituteId and priority (> 0).
 *    - Persists record and marks isUserFavorite: true on subsequent GET.
 *    - Upsert updates priority/notes without duplicate key error.
 * 5. DELETE /api/exercises/:id/substitutes/:substituteId:
 *    - Removes custom substitute association, idempotent on absent item.
 * 6. Graceful handling for non-existent exercise:
 *    - Returns 200 OK with substitutes: [] without crashing or 500.
 * 7. Zero data integrity impact:
 *    - data/gym.db untouched, core tables & seeded drafts/todos uncorrupted.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-substitutes-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

console.log('====================================================');
console.log('🧪 QA Test: Exercise Substitution & Alternative API');
console.log('====================================================\n');

// ------------------------------------------------------------------
// 1. Schema Migration & Data Isolation Verification
// ------------------------------------------------------------------
console.log('▶ [1] Verifying SQLite schema migration & zero data integrity impact...');

assert.notStrictEqual(
  path.resolve(repo.getDbPath()),
  path.resolve('data/gym.db'),
  'Tests must NEVER write to real data/gym.db'
);

const existingTables = repo.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name);
const expectedCoreTables = [
  'workout_sessions',
  'session_exercises',
  'session_sets',
  'body_weights',
  'gym_profiles',
  'exercise_last_weights',
  'daily_draft_state',
  'todos',
  'superset_groups',
  'exercise_rest',
  'user_training_goals',
  'exercise_goals',
  'backup_logs',
  'exercise_setup_notes'
];
for (const t of expectedCoreTables) {
  assert.ok(existingTables.includes(t), `Core table "${t}" must exist and not be altered`);
}

// Check exercise_substitutions table exists
assert.ok(
  existingTables.includes('exercise_substitutions'),
  'The "exercise_substitutions" table must exist after migration'
);

// Verify columns in exercise_substitutions
const cols = repo.db.prepare("PRAGMA table_info(exercise_substitutions)").all().map(c => c.name);
for (const col of ['exercise_id', 'substitute_id', 'priority', 'notes', 'created_at']) {
  assert.ok(cols.includes(col), `Column "${col}" must exist in exercise_substitutions table`);
}

// Verify index exists
const indices = repo.db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map(i => i.name);
assert.ok(
  indices.includes('idx_exercise_substitutions_exercise_id'),
  'Index "idx_exercise_substitutions_exercise_id" must exist'
);

// Seed draft and todo to verify data integrity
repo.saveDraft('tue', { ex_bench: { wt_0: '80', set_0: true } });
repo.saveTodos([{ id: 'todo_seed_substitutes', text: 'Exercise substitutes test todo', done: 0 }]);
console.log('  ✓ Schema migration safe, core tables untouched, exercise_substitutions table initialized.\n');

// ------------------------------------------------------------------
// 2. Start Ephemeral HTTP Server
// ------------------------------------------------------------------
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api/exercises`;

try {
  // ----------------------------------------------------------------
  // [A] Default Substitutes Retrieval by Muscle Group (Test 1)
  // ----------------------------------------------------------------
  console.log('▶ [2] Testing GET /api/exercises/:id/substitutes by Muscle Group...');

  const sourceExerciseId = 'barbell_bench_press';
  const res1 = await fetch(`${base}/${sourceExerciseId}/substitutes`);
  assert.strictEqual(res1.status, 200, 'GET substitutes must return 200 OK');

  const data1 = await res1.json();
  assert.strictEqual(data1.exerciseId, sourceExerciseId);
  assert.strictEqual(data1.muscleGroup, 'chest');
  assert.ok(Array.isArray(data1.substitutes), 'substitutes must be an array');
  assert.ok(data1.substitutes.length > 0, 'substitutes array should have candidate exercises');

  for (const s of data1.substitutes) {
    assert.strictEqual(s.muscleGroup, 'chest', `Every substitute must match source muscle group "chest", got ${s.muscleGroup}`);
    assert.ok(typeof s.weightRatio === 'number' && s.weightRatio > 0, `weightRatio must be a positive number, got ${s.weightRatio}`);
    assert.ok(typeof s.id === 'string' && s.id.length > 0, 'substitute must have a valid string id');
    assert.ok(typeof s.name === 'string' && s.name.length > 0, 'substitute must have a valid string name');
    assert.ok(typeof s.equipment === 'string', 'substitute must specify equipment');
    assert.ok(typeof s.matchScore === 'number' && s.matchScore >= 0, 'substitute must have matchScore');
    assert.ok(typeof s.matchReason === 'string', 'substitute must have matchReason');
    assert.ok(typeof s.ratioExplanation === 'string', 'substitute must have ratioExplanation');
    assert.strictEqual(typeof s.isUserFavorite, 'boolean', 'isUserFavorite must be boolean');
  }
  console.log(`  ✓ Successfully returned ${data1.substitutes.length} chest substitutes with positive weightRatio.\n`);

  // ----------------------------------------------------------------
  // [B] Equipment Filter Accuracy (Test 2)
  // ----------------------------------------------------------------
  console.log('▶ [3] Testing Equipment Filter Accuracy (?equipment=...)...');

  // 1. Dumbbell filter
  const resDb = await fetch(`${base}/${sourceExerciseId}/substitutes?equipment=dumbbell`);
  assert.strictEqual(resDb.status, 200);
  const dataDb = await resDb.json();
  assert.ok(Array.isArray(dataDb.substitutes));
  assert.ok(dataDb.substitutes.length > 0, 'Should return dumbbell substitutes');
  for (const s of dataDb.substitutes) {
    assert.strictEqual(s.equipment, 'dumbbell', `Expected dumbbell, got ${s.equipment}`);
    assert.strictEqual(s.muscleGroup, 'chest');
  }

  // 2. Machine filter
  const resMachine = await fetch(`${base}/${sourceExerciseId}/substitutes?equipment=machine`);
  assert.strictEqual(resMachine.status, 200);
  const dataMachine = await resMachine.json();
  assert.ok(Array.isArray(dataMachine.substitutes));
  for (const s of dataMachine.substitutes) {
    assert.strictEqual(s.equipment, 'machine', `Expected machine, got ${s.equipment}`);
    assert.strictEqual(s.muscleGroup, 'chest');
  }

  // 3. Cable filter
  const resCable = await fetch(`${base}/${sourceExerciseId}/substitutes?equipment=cable`);
  assert.strictEqual(resCable.status, 200);
  const dataCable = await resCable.json();
  assert.ok(Array.isArray(dataCable.substitutes));
  for (const s of dataCable.substitutes) {
    assert.strictEqual(s.equipment, 'cable', `Expected cable, got ${s.equipment}`);
    assert.strictEqual(s.muscleGroup, 'chest');
  }
  console.log('  ✓ Equipment filter accurately filters by dumbbell, machine, and cable.\n');

  // ----------------------------------------------------------------
  // [C] Add, Upsert & Fetch Custom Favorite Substitute (Test 3)
  // ----------------------------------------------------------------
  console.log('▶ [4] Testing POST /api/exercises/:id/substitutes (Add & Upsert Favorite)...');

  const targetSubId = 'incline_dumbbell_press';
  const postPayload = {
    substituteId: targetSubId,
    priority: 1,
    notes: 'ท่าสำรองเบอร์ 1 เวลาแร็คบาร์เบลเต็ม'
  };

  const postRes = await fetch(`${base}/${sourceExerciseId}/substitutes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postPayload)
  });
  assert.strictEqual(postRes.status, 200, 'POST substitutes must return 200 OK');
  const postData = await postRes.json();
  assert.strictEqual(postData.success, true);
  assert.strictEqual(postData.record.exerciseId, sourceExerciseId);
  assert.strictEqual(postData.record.substituteId, targetSubId);
  assert.strictEqual(postData.record.priority, 1);
  assert.strictEqual(postData.record.notes, postPayload.notes);

  // Verify GET reflects isUserFavorite === true
  const resAfterPost = await fetch(`${base}/${sourceExerciseId}/substitutes`);
  assert.strictEqual(resAfterPost.status, 200);
  const dataAfterPost = await resAfterPost.json();
  const pinnedItem = dataAfterPost.substitutes.find(s => s.id === targetSubId);
  assert.ok(pinnedItem, 'Pinned substitute must exist in candidates');
  assert.strictEqual(pinnedItem.isUserFavorite, true, 'isUserFavorite must be true after POST');

  // Test Upsert (update priority and notes)
  const upsertPayload = {
    substituteId: targetSubId,
    priority: 2,
    notes: 'อัปเดตเป็นลำดับ 2'
  };
  const upsertRes = await fetch(`${base}/${sourceExerciseId}/substitutes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(upsertPayload)
  });
  assert.strictEqual(upsertRes.status, 200, 'Upsert POST must return 200 OK without duplicate key error');
  const upsertData = await upsertRes.json();
  assert.strictEqual(upsertData.success, true);
  assert.strictEqual(upsertData.record.priority, 2);
  assert.strictEqual(upsertData.record.notes, upsertPayload.notes);

  // Verify DB count has exactly 1 row for this pair
  const rowCount = repo.db.prepare(
    'SELECT COUNT(*) as c FROM exercise_substitutions WHERE exercise_id = ? AND substitute_id = ?'
  ).get(sourceExerciseId, targetSubId);
  assert.strictEqual(rowCount.c, 1, 'There must be exactly 1 row for (exercise_id, substitute_id)');

  // Input Validation (400 Bad Request)
  // Missing/empty substituteId
  const badSubRes = await fetch(`${base}/${sourceExerciseId}/substitutes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ substituteId: '', priority: 1 })
  });
  assert.strictEqual(badSubRes.status, 400, 'Empty substituteId must return 400 Bad Request');

  // Invalid priority (0, negative, or non-integer)
  const badPriorityRes1 = await fetch(`${base}/${sourceExerciseId}/substitutes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ substituteId: targetSubId, priority: 0 })
  });
  assert.strictEqual(badPriorityRes1.status, 400, 'Priority 0 must return 400 Bad Request');

  const badPriorityRes2 = await fetch(`${base}/${sourceExerciseId}/substitutes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ substituteId: targetSubId, priority: -5 })
  });
  assert.strictEqual(badPriorityRes2.status, 400, 'Negative priority must return 400 Bad Request');

  console.log('  ✓ Custom favorite substitute created, upserted, and input validation (400) verified.\n');

  // ----------------------------------------------------------------
  // [D] DELETE Custom Favorite Substitute (Test 4)
  // ----------------------------------------------------------------
  console.log('▶ [5] Testing DELETE /api/exercises/:id/substitutes/:substituteId...');

  const deleteRes = await fetch(`${base}/${sourceExerciseId}/substitutes/${targetSubId}`, {
    method: 'DELETE'
  });
  assert.strictEqual(deleteRes.status, 200, 'DELETE must return 200 OK');
  const deleteData = await deleteRes.json();
  assert.strictEqual(deleteData.success, true);

  // Verify GET reflects isUserFavorite === false
  const resAfterDelete = await fetch(`${base}/${sourceExerciseId}/substitutes`);
  assert.strictEqual(resAfterDelete.status, 200);
  const dataAfterDelete = await resAfterDelete.json();
  const unpinnedItem = dataAfterDelete.substitutes.find(s => s.id === targetSubId);
  if (unpinnedItem) {
    assert.strictEqual(unpinnedItem.isUserFavorite, false, 'isUserFavorite must be false after deletion');
  }

  // Verify row deleted from DB
  const rowCountAfter = repo.db.prepare(
    'SELECT COUNT(*) as c FROM exercise_substitutions WHERE exercise_id = ? AND substitute_id = ?'
  ).get(sourceExerciseId, targetSubId);
  assert.strictEqual(rowCountAfter.c, 0, 'Row must be deleted from DB');

  // Idempotent delete on already deleted or non-existent substitute
  const idempotentDeleteRes = await fetch(`${base}/${sourceExerciseId}/substitutes/${targetSubId}`, {
    method: 'DELETE'
  });
  assert.strictEqual(idempotentDeleteRes.status, 200, 'Idempotent DELETE must return 200 OK');

  console.log('  ✓ Custom favorite substitute deleted and idempotent DELETE verified.\n');

  // ----------------------------------------------------------------
  // [E] Non-Existent Exercise Handling (Test 5)
  // ----------------------------------------------------------------
  console.log('▶ [6] Testing Graceful Handling for Non-Existent Exercise...');

  const nonExistentId = 'unknown_exercise_qa_999';
  const getNonExistentRes = await fetch(`${base}/${nonExistentId}/substitutes`);
  assert.strictEqual(getNonExistentRes.status, 200, 'Non-existent exercise must return 200 OK without crashing');

  const nonExistentData = await getNonExistentRes.json();
  assert.strictEqual(nonExistentData.exerciseId, nonExistentId);
  assert.ok(Array.isArray(nonExistentData.substitutes), 'substitutes must be an array');
  assert.strictEqual(nonExistentData.substitutes.length, 0, 'substitutes array must be empty for unknown exercise');
  console.log('  ✓ Non-existent exercise safely returns 200 OK with substitutes: [].\n');

  // ----------------------------------------------------------------
  // [F] Pre-existing Data Integrity Check (Test 6)
  // ----------------------------------------------------------------
  console.log('▶ [7] Verifying seeded data in pre-existing tables remains intact...');
  const drafts = repo.getAllDrafts();
  assert.ok(drafts.tue, 'Drafts in tue must remain intact');
  assert.strictEqual(drafts.tue.ex_bench.wt_0, '80');

  const todos = repo.getTodos();
  const seededTodo = todos.find(t => t.id === 'todo_seed_substitutes');
  assert.ok(seededTodo, 'Seeded todo must remain intact');
  assert.strictEqual(seededTodo.text, 'Exercise substitutes test todo');
  console.log('  ✓ Pre-existing draft and todos completely uncorrupted.\n');

} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log('====================================================');
console.log('🎉 ALL EXERCISE SUBSTITUTION API TESTS PASSED!');
console.log('====================================================');
