import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Contract: GET /api/exercises/:id/history returns per set: weight, actualReps, done, rir, rirPlus (plus existing keys).
 * GET /api/exercises/:id/advice basedOn.rir agrees with the latest session in history.
 * Uses a temp database (set before server/db.js loads) and a unique exercise id.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-hist-rir-')), 'gym-test.db');
}
const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

console.log('====================================================');
console.log('🧪 Contract: RIR in exercise history and advice');
console.log('====================================================\n');

const ex = 'test_rir_contract_bench';
const set = (setIndex, type, target, weight, actualReps, done, rir, rirPlus = false) =>
  ({ setIndex, type, target, weight, actualReps, done, rir, rirPlus });

repo.saveSession({
  id: 'test_rir_contract_1', date: '2026-11-10', time: '18:00', dayKey: 'mon', dayTitle: 't', totalSetsDone: 2,
  exercises: [{ id: ex, name: 'Bench', category: 'ท่าหลัก', sets: [
    set(1, 'วอร์ม', '15 ครั้ง', 35, 15, true, null),
    set(2, 'เล่นจริง', '6–8 ครั้ง', 70, 8, true, 1)
  ] }]
});
repo.saveSession({
  id: 'test_rir_contract_2', date: '2026-11-17', time: '18:00', dayKey: 'mon', dayTitle: 't', totalSetsDone: 2,
  exercises: [{ id: ex, name: 'Bench', category: 'ท่าหลัก', sets: [
    set(1, 'วอร์ม', '15 ครั้ง', 40, 20, true, null),
    set(2, 'เล่นจริง', '6–8 ครั้ง', 70, 8, true, 2, true),   // "เหลือ 2+"
    set(3, 'เล่นจริง', '6–8 ครั้ง', 70, 7, false, 0)          // unticked: RIR must not be saved
  ] }]
});

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
try {
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/api/exercises/${ex}`;

  // 1. Shape: every set has rir and rirPlus, and the existing keys are still there
  console.log('▶ [1] History sets carry rir and rirPlus...');
  const history = await (await fetch(`${base}/history`)).json();
  assert.ok(Array.isArray(history) && history.length === 2);
  for (const session of history) {
    for (const s of session.sets) {
      for (const key of ['setIndex', 'type', 'target', 'weight', 'actualReps', 'done', 'rir', 'rirPlus']) {
        assert.ok(key in s, `set is missing ${key}`);
      }
      assert.ok(s.rir === null || Number.isInteger(s.rir), 'rir is null or integer');
      assert.strictEqual(typeof s.rirPlus, 'boolean');
    }
    assert.ok('pr' in session, 'pr stays on each session');
  }
  console.log('✓ Keys present: setIndex, type, target, weight, actualReps, done, rir, rirPlus, pr.');

  // 2. Values: RIR and "2+" round-trip; unticked set stores no RIR
  console.log('▶ [2] RIR values round-trip...');
  const latest = history[0];
  assert.strictEqual(latest.date, '2026-11-17');
  const top = latest.sets.find((s) => s.setIndex === 2);
  assert.strictEqual(top.rir, 2);
  assert.strictEqual(top.rirPlus, true, '"2+" is kept');
  const unticked = latest.sets.find((s) => s.setIndex === 3);
  assert.strictEqual(unticked.done, false);
  assert.strictEqual(unticked.rir, null, 'unticked set has no RIR');
  assert.strictEqual(history[1].sets.find((s) => s.setIndex === 2).rir, 1);
  console.log('✓ 70×8 RIR 2 "2+" kept; unticked set RIR null; earlier session RIR 1.');

  // 3. Advice basis agrees with the latest history session
  console.log('▶ [3] Advice basedOn matches history...');
  const advice = await (await fetch(`${base}/advice`)).json();
  assert.strictEqual(advice.advice.basedOn.date, latest.date);
  assert.strictEqual(advice.advice.basedOn.weight, top.weight);
  assert.strictEqual(advice.advice.basedOn.reps, top.actualReps);
  assert.strictEqual(advice.advice.basedOn.rir, top.rir);
  assert.strictEqual(advice.advice.action, 'increase', 'RIR 2+ at target reps increases');
  console.log('✓ basedOn = 70 kg × 8 at RIR 2 from the same data as history.');
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log('\n====================================================');
console.log('🎉 HISTORY RIR CONTRACT PASSED!');
console.log('====================================================');
