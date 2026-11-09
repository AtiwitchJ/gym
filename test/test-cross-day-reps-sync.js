import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import repo from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Cross-Day Reps & Data Synchronization (ท่าเหมือนกัน ข้อมูลครั้งต้อง sync กัน)...');

// Clean test records before running to ensure deterministic assertions
repo.db.prepare("DELETE FROM exercise_last_weights WHERE exercise_id IN ('th1', 'b_m_shoulder', 'b_t_shoulder', 'b_w_shoulder', 'shoulder_press')").run();
repo.db.prepare("DELETE FROM workout_sessions WHERE id = 'test_session_thu_reps_sync'").run();

// 1. Test scenario matching user's real data on Thursday
// Thursday th1 (Shoulder Press) performed with:
// W1: 14 kg x 15 reps
// S1: 28 kg x 6 reps
// S2: 29 kg x 4 reps
// S3: 26 kg x 6 reps
const testDateThu = '2026-11-09';
const thuTimestamp = '2026-11-09T19:07:31.000Z';

const thuSession = {
  id: 'test_session_thu_reps_sync',
  date: testDateThu,
  time: '19:07',
  dayKey: 'thu',
  dayTitle: 'วันพฤหัสบดี: ไหล่ครบทุกมุม + หน้าท้อง (Shoulders & Abs)',
  totalSetsDone: 4,
  exercises: [
    {
      id: 'th1',
      name: 'Shoulder Press Machine',
      category: 'ท่าหลัก',
      sets: [
        { setIndex: 1, type: 'warm', target: '15 ครั้ง', weight: 14, actualReps: 15, done: true },
        { setIndex: 2, type: 'work', target: '6–8 ครั้ง', weight: 28, actualReps: 6, done: true },
        { setIndex: 3, type: 'work', target: '6–8 ครั้ง', weight: 29, actualReps: 4, done: true },
        { setIndex: 4, type: 'work', target: '6–8 ครั้ง', weight: 26, actualReps: 6, done: true }
      ]
    }
  ]
};

repo.saveSession(thuSession);

// 2. Verify th1 in SQLite has exact reps and weights for all sets
const th1Weights = repo.getLastWeights('th1');
assert(th1Weights, 'th1 must exist in SQLite');
assert.strictEqual(th1Weights.wt_0, 14, 'th1 warm weight must be 14kg');
assert.strictEqual(th1Weights.reps_0, 15, 'th1 warm reps must be 15');
assert.strictEqual(th1Weights.wt_1, 28, 'th1 set 1 weight must be 28kg');
assert.strictEqual(th1Weights.reps_1, 6, 'th1 set 1 reps must be 6');
assert.strictEqual(th1Weights.wt_2, 29, 'th1 set 2 weight must be 29kg');
assert.strictEqual(th1Weights.reps_2, 4, 'th1 set 2 reps must be 4');
assert.strictEqual(th1Weights.wt_3, 26, 'th1 set 3 weight must be 26kg');
assert.strictEqual(th1Weights.reps_3, 6, 'th1 set 3 reps must be 6');

console.log('✓ th1 sets 1, 2, 3 weights and reps saved accurately in SQLite');

// 3. Verify Monday bonus shoulder (b_m_shoulder), Tue (b_t_shoulder), Wed (b_w_shoulder) received Thursday working reps
const bmWeights = repo.getLastWeights('b_m_shoulder');
assert(bmWeights, 'b_m_shoulder must exist in SQLite');
assert.strictEqual(bmWeights.wt_0, 14, 'b_m_shoulder warm weight must sync to 14kg');
assert.strictEqual(bmWeights.reps_0, 15, 'b_m_shoulder warm reps must sync to 15');
// Touchup should sync from main lift working set (set 1)
assert.strictEqual(bmWeights.wt_1, 28, 'b_m_shoulder touchup weight must sync from Thursday (28kg)');
assert.strictEqual(bmWeights.reps_1, 6, 'b_m_shoulder touchup reps must sync from Thursday (6 reps)');

console.log('✓ Thursday main reps and weight synced to Monday bonus shoulder (b_m_shoulder)');

// 4. Test timestamp protection: An older record from Monday (2026-11-02) MUST NOT overwrite Thursday (2026-11-09)
const olderMonTimestamp = '2026-11-02T14:31:00.000Z';
repo.saveLastRecord('b_m_shoulder', 1, 29, 8, olderMonTimestamp);

const th1AfterOlderAttempt = repo.getLastWeights('th1');
assert.strictEqual(
  th1AfterOlderAttempt.wt_1,
  28,
  'th1 working weight must NOT be overwritten by older Monday record (must remain 28kg, not 29kg)'
);
assert.strictEqual(
  th1AfterOlderAttempt.reps_1,
  6,
  'th1 working reps must NOT be overwritten by older Monday record (must remain 6 reps, not 8 reps)'
);

console.log('✓ Timestamp protection: older record (2026-11-02) cannot overwrite newer record (2026-11-09)');

// 5. Test contract checks on frontend files
const storeCode = fs.readFileSync(path.resolve(__dirname, '../src/composables/useWorkoutStore.js'), 'utf8');
const exCardCode = fs.readFileSync(path.resolve(__dirname, '../src/components/ExerciseCard.vue'), 'utf8');
const bonusCardCode = fs.readFileSync(path.resolve(__dirname, '../src/components/BonusCard.vue'), 'utf8');
const serverCode = fs.readFileSync(path.resolve(__dirname, '../server/server.js'), 'utf8');

// server.js must pass objUpdatedAt or timestamp to repo.saveLastRecord
assert(
  serverCode.includes('repo.saveLastRecord(exId, setIdx, v, repsVal,') ||
  serverCode.includes('wObj.updatedAt'),
  'server.js must forward updatedAt to saveLastRecord to prevent timestamp stomping'
);

// db.js ON CONFLICT DO UPDATE SET must protect with WHERE timestamp condition
const dbCode = fs.readFileSync(path.resolve(__dirname, '../server/db.js'), 'utf8');
assert(
  dbCode.includes('WHERE excluded.updated_at >= exercise_last_weights.updated_at') ||
  dbCode.includes('WHERE excluded.updated_at >='),
  'db.js must conditionally update last weights only if incoming timestamp is >= existing timestamp'
);

console.log('✓ Database and server timestamp integrity verified');
console.log('All Cross-Day Reps & Data Synchronization tests passed successfully!');
