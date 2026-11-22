import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: Persistent Exercise Machine Setup & Form Cues API (/api/exercises/:id/note)
 * Spec reference: docs/COMPETITOR-RE-NEXT-FEATURE-20261125.md (Section 6)
 *
 * Covers:
 * 1. Safe SQLite schema migration: exercise_setup_notes table exists, core tables untouched.
 * 2. GET /api/exercises/:id/note on non-existent exercise:
 *    - Returns 200 OK with empty string fields ('') and updatedAt: null (no crash/404).
 * 3. PUT /api/exercises/:id/note (Create & Upsert):
 *    - Creates new note record.
 *    - Subsequent PUT updates existing record in place without duplicating key (ON CONFLICT DO UPDATE).
 * 4. Input Validation & Length Limits (400 Bad Request):
 *    - Fields with length > 500 characters rejected with 400.
 *    - Non-string or malformed payloads handled safely.
 * 5. Clearing Notes:
 *    - PUT with empty strings ('') clears all note fields successfully.
 * 6. Zero Data Integrity Impact:
 *    - data/gym.db untouched, core tables & seeded drafts/todos uncorrupted.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-notes-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

console.log('====================================================');
console.log('🧪 QA Test: Exercise Machine Setup & Form Cues API');
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
  'backup_logs'
];
for (const t of expectedCoreTables) {
  assert.ok(existingTables.includes(t), `Core table "${t}" must exist and not be altered`);
}

// Check exercise_setup_notes table exists
assert.ok(
  existingTables.includes('exercise_setup_notes'),
  'The "exercise_setup_notes" table must exist after migration'
);

// Verify columns in exercise_setup_notes
const cols = repo.db.prepare("PRAGMA table_info(exercise_setup_notes)").all().map(c => c.name);
for (const col of ['exercise_id', 'pin_setting', 'form_cues', 'general_note', 'updated_at']) {
  assert.ok(cols.includes(col), `Column "${col}" must exist in exercise_setup_notes table`);
}

// Seed draft and todo to verify data integrity
repo.saveDraft('mon', { ex_bench: { wt_0: '70', set_0: true } });
repo.saveTodos([{ id: 'todo_seed_notes', text: 'Exercise notes test todo', done: 0 }]);
console.log('  ✓ Schema migration safe, core tables untouched, exercise_setup_notes table initialized.\n');

