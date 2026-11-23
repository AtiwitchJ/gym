import assert from 'node:assert';
const mod = await import('../server/volume-landmarks.js');
const { statusFor, buildVolumeLandmarks, LANDMARKS } = mod.default || mod;

console.log('====================================================');
console.log('🧪 QA Test: Weekly Volume Landmarks (pure logic)');
console.log('====================================================\n');

const NOW = Date.parse('2026-11-24T12:00:00.000Z'); // Tuesday; week starts Mon 2026-11-23
const MON = '2026-11-23';
const SUN_PREV = '2026-11-22';

// 1. status boundaries
console.log('▶ [1] Landmark status boundaries...');
for (const [key, t] of Object.entries(LANDMARKS)) {
  assert.strictEqual(statusFor(t.mev - 1, t), 'under', `${key} below MEV`);
  assert.strictEqual(statusFor(t.mev, t), 'optimal', `${key} at MEV`);
  assert.strictEqual(statusFor(t.mav, t), 'optimal', `${key} at MAV`);
  assert.strictEqual(statusFor(t.mav + 1, t), 'near_mrv', `${key} above MAV`);
  assert.strictEqual(statusFor(t.mrv, t), 'near_mrv', `${key} at MRV`);
  assert.strictEqual(statusFor(t.mrv + 1, t), 'overreached', `${key} above MRV`);
}
console.log('  ✓ All 11 slugs respect <mev / mev..mav / mav..mrv / >mrv bands.\n');

// 2. zero sessions returns all 11 slugs at zero
console.log('▶ [2] Empty store returns 11 under-trained slugs...');
const empty = buildVolumeLandmarks([], NOW);
assert.strictEqual(empty.weekStart, MON);
assert.strictEqual(empty.landmarks.length, 11);
assert.ok(empty.landmarks.every((l) => l.setsDone === 0 && l.status === 'under'));
assert.strictEqual(empty.summary.totalWorkingSets, 0);
console.log('  ✓ 11 slugs, zero sets, status under.\n');

// 3. warmup excluded even when done=1
console.log('▶ [3] Warmup sets excluded...');
const warmupOnly = buildVolumeLandmarks([
  { exerciseId: 't1', date: MON, done: 1, type: 'warmup' },
  { exerciseId: 't1', date: MON, done: 1, type: 'warm' }
], NOW);
assert.strictEqual(warmupOnly.summary.totalWorkingSets, 0);
console.log('  ✓ warm/warmup sets never counted.\n');

// 4. slug aggregation (all chest exercises -> chest)
console.log('▶ [4] Slug aggregation across chest exercises...');
const aggregated = buildVolumeLandmarks([
  { exerciseId: 't1', date: MON, done: 1, type: 'normal' },
  { exerciseId: 't2', date: MON, done: 1, type: 'normal' },
  { exerciseId: 't3', date: MON, done: 1, type: 'normal' },
  { exerciseId: 'a1', date: MON, done: 1, type: 'normal' },
  { exerciseId: 'a3', date: MON, done: 1, type: 'normal' },
  { exerciseId: 'a5', date: MON, done: 1, type: 'normal' }
], NOW);
const chest = aggregated.landmarks.find((l) => l.muscleKey === 'chest');
assert.strictEqual(chest.setsDone, 6);
assert.strictEqual(aggregated.landmarks.length, 11);
console.log('  ✓ t1/t2/t3/a1/a3/a5 -> chest (6 sets).\n');

// 5. week rollover (Sunday 23:59 of previous week must not leak)
console.log('▶ [5] Week rollover...');
const rollover = buildVolumeLandmarks([
  { exerciseId: 't1', date: SUN_PREV, done: 1, type: 'normal' },
  { exerciseId: 't1', date: MON, done: 1, type: 'normal' }
], NOW);
assert.strictEqual(rollover.landmarks.find((l) => l.muscleKey === 'chest').setsDone, 1);
console.log('  ✓ Previous Sunday excluded, current Monday included.\n');

// 6. summary counters consistent
console.log('▶ [6] Summary counters consistent with landmarks...');
const many = buildVolumeLandmarks(
  Array.from({ length: 23 }, () => ({ exerciseId: 'w2', date: MON, done: 1, type: 'normal' })).concat(
    Array.from({ length: 2 }, () => ({ exerciseId: 't1', date: MON, done: 1, type: 'normal' }))
  ), NOW);
assert.strictEqual(many.summary.overreachedCount, 1);
assert.strictEqual(many.summary.totalWorkingSets, 25);
assert.strictEqual(many.summary.status, 'overreached');
console.log('  ✓ Counters and overall status match.\n');

console.log('\n====================================================');
console.log('🎉 ALL VOLUME LANDMARKS PURE TESTS PASSED!');
console.log('====================================================\n');
