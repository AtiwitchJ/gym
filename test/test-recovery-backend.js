import assert from 'node:assert';
import recovery from '../server/recovery.js';
import MUSCLE_MAP from '../server/muscle-map.js';
import { workoutData } from '../src/data/workouts.js';
import { PROGRAM_A, PROGRAM_B } from '../src/data/abSplit.js';

/**
 * Backend unit tests for server/recovery.js (SPEC docs/COMPETITOR-RE-BENCHMARK-SPEC.md §2.3).
 * Route-level contract (GET /api/recovery) is covered by test/test-recovery-contract.js.
 */

const {
  RECOVERY_WINDOW_HOURS,
  listMuscles,
  statusFromPct,
  toTrainedAtMs,
  buildTrainingEvents,
  computeRecovery,
  buildRecovery,
} = recovery;

const HOUR = 3600 * 1000;
const NOW = Date.parse('2026-11-19T12:00:00.000Z');

console.log('====================================================');
console.log('🧪 Backend Test: Recovery pure functions (SPEC 2.3)');
console.log('====================================================\n');

// 1. Constants and thresholds
console.log('▶ [1] Constants and status thresholds...');
assert.strictEqual(RECOVERY_WINDOW_HOURS, 48);
assert.strictEqual(statusFromPct(0), 'fatigued');
assert.strictEqual(statusFromPct(49), 'fatigued');
assert.strictEqual(statusFromPct(50), 'recovering');
assert.strictEqual(statusFromPct(84), 'recovering');
assert.strictEqual(statusFromPct(85), 'ready');
assert.strictEqual(statusFromPct(100), 'ready');
console.log('✓ Thresholds 0–49 / 50–84 / 85–100 verified.');

// 2. Formula: min(100, hours / 48 * 100)
console.log('▶ [2] Recovery formula...');
const lastByMuscle = new Map([
  ['A', NOW - 12 * HOUR], // 25%
  ['B', NOW - 24 * HOUR], // 50%
  ['C', NOW - 42 * HOUR], // 87.5 -> 88
  ['D', NOW - 48 * HOUR], // 100
  ['E', NOW - 96 * HOUR], // capped at 100
  ['F', NOW + 5 * HOUR],  // future timestamp -> 0
]);
const out = computeRecovery(lastByMuscle, NOW, ['A', 'B', 'C', 'D', 'E', 'F', 'Z']);
const byName = Object.fromEntries(out.map((r) => [r.muscle, r]));
assert.deepStrictEqual(byName.A, {
  muscle: 'A',
  lastTrainedAt: new Date(NOW - 12 * HOUR).toISOString(),
  recoveryPct: 25,
  status: 'fatigued',
});
assert.strictEqual(byName.B.recoveryPct, 50);
assert.strictEqual(byName.B.status, 'recovering');
assert.strictEqual(byName.C.recoveryPct, 88);
assert.strictEqual(byName.C.status, 'ready');
assert.strictEqual(byName.D.recoveryPct, 100);
assert.strictEqual(byName.E.recoveryPct, 100);
assert.strictEqual(byName.F.recoveryPct, 0);
assert.strictEqual(byName.F.status, 'fatigued');
console.log('✓ Linear 48h rule, 100% cap, and future-timestamp clamp verified.');

// 3. Never-trained muscles
console.log('▶ [3] Never-trained muscle...');
assert.deepStrictEqual(byName.Z, { muscle: 'Z', lastTrainedAt: null, recoveryPct: 100, status: 'ready' });
console.log('✓ Never-trained → lastTrainedAt null, 100, ready.');

// 4. Training events: completed sets only, mapped by exercise id, latest time per muscle
console.log('▶ [4] Training event extraction...');
const testMap = { ex_bench: 'Chest', ex_row: 'Back' };
const rows = [
  { exerciseId: 'ex_bench', date: '2026-11-10', time: '18:00', done: 1 },
  { exerciseId: 'ex_bench', date: '2026-11-15', time: '07:30', done: 1 },
  { exerciseId: 'ex_bench', date: '2026-11-18', time: '09:00', done: 0 },   // not completed
  { exerciseId: 'ex_row', date: '2026-11-16', time: '19:00', done: 1 },
  { exerciseId: 'unknown_ex', date: '2026-11-18', time: '09:00', done: 1 }, // no mainMuscle
  { exerciseId: 'ex_row', date: 'not-a-date', time: '19:00', done: 1 },     // invalid date
  { exerciseId: 'ex_row', date: '', time: '19:00', done: 1 },               // missing date
  null,
];
const events = buildTrainingEvents(rows, testMap);
assert.strictEqual(events.size, 2);
assert.strictEqual(events.get('Chest'), Date.parse('2026-11-15T07:30:00.000Z'));
assert.strictEqual(events.get('Back'), Date.parse('2026-11-16T19:00:00.000Z'));
assert.ok(Number.isNaN(toTrainedAtMs(undefined, '07:30')));
assert.strictEqual(toTrainedAtMs('2026-11-15', null), Date.parse('2026-11-15T00:00:00.000Z'));
console.log('✓ Only done sets with a known mainMuscle counted; latest time per muscle kept.');

// 5. Pipeline output contract
console.log('▶ [5] Pipeline output contract...');
const pipeline = buildRecovery(
  [{ exerciseId: 'ex_bench', date: '2026-11-19', time: '06:00', done: 1 }], // 6h before NOW
  NOW,
  testMap
);
assert.deepStrictEqual(pipeline.map((r) => r.muscle), ['Chest', 'Back']);
for (const item of pipeline) {
  assert.deepStrictEqual(Object.keys(item).sort(), ['lastTrainedAt', 'muscle', 'recoveryPct', 'status']);
  assert.strictEqual(typeof item.recoveryPct, 'number');
  assert.ok(['fatigued', 'recovering', 'ready'].includes(item.status));
}
assert.strictEqual(pipeline[0].recoveryPct, 13); // 6 / 48 = 12.5 -> 13
assert.strictEqual(pipeline[0].status, 'fatigued');
assert.deepStrictEqual(pipeline[1], { muscle: 'Back', lastTrainedAt: null, recoveryPct: 100, status: 'ready' });
assert.deepStrictEqual(buildRecovery(null, NOW, testMap).map((r) => r.recoveryPct), [100, 100]);
console.log('✓ Shape { muscle, lastTrainedAt, recoveryPct, status } verified.');

// 6. Muscle map stays in sync with frontend mainMuscle data
console.log('▶ [6] Muscle map sync with src/data...');
const sourcePairs = new Map();
const walk = (o) => {
  if (Array.isArray(o)) return o.forEach(walk);
  if (o && typeof o === 'object') {
    if (o.id && o.mainMuscle && !sourcePairs.has(o.id)) sourcePairs.set(o.id, o.mainMuscle);
    Object.values(o).forEach((v) => v && typeof v === 'object' && walk(v));
  }
};
walk(workoutData);
walk(PROGRAM_A);
walk(PROGRAM_B);
assert.strictEqual(Object.keys(MUSCLE_MAP).length, sourcePairs.size, 'muscle-map.js entry count differs from src/data');
for (const [id, muscle] of sourcePairs) {
  assert.strictEqual(MUSCLE_MAP[id], muscle, `muscle-map.js mismatch for ${id}`);
}
assert.strictEqual(listMuscles(MUSCLE_MAP).length, new Set(Object.values(MUSCLE_MAP)).size);
console.log(`✓ ${sourcePairs.size} exercise ids match src/data mainMuscle.`);

console.log('\n====================================================');
console.log('🎉 BACKEND RECOVERY TESTS PASSED!');
console.log('====================================================');