// ------------------------------------------------------------------
// 2. Start Ephemeral HTTP Server
// ------------------------------------------------------------------
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api/exercises`;

try {
  // ----------------------------------------------------------------
  // [A] Non-existent Exercise Note Retrieval (Test 1)
  // ----------------------------------------------------------------
  console.log('▶ [2] Testing GET /api/exercises/:id/note on non-existent exercise...');

  const nonExistentId = 'unknown_exercise_qa_123';
  const getEmptyRes = await fetch(`${base}/${nonExistentId}/note`);
  assert.strictEqual(getEmptyRes.status, 200, 'Non-existent note must return 200 OK without crashing');

  const emptyData = await getEmptyRes.json();
  assert.strictEqual(emptyData.exerciseId, nonExistentId);
  assert.strictEqual(emptyData.pinSetting, '', 'pinSetting must default to empty string');
  assert.strictEqual(emptyData.formCues, '', 'formCues must default to empty string');
  assert.strictEqual(emptyData.generalNote, '', 'generalNote must default to empty string');
  assert.strictEqual(emptyData.updatedAt, null, 'updatedAt must be null when no record exists');
  console.log('  ✓ Empty note retrieval returns 200 OK with empty strings and updatedAt: null.\n');

  // ----------------------------------------------------------------
  // [B] Create & Upsert Note (Test 2)
  // ----------------------------------------------------------------
  console.log('▶ [3] Testing PUT /api/exercises/:id/note (Create & Upsert)...');

  const testExId = 'barbell_bench_press';

  // 1. Initial creation via PUT
  const initialPayload = {
    pinSetting: 'เบาะระดับ 3, พินเคเบิลเบอร์ 4',
    formCues: 'บีบสะบักกดลงล่าง, ข้อศอกกาง 45 องศา',
    generalNote: 'ใช้กริปแบบ Thumbless'
  };

  const putRes = await fetch(`${base}/${testExId}/note`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(initialPayload)
  });
  assert.strictEqual(putRes.status, 200, 'PUT note must return 200 OK');

  const putData = await putRes.json();
  assert.strictEqual(putData.success, true);
  assert.strictEqual(putData.exerciseId, testExId);
  assert.strictEqual(putData.note.pinSetting, initialPayload.pinSetting);
  assert.strictEqual(putData.note.formCues, initialPayload.formCues);
  assert.strictEqual(putData.note.generalNote, initialPayload.generalNote);
  assert.ok(typeof putData.note.updatedAt === 'string', 'updatedAt must be an ISO timestamp');

  // Verify through GET
  const getSavedRes = await fetch(`${base}/${testExId}/note`);
  assert.strictEqual(getSavedRes.status, 200);
  const savedData = await getSavedRes.json();
  assert.strictEqual(savedData.exerciseId, testExId);
  assert.strictEqual(savedData.pinSetting, initialPayload.pinSetting);
  assert.strictEqual(savedData.formCues, initialPayload.formCues);
  assert.strictEqual(savedData.generalNote, initialPayload.generalNote);

  // 2. Update existing note (Upsert)
  const updatedPayload = {
    pinSetting: 'เบาะระดับ 4 (ปรับสูงขึ้น)',
    formCues: 'ล็อคสะบักแน่นๆ, ดันเท้าลงพื้น',
    generalNote: 'ระวังข้อมืองอ'
  };

  const updateRes = await fetch(`${base}/${testExId}/note`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedPayload)
  });
  assert.strictEqual(updateRes.status, 200);
  const updatedData = await updateRes.json();
  assert.strictEqual(updatedData.note.pinSetting, updatedPayload.pinSetting);
  assert.strictEqual(updatedData.note.formCues, updatedPayload.formCues);
  assert.strictEqual(updatedData.note.generalNote, updatedPayload.generalNote);

  // Verify only 1 row in DB for this exercise (no duplicate key)
  const rowCount = repo.db.prepare('SELECT COUNT(*) as c FROM exercise_setup_notes WHERE exercise_id = ?').get(testExId);
  assert.strictEqual(rowCount.c, 1, 'Upsert must maintain exactly 1 row per exercise_id');
  console.log('  ✓ Note creation, persistence, and idempotent upsert verified.\n');

  // ----------------------------------------------------------------
  // [C] Input Validation & Length Limits (Test 3)
  // ----------------------------------------------------------------
  console.log('▶ [4] Testing Input Validation & Length Limits (400 Bad Request)...');

  // Length > 500 characters
  const over500 = 'x'.repeat(501);

  // 1. pinSetting > 500
  const badPinRes = await fetch(`${base}/${testExId}/note`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinSetting: over500, formCues: 'ok', generalNote: 'ok' })
  });
  assert.strictEqual(badPinRes.status, 400, 'pinSetting > 500 chars must return 400');

  // 2. formCues > 500
  const badCuesRes = await fetch(`${base}/${testExId}/note`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinSetting: 'ok', formCues: over500, generalNote: 'ok' })
  });
  assert.strictEqual(badCuesRes.status, 400, 'formCues > 500 chars must return 400');

  // 3. generalNote > 500
  const badNoteRes = await fetch(`${base}/${testExId}/note`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinSetting: 'ok', formCues: 'ok', generalNote: over500 })
  });
  assert.strictEqual(badNoteRes.status, 400, 'generalNote > 500 chars must return 400');

  // 4. Exactly 500 characters (boundary test -> 200 OK)
  const exact500 = 'a'.repeat(500);
  const boundaryRes = await fetch(`${base}/${testExId}/note`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinSetting: exact500, formCues: exact500, generalNote: exact500 })
  });
  assert.strictEqual(boundaryRes.status, 200, 'Exactly 500 chars per field must return 200 OK');

  // 5. Empty / missing body or partial body
  const emptyBodyRes = await fetch(`${base}/${testExId}/note`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.strictEqual(emptyBodyRes.status, 200, 'Empty JSON body must default fields safely and return 200 OK');
  console.log('  ✓ Character limits (>500 -> 400, 500 -> 200) and payload validation verified.\n');

  // ----------------------------------------------------------------
  // [D] Clearing Notes (Test 4)
  // ----------------------------------------------------------------
  console.log('▶ [5] Testing Clearing Notes with empty strings ("")...');

  const clearRes = await fetch(`${base}/${testExId}/note`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pinSetting: '',
      formCues: '',
      generalNote: ''
    })
  });
  assert.strictEqual(clearRes.status, 200, 'Clearing note fields must return 200 OK');

  const getClearedRes = await fetch(`${base}/${testExId}/note`);
  assert.strictEqual(getClearedRes.status, 200);
  const clearedData = await getClearedRes.json();
  assert.strictEqual(clearedData.pinSetting, '');
  assert.strictEqual(clearedData.formCues, '');
  assert.strictEqual(clearedData.generalNote, '');
  console.log('  ✓ Clearing note with empty strings ("") verified.\n');

  // ----------------------------------------------------------------
  // [E] Pre-existing Data Integrity Check (Test 5)
  // ----------------------------------------------------------------
  console.log('▶ [6] Verifying seeded data in pre-existing tables remains intact...');
  const drafts = repo.getAllDrafts();
  assert.ok(drafts.mon, 'Drafts in mon must remain intact');
  assert.strictEqual(drafts.mon.ex_bench.wt_0, '70');

  const todos = repo.getTodos();
  const seededTodo = todos.find(t => t.id === 'todo_seed_notes');
  assert.ok(seededTodo, 'Seeded todo must remain intact');
  assert.strictEqual(seededTodo.text, 'Exercise notes test todo');
  console.log('  ✓ Pre-existing draft and todos completely uncorrupted.\n');

} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log('====================================================');
console.log('🎉 ALL EXERCISE SETUP & FORM NOTES TESTS PASSED!');
console.log('====================================================');
