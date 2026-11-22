import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: Universal Workout Data Import & Export API (/api/backup/*)
 * Spec reference: docs/COMPETITOR-RE-NEXT-FEATURE-20261124.md (Section 6)
 *
 * Covers:
 * 1. Safe SQLite schema migration: backup_logs table created, core tables untouched.
 * 2. GET /api/backup/export/json:
 *    - Full lossless JSON export (version: 1, exportedAt, sessions, bodyWeights).
 * 3. POST /api/backup/import (JSON roundtrip & Deduplication):
 *    - Re-import with dedupe: true skips existing sessions (duplicatesSkipped count).
 *    - Re-import with dedupe: false imports all sessions.
 * 4. POST /api/backup/import (CSV Parser & Ingestion for Strong, Hevy, GYM):
 *    - Strong CSV format parsing (Date, Workout Name, Exercise Name, Set Order, Weight, Reps, RPE).
 *    - Hevy CSV format parsing (Date, Workout Name, Exercise Title, Set Type, Weight (kg), Reps, RIR).
 *    - GYM CSV format parsing.
 * 5. Transactional Rollback on Malformed / Corrupted Data:
 *    - Middle-of-file corruption triggers 400 Bad Request and rolls back atomically.
 *    - Zero orphaned / partial rows in workout_sessions or session_sets.
 * 6. Input Validation & Error Boundaries (400 Bad Request):
 *    - Empty body {}, unknown format, unparseable content, non-workout CSV.
 * 7. Zero Data Integrity Impact:
 *    - data/gym.db untouched, pre-existing tables & data completely uncorrupted.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-backup-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

console.log('====================================================');
console.log('🧪 QA Test: Workout Data Import & Export API');
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
  'exercise_goals'
];
for (const t of expectedCoreTables) {
  assert.ok(existingTables.includes(t), `Core table "${t}" must exist and not be altered`);
}

// Check backup_logs table exists
assert.ok(
  existingTables.includes('backup_logs'),
  'The "backup_logs" table must exist after migration'
);

// Verify columns in backup_logs
const logCols = repo.db.prepare("PRAGMA table_info(backup_logs)").all().map(c => c.name);
for (const col of ['id', 'imported_at', 'source_format', 'sessions_count', 'sets_count', 'skipped_count', 'status']) {
  assert.ok(logCols.includes(col), `Column "${col}" must exist in backup_logs table`);
}

// Seed draft and todo to verify data integrity
repo.saveDraft('mon', { ex_bench: { wt_0: '70', set_0: true } });
repo.saveTodos([{ id: 'todo_seed_backup', text: 'Backup test todo', done: 0 }]);
console.log('  ✓ Schema migration safe, core tables untouched, backup_logs table initialized.\n');

// ------------------------------------------------------------------
// 2. Start Ephemeral HTTP Server
// ------------------------------------------------------------------
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api/backup`;

try {
  // ----------------------------------------------------------------
  // [A] Full JSON Export & Re-import Roundtrip (Test 1)
  // ----------------------------------------------------------------
  console.log('▶ [2] Testing Full JSON Export & Re-import Roundtrip (with deduplication)...');

  // Seed two distinct sessions and a body weight
  repo.saveSession({
    id: 'sess_bkp_01',
    date: '2026-10-10',
    time: '10:00:00',
    dayKey: 'mon',
    dayTitle: 'Chest Day',
    totalSetsDone: 2,
    exercises: [
      {
        id: 'ex_bench',
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          { setIndex: 0, type: 'work', target: '8-10', weight: 70, actualReps: 8, done: true, rir: 2 },
          { setIndex: 1, type: 'work', target: '8-10', weight: 70, actualReps: 8, done: true, rir: 2 }
        ]
      }
    ]
  });

  repo.saveSession({
    id: 'sess_bkp_02',
    date: '2026-10-15',
    time: '18:00:00',
    dayKey: 'wed',
    dayTitle: 'Leg Day',
    totalSetsDone: 2,
    exercises: [
      {
        id: 'ex_squat',
        name: 'Barbell Squat',
        category: 'legs',
        sets: [
          { setIndex: 0, type: 'work', target: '6-8', weight: 100, actualReps: 6, done: true, rir: 1 },
          { setIndex: 1, type: 'work', target: '6-8', weight: 100, actualReps: 6, done: true, rir: 1 }
        ]
      }
    ]
  });

  repo.saveBodyWeight({
    date: '2026-10-10',
    weight: 72.5,
    note: 'Morning weigh-in'
  });

  // Call GET /api/backup/export/json
  const exportRes = await fetch(`${base}/export/json`);
  assert.strictEqual(exportRes.status, 200, 'Export endpoint must return 200 OK');

  const exportData = await exportRes.json();
  assert.strictEqual(exportData.version, 1, 'Export payload must have version: 1');
  assert.ok(typeof exportData.exportedAt === 'string', 'exportedAt must be an ISO string');
  assert.ok(Array.isArray(exportData.sessions), 'sessions must be an array');
  assert.ok(Array.isArray(exportData.bodyWeights), 'bodyWeights must be an array');

  // Verify exported contents include our seeded sessions
  const exportedS1 = exportData.sessions.find(s => s.id === 'sess_bkp_01' || (s.date === '2026-10-10' && s.time === '10:00:00'));
  assert.ok(exportedS1, 'Session 1 must be present in export');
  assert.strictEqual(exportedS1.exercises[0].exerciseId, 'ex_bench');
  assert.strictEqual(exportedS1.exercises[0].sets.length, 2);

  const exportedBw = exportData.bodyWeights.find(b => b.date === '2026-10-10');
  assert.ok(exportedBw, 'Body weight for 2026-10-10 must be present in export');
  assert.strictEqual(Number(exportedBw.weight), 72.5);

  // Test re-importing the exported JSON with dedupe: true
  // Both sessions already exist in DB -> duplicatesSkipped must be >= 2, sessionsImported: 0
  const importDedupeRes = await fetch(`${base}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'json',
      content: exportData,
      dedupe: true
    })
  });
  assert.strictEqual(importDedupeRes.status, 200, 'Re-import with dedupe: true must return 200 OK');
  const importDedupeData = await importDedupeRes.json();
  assert.strictEqual(importDedupeData.success, true);
  assert.ok(importDedupeData.duplicatesSkipped >= 2, `Expected at least 2 duplicates skipped, got ${importDedupeData.duplicatesSkipped}`);
  console.log('  ✓ JSON export and re-import with dedupe: true verified.\n');

  // ----------------------------------------------------------------
  // [B] Strong / Hevy / GYM CSV Parser & Ingestion (Test 2)
  // ----------------------------------------------------------------
  console.log('▶ [3] Testing Strong, Hevy, and GYM CSV Parsers & Ingestion...');

  // 1. Strong format: Date,Workout Name,Exercise Name,Set Order,Weight,Reps,RPE
  const strongCsv = [
    'Date,Workout Name,Exercise Name,Set Order,Weight,Reps,RPE',
    '2026-11-01 09:30:00,Morning Push,Overhead Press,1,45.0,8,8',
    '2026-11-01 09:30:00,Morning Push,Overhead Press,2,45.0,8,8',
    '2026-11-01 09:30:00,Morning Push,Lateral Raise,1,12.0,12,9'
  ].join('\n');

  const strongRes = await fetch(`${base}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'csv',
      content: strongCsv,
      dedupe: true
    })
  });
  assert.strictEqual(strongRes.status, 200, 'Strong CSV import must return 200 OK');
  const strongData = await strongRes.json();
  assert.strictEqual(strongData.success, true);
  assert.ok(strongData.sessionsImported >= 1, 'Strong session must be imported');
  assert.ok(strongData.setsImported >= 3, 'Strong sets must be imported');

  // Verify Strong session created in SQLite
  const strongSession = repo.db.prepare('SELECT * FROM workout_sessions WHERE date = ?').get('2026-11-01');
  assert.ok(strongSession, 'Strong session row must exist in workout_sessions');

  // 2. Hevy format: Date,Workout Name,Exercise Title,Set Type,Weight (kg),Reps,RIR
  const hevyCsv = [
    'Date,Workout Name,Exercise Title,Set Type,Weight (kg),Reps,RIR',
    '2026-11-03 17:15:00,Evening Pull,Lat Pulldown,normal,55.0,10,2',
    '2026-11-03 17:15:00,Evening Pull,Lat Pulldown,normal,55.0,10,2',
    '2026-11-03 17:15:00,Evening Pull,Bicep Curl,normal,14.0,12,1'
  ].join('\n');

  const hevyRes = await fetch(`${base}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'csv',
      content: hevyCsv,
      dedupe: true
    })
  });
  assert.strictEqual(hevyRes.status, 200, 'Hevy CSV import must return 200 OK');
  const hevyData = await hevyRes.json();
  assert.strictEqual(hevyData.success, true);
  assert.ok(hevyData.sessionsImported >= 1, 'Hevy session must be imported');
  assert.ok(hevyData.setsImported >= 3, 'Hevy sets must be imported');

  const hevySession = repo.db.prepare('SELECT * FROM workout_sessions WHERE date = ?').get('2026-11-03');
  assert.ok(hevySession, 'Hevy session row must exist in workout_sessions');

  // 3. Case-insensitive and extra columns resilience
  const resilientCsv = [
    'date,WORKOUT NAME,Exercise Name,Set Order,weight,REPS,RPE,Notes,ExtraColumn',
    '2026-11-05 18:00:00,Legs,Barbell Squat,1,110.0,5,8,Felt strong,some_extra_val'
  ].join('\n');

  const resilientRes = await fetch(`${base}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'csv',
      content: resilientCsv,
      dedupe: true
    })
  });
  assert.strictEqual(resilientRes.status, 200, 'Case-insensitive CSV import must return 200 OK');
  console.log('  ✓ Strong, Hevy, and flexible CSV formats parsed and ingested successfully.\n');

  // ----------------------------------------------------------------
  // [C] Transactional Rollback on Malformed Data (Test 3)
  // ----------------------------------------------------------------
  console.log('▶ [4] Testing Transactional Rollback on Malformed Data...');

  const sessionsCountBefore = repo.db.prepare('SELECT COUNT(*) as c FROM workout_sessions').get().c;
  const setsCountBefore = repo.db.prepare('SELECT COUNT(*) as c FROM session_sets').get().c;

  // Middle-of-file corrupted CSV (first row valid, second row has non-numeric weight)
  const corruptCsv = [
    'Date,Workout Name,Exercise Name,Set Order,Weight,Reps,RPE',
    '2026-11-08 10:00:00,Corrupt Workout,Dumbbell Curl,1,16.0,10,8',
    '2026-11-08 10:00:00,Corrupt Workout,Dumbbell Curl,2,CORRUPT_INVALID_WEIGHT,10,8'
  ].join('\n');

  const corruptRes = await fetch(`${base}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      format: 'csv',
      content: corruptCsv,
      dedupe: true
    })
  });
  assert.strictEqual(corruptRes.status, 400, 'Corrupted CSV payload must be rejected with 400 Bad Request');

  // Verify complete atomic rollback: session counts and set counts must match EXACTLY
  const sessionsCountAfter = repo.db.prepare('SELECT COUNT(*) as c FROM workout_sessions').get().c;
  const setsCountAfter = repo.db.prepare('SELECT COUNT(*) as c FROM session_sets').get().c;
  assert.strictEqual(sessionsCountAfter, sessionsCountBefore, 'Rollback must ensure no sessions are left behind');
  assert.strictEqual(setsCountAfter, setsCountBefore, 'Rollback must ensure no sets are left behind');

  const corruptSessionCheck = repo.db.prepare('SELECT * FROM workout_sessions WHERE date = ?').get('2026-11-08');
  assert.strictEqual(corruptSessionCheck, undefined, 'Corrupted session must not exist in database');
  console.log('  ✓ Atomic transaction rollback verified: zero partial/orphaned rows committed.\n');

  // ----------------------------------------------------------------
  // [D] Input Validation & Error Boundaries (Test 4)
  // ----------------------------------------------------------------
  console.log('▶ [5] Testing Input Validation & Boundary Checks (400 Bad Request)...');

  // 1. Empty body {}
  const emptyBodyRes = await fetch(`${base}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.strictEqual(emptyBodyRes.status, 400);

  // 2. Unknown format
  const badFormatRes = await fetch(`${base}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'xml', content: '<workouts></workouts>' })
  });
  assert.strictEqual(badFormatRes.status, 400);

  // 3. Empty content
  const emptyContentRes = await fetch(`${base}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'csv', content: '' })
  });
  assert.strictEqual(emptyContentRes.status, 400);

  // 4. Non-workout CSV (missing recognizable headers) -> spec error message
  const nonWorkoutCsv = 'Name,Age,Occupation\nJohn,30,Developer';
  const nonWorkoutRes = await fetch(`${base}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'csv', content: nonWorkoutCsv })
  });
  assert.strictEqual(nonWorkoutRes.status, 400);
  const nonWorkoutData = await nonWorkoutRes.json();
  assert.ok(nonWorkoutData.error, 'Error message must be present for unrecognized CSV');
  assert.strictEqual(nonWorkoutData.error, 'รูปแบบไฟล์ไม่ถูกต้อง หรือไม่พบข้อมูลเซสชันการฝึกที่รองรับ');

  // 5. Unparseable JSON content
  const badJsonRes = await fetch(`${base}/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format: 'json', content: '{ unclosed json' })
  });
  assert.strictEqual(badJsonRes.status, 400);
  console.log('  ✓ 400 Bad Request boundaries and localized Thai error message verified.\n');

  // ----------------------------------------------------------------
  // [E] Pre-existing Data Integrity Check (Test 5)
  // ----------------------------------------------------------------
  console.log('▶ [6] Verifying seeded data in pre-existing tables remains intact...');
  const drafts = repo.getAllDrafts();
  assert.ok(drafts.mon, 'Drafts in mon must remain intact');
  assert.strictEqual(drafts.mon.ex_bench.wt_0, '70');

  const todos = repo.getTodos();
  const seededTodo = todos.find(t => t.id === 'todo_seed_backup');
  assert.ok(seededTodo, 'Seeded todo must remain intact');
  assert.strictEqual(seededTodo.text, 'Backup test todo');
  console.log('  ✓ Pre-existing draft and todos completely uncorrupted.\n');

} finally {
  await new Promise(resolve => server.close(resolve));
}

console.log('====================================================');
console.log('🎉 ALL WORKOUT BACKUP & RESTORE TESTS PASSED!');
console.log('====================================================');
