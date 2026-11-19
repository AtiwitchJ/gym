import assert from 'node:assert';
import { sessionWorkingVolume, totalWorkingVolume } from '../src/composables/workingVolume.js';
import volume from '../server/volume.js';

/**
 * Account page volume and weekly chart must use one rule: completed working sets, warm-ups excluded, weight × reps.
 */

const NOW = Date.parse('2026-11-19T12:00:00.000Z');

const session = {
  date: '2026-11-17',
  time: '18:00',
  exercises: [
    {
      id: 'a1_chest_press', name: 'Chest Press',
      sets: [
        { type: 'วอร์ม', weight: 35, actualReps: 15, done: true },   // warm-up: excluded
        { type: 'เล่นจริง', weight: 70, actualReps: 8, done: true },
        { type: 'เล่นจริง', weight: 70, actualReps: 8, done: true },
        { type: 'เล่นจริง', weight: 70, actualReps: 8, done: false }  // skipped: excluded
      ]
    },
    {
      id: 'a2_incline_chest', name: 'Incline',
      sets: [
        { type: 'warm', weight: 20, actualReps: 15, done: true },     // warm-up: excluded
        { type: 'ซ้อมเสริม', weight: 20, actualReps: 10, done: true }
      ]
    }
  ]
};

console.log('====================================================');
console.log('🧪 Test: Working volume (account page = weekly chart rule)');
console.log('====================================================\n');

// 1. Frontend rule
console.log('▶ [1] sessionWorkingVolume rule...');
assert.strictEqual(sessionWorkingVolume(session), 70 * 8 * 2 + 20 * 10); // 1320
assert.strictEqual(sessionWorkingVolume({ exercises: [] }), 0);
assert.strictEqual(sessionWorkingVolume(null), 0);
console.log('✓ 1320 kg: warm-ups and skipped sets excluded.');

// 2. Same number as the server weekly calculation for the same session
console.log('▶ [2] Parity with server weekly volume...');
const rows = session.exercises.flatMap((ex) => ex.sets.map((s) => ({
  exerciseId: ex.id,
  exerciseName: ex.name,
  date: session.date,
  done: s.done ? 1 : 0,
  type: s.type,
  weight: s.weight,
  actualReps: s.actualReps
})));
const weekly = volume.buildWeeklyVolume(rows, NOW);
const serverTotal = weekly.weeks[7].exercises.reduce((sum, e) => sum + e.volume, 0);
assert.strictEqual(serverTotal, sessionWorkingVolume(session), 'server weekly total must equal account rule');
console.log(`✓ Server weekly total ${serverTotal} = frontend ${sessionWorkingVolume(session)}.`);

// 3. Account total: sums all saved sessions (lifetime), not just the 8-week window
console.log('▶ [3] totalWorkingVolume is lifetime...');
const older = { date: '2026-10-01', time: '18:00', exercises: [{ id: 'x', name: 'X', sets: [{ type: 'เล่นจริง', weight: 50, actualReps: 10, done: true }] }] };
assert.strictEqual(totalWorkingVolume([session, older]), 1320 + 500);
assert.strictEqual(totalWorkingVolume([]), 0);
assert.strictEqual(totalWorkingVolume(undefined), 0);
console.log('✓ Lifetime total 1820 = 1320 + 500 (older session outside the 8-week chart).');

console.log('\n====================================================');
console.log('🎉 WORKING VOLUME TESTS PASSED!');
console.log('====================================================');
