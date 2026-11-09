import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import repo from '../server/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Testing Canonical Cross-Day Database & State Synchronization...');

// Clean test records before running to ensure deterministic assertions
repo.db.prepare("DELETE FROM exercise_last_weights WHERE exercise_id IN ('th1', 'b_m_shoulder', 'shoulder_press')").run();
repo.db.prepare("DELETE FROM workout_sessions WHERE id IN ('test_session_mon_shoulder', 'test_session_thu_shoulder')").run();

// 1. Verify Canonical ID mappings in DB layer
assert.strictEqual(repo.getCanonicalExerciseId('th1'), 'shoulder_press', 'th1 should map to shoulder_press');
assert.strictEqual(repo.getCanonicalExerciseId('b_m_shoulder'), 'shoulder_press', 'b_m_shoulder should map to shoulder_press');
assert.strictEqual(repo.getCanonicalExerciseId('b_t_shoulder'), 'shoulder_press', 'b_t_shoulder should map to shoulder_press');
assert.strictEqual(repo.getCanonicalExerciseId('b_w_shoulder'), 'shoulder_press', 'b_w_shoulder should map to shoulder_press');

assert.strictEqual(repo.getCanonicalExerciseId('t1'), 'chest_press', 't1 should map to chest_press');
assert.strictEqual(repo.getCanonicalExerciseId('b_m_chest'), 'chest_press', 'b_m_chest should map to chest_press');

assert.strictEqual(repo.getCanonicalExerciseId('w2'), 'lat_pulldown', 'w2 should map to lat_pulldown');
assert.strictEqual(repo.getCanonicalExerciseId('b_m_back'), 'lat_pulldown', 'b_m_back should map to lat_pulldown');

assert.strictEqual(repo.getCanonicalExerciseId('m1'), 'seated_leg_press', 'm1 should map to seated_leg_press');
assert.strictEqual(repo.getCanonicalExerciseId('b_th_leg'), 'seated_leg_press', 'b_th_leg should map to seated_leg_press');

console.log('✓ Canonical ID mappings verified across all 4 movement groups');

// 2. Test saving Monday session with bonus shoulder touchup (b_m_shoulder)
const testDateMon = '2026-11-16';
const monSession = {
  id: 'test_session_mon_shoulder',
  date: testDateMon,
  time: '18:00',
  dayKey: 'mon',
  dayTitle: 'อก & หน้าแขน (เสริม ไหล่/หลัง/ท้อง)',
  totalSetsDone: 2,
  exercises: [
    {
      id: 'b_m_shoulder',
      name: 'Machine Shoulder Press (เซ็ตเสริม)',
      sets: [
        { setIndex: 1, type: 'warm', target: '15-20', weight: 20, actualReps: 15, done: true },
        { setIndex: 2, type: 'touchup', target: '10-12', weight: 42.5, actualReps: 10, done: true }
      ]
    }
  ]
};

repo.saveSession(monSession);

// Verify last weights in SQLite for Thursday main shoulder (th1)
const th1LastWeights = repo.getLastWeights('th1');
assert(th1LastWeights, 'th1 must have last weights in SQLite after Monday bonus was saved');
assert.strictEqual(th1LastWeights.wt_0, 20, 'th1 warm-up weight should be synced from Monday (20kg)');
assert.strictEqual(th1LastWeights.wt_1, 42.5, 'th1 working set 1 should be synced from Monday (42.5kg)');
assert.strictEqual(th1LastWeights.wt_2, 42.5, 'th1 working set 2 should be harmonized to 42.5kg');
assert.strictEqual(th1LastWeights.wt_3, 42.5, 'th1 working set 3 should be harmonized to 42.5kg');

// Verify unified exercise history querying by canonical shoulder_press
const shoulderHistory = repo.getExerciseHistory('shoulder_press');
assert(Array.isArray(shoulderHistory), 'Shoulder history should be an array');
assert(shoulderHistory.some(s => s.exerciseId === 'b_m_shoulder'), 'History should contain Monday bonus shoulder record');

// Verify unified exercise history querying directly by Thursday ID 'th1'
const th1History = repo.getExerciseHistory('th1');
assert(th1History.some(s => s.exerciseId === 'b_m_shoulder'), 'th1 history query should include linked Monday session');

console.log('✓ Monday bonus shoulder (b_m_shoulder) seamlessly propagated to Thursday main (th1) in SQLite');

// 3. Test saving Thursday session with main shoulder (th1)
const testDateThu = '2026-11-19';
const thuSession = {
  id: 'test_session_thu_shoulder',
  date: testDateThu,
  time: '19:00',
  dayKey: 'thu',
  dayTitle: 'ไหล่ & ขา (เสริม อก/หลัง/แขน)',
  totalSetsDone: 4,
  exercises: [
    {
      id: 'th1',
      name: 'Machine Shoulder Press (ท่าหลัก)',
      sets: [
        { setIndex: 1, type: 'warm', target: '15-20', weight: 22.5, actualReps: 15, done: true },
        { setIndex: 2, type: 'work', target: '6-8', weight: 45, actualReps: 8, done: true },
        { setIndex: 3, type: 'work', target: '6-8', weight: 45, actualReps: 8, done: true },
        { setIndex: 4, type: 'work', target: '6-8', weight: 45, actualReps: 7, done: true }
      ]
    }
  ]
};

repo.saveSession(thuSession);

// Verify last weights in SQLite for Monday bonus shoulder (b_m_shoulder)
const bmLastWeights = repo.getLastWeights('b_m_shoulder');
assert(bmLastWeights, 'b_m_shoulder must have last weights in SQLite after Thursday main was saved');
assert.strictEqual(bmLastWeights.wt_0, 22.5, 'b_m_shoulder warm-up weight should be synced from Thursday (22.5kg)');
assert.strictEqual(bmLastWeights.wt_1, 45, 'b_m_shoulder touchup weight should be updated to Thursday working weight (45kg)');

console.log('✓ Thursday main shoulder (th1) seamlessly propagated back to Monday bonus shoulder (b_m_shoulder) in SQLite');

// 4. Verify UI badges in ExerciseCard and BonusCard
const exerciseCardContent = fs.readFileSync(path.resolve(__dirname, '../src/components/ExerciseCard.vue'), 'utf8');
const bonusCardContent = fs.readFileSync(path.resolve(__dirname, '../src/components/BonusCard.vue'), 'utf8');

assert(exerciseCardContent.includes('linkedSourceBadge'), 'ExerciseCard must compute linkedSourceBadge');
assert(exerciseCardContent.includes('🔗 ซิงค์จาก {{ linkedSourceBadge }}'), 'ExerciseCard must display visual sync badge');

assert(bonusCardContent.includes('linkedSourceBadge'), 'BonusCard must compute linkedSourceBadge');
assert(bonusCardContent.includes('🔗 ซิงค์จาก {{ linkedSourceBadge }}'), 'BonusCard must display visual sync badge');

console.log('✓ Visual link indicators verified in ExerciseCard and BonusCard');

// Clean up test sessions from test database
repo.deleteSession('test_session_mon_shoulder');
repo.deleteSession('test_session_thu_shoulder');

console.log('✓ Canonical Cross-Day Database & State Synchronization tests passed successfully!');
