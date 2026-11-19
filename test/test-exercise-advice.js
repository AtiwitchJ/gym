import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildAdvice, parseTargetReps, INCREASE_KG, DEFAULT_LAST_N } from '../server/advice.js';

/**
 * History-based weight advice (server/advice.js). Pure rule tests, then a route check on a temp database.
 * Shape of input: repo.getExerciseHistory() rows, newest first; each row has sets with type, weight, actualReps, rir, done, target.
 */

const warm = (weight, reps) => ({ type: 'วอร์ม', weight, actualReps: reps, rir: null, done: true, target: '15 ครั้ง' });
const work = (weight, reps, rir, { done = true, target = '6–8 ครั้ง' } = {}) => ({ type: 'เล่นจริง', weight, actualReps: reps, rir, done, target });
const session = (date, sets) => ({ sessionId: `s_${date}`, date, time: '18:00', sets });

console.log('====================================================');
console.log('🧪 Test: History-based weight advice');
console.log('====================================================\n');

// 0. Target parsing
console.log('▶ [0] Target parsing...');
assert.deepStrictEqual(parseTargetReps('6–8 ครั้ง'), { low: 6, high: 8 });
assert.deepStrictEqual(parseTargetReps('15 ครั้ง'), { low: 15, high: 15 });
assert.deepStrictEqual(parseTargetReps('10–15 ครั้ง'), { low: 10, high: 15 });
assert.strictEqual(parseTargetReps('ตามความรู้สึก'), null);
console.log('✓ "6–8" -> 6/8, "15" -> 15/15, text -> null.');

// 1. No history
console.log('▶ [1] No history returns no advice...');
const none = buildAdvice([]);
assert.deepStrictEqual(none, { sessions: [], advice: null, reason: 'no-history' });
assert.deepStrictEqual(buildAdvice([session('2026-11-10', [warm(35, 15)])]), { sessions: [], advice: null, reason: 'no-history' }, 'warm-up-only history is no history');
assert.strictEqual(buildAdvice(undefined).reason, 'no-history');
console.log('✓ Empty history, and warm-up-only history, give advice null with reason no-history.');

// 2. Rule: reached target (upper bound) with RIR 2+ -> increase
console.log('▶ [2] Increase when target reached with RIR 2+...');
const inc = buildAdvice([session('2026-11-17', [work(70, 8, 2)])]);
assert.strictEqual(inc.reason, null);
assert.strictEqual(inc.advice.action, 'increase');
assert.strictEqual(inc.advice.nextWeight, 70 + INCREASE_KG);
assert.strictEqual(inc.advice.nextReps, 6, 'next reps = target low end');
assert.deepStrictEqual(inc.advice.basedOn, { date: '2026-11-17', weight: 70, reps: 8, rir: 2 });
console.log('✓ 70×8 at RIR 2 -> 72 kg × 6.');

// 3. Rule: RIR 0 -> hold
console.log('▶ [3] Hold when RIR 0...');
const rir0 = buildAdvice([session('2026-11-17', [work(70, 8, 0)])]);
assert.strictEqual(rir0.advice.action, 'hold');
assert.strictEqual(rir0.advice.nextWeight, 70);
assert.strictEqual(rir0.advice.nextReps, 8);
console.log('✓ 70×8 at RIR 0 -> hold 70 kg × 8.');

// 4. Rule: reps fell at the same weight -> hold
console.log('▶ [4] Hold when reps fell at the same weight...');
const fell = buildAdvice([
  session('2026-11-17', [work(70, 8, 2, { target: '6–8 ครั้ง' })]),   // reached 8, RIR 2 -> would increase...
  session('2026-11-10', [work(70, 12, 2, { target: '6–8 ครั้ง' })])   // ...but reps were 12 before
]);
assert.strictEqual(fell.advice.action, 'hold');
assert.strictEqual(fell.advice.nextWeight, 70);
console.log('✓ Reps 12 -> 8 at 70 kg: hold even though the target was reached.');

// 5. Rule: target not reached, or RIR 1 -> hold
console.log('▶ [5] Hold when target not reached or RIR 1...');
assert.strictEqual(buildAdvice([session('2026-11-17', [work(70, 6, 2)])]).advice.action, 'hold', 'reps 6 is below target high 8');
assert.strictEqual(buildAdvice([session('2026-11-17', [work(70, 8, 1)])]).advice.action, 'hold', 'RIR 1 is not 2 or more');
const unknownRir = buildAdvice([session('2026-11-17', [work(70, 8, null)])]);
assert.strictEqual(unknownRir.advice.action, 'hold', 'unknown RIR holds');
assert.match(unknownRir.advice.reason, /RIR/);
console.log('✓ 70×6 (target 8), 70×8 at RIR 1, and unknown RIR all hold.');

// 6. Warm-ups do not affect the advice
console.log('▶ [6] Warm-ups do not change the advice...');
const clean = buildAdvice([session('2026-11-17', [work(70, 8, 2)])]);
const withWarm = buildAdvice([session('2026-11-17', [warm(90, 25), warm(35, 15), work(70, 8, 2)])]);
assert.deepStrictEqual(withWarm.advice, clean.advice, 'heavier, higher-rep warm-ups must not change advice');
assert.deepStrictEqual(withWarm.sessions[0].sets, clean.sessions[0].sets, 'warm-ups are not listed in sessions');
console.log('✓ Heavier warm-up (90×25) leaves the advice unchanged and is not listed.');

// 7. Skipped sets do not affect the advice
console.log('▶ [7] Skipped sets are ignored...');
const skipped = buildAdvice([session('2026-11-17', [work(70, 8, 2), work(100, 8, 2, { done: false })])]);
assert.deepStrictEqual(skipped.advice, clean.advice);
console.log('✓ Skipped 100 kg set ignored.');

// 8. No parseable target -> no advice
console.log('▶ [8] No target -> no advice...');
const noTarget = buildAdvice([session('2026-11-17', [work(70, 8, 2, { target: 'ตามความรู้สึก' })])]);
assert.strictEqual(noTarget.advice, null);
assert.strictEqual(noTarget.reason, 'no-target');
console.log('✓ Free-text target gives no advice, reason no-target.');

// 9. lastN window and session filtering
console.log('▶ [9] lastN window...');
const many = [
  session('2026-11-24', [work(72, 8, 2)]),
  session('2026-11-20', [warm(30, 15)]),          // warm-up only: not counted as a session
  session('2026-11-17', [work(70, 8, 2)]),
  session('2026-11-10', [work(68, 8, 2)]),
  session('2026-11-03', [work(66, 8, 2)])
];
const window2 = buildAdvice(many, { lastN: 2 });
assert.deepStrictEqual(window2.sessions.map((s) => s.date), ['2026-11-24', '2026-11-17']);
assert.strictEqual(buildAdvice(many).sessions.length, DEFAULT_LAST_N, 'default window is DEFAULT_LAST_N sessions');
console.log('✓ lastN limits the returned sessions; warm-up-only sessions are skipped.');

// 10. Route contract on a temp database
console.log('▶ [10] GET /api/exercises/:id/advice contract...');
if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-advice-')), 'gym-test.db');
}
const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

const ex = 'test_advice_bench';
repo.saveSession({ id: 'test_advice_1', date: '2026-11-10', time: '18:00', dayKey: 'mon', dayTitle: 't', totalSetsDone: 2, exercises: [{
  id: ex, name: 'Bench', category: 'ท่าหลัก', sets: [
    { setIndex: 1, type: 'วอร์ม', target: '15 ครั้ง', weight: 35, actualReps: 15, done: true, rir: null },
    { setIndex: 2, type: 'เล่นจริง', target: '6–8 ครั้ง', weight: 70, actualReps: 8, done: true, rir: 2 }
  ] }] });
repo.saveSession({ id: 'test_advice_2', date: '2026-11-17', time: '18:00', dayKey: 'mon', dayTitle: 't', totalSetsDone: 2, exercises: [{
  id: ex, name: 'Bench', category: 'ท่าหลัก', sets: [
    { setIndex: 1, type: 'วอร์ม', target: '15 ครั้ง', weight: 40, actualReps: 20, done: true, rir: null },
    { setIndex: 2, type: 'เล่นจริง', target: '6–8 ครั้ง', weight: 70, actualReps: 8, done: true, rir: 0 }
  ] }] });

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
try {
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/exercises/${ex}/advice`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.exerciseId, ex);
  assert.deepStrictEqual(Object.keys(body).sort(), ['advice', 'exerciseId', 'reason', 'sessions']);
  assert.strictEqual(body.sessions.length, 2);
  assert.strictEqual(body.sessions[0].date, '2026-11-17');
  assert.deepStrictEqual(body.sessions[0].sets, [{ weight: 70, reps: 8, rir: 0 }], 'warm-up 40×20 excluded');
  assert.strictEqual(body.advice.action, 'hold', 'RIR 0 on latest session holds');
  assert.strictEqual(body.advice.nextWeight, 70);
  assert.strictEqual(body.reason, null);

  const limited = await (await fetch(`http://127.0.0.1:${port}/api/exercises/${ex}/advice?n=1`)).json();
  assert.strictEqual(limited.sessions.length, 1);

  const unknown = await (await fetch(`http://127.0.0.1:${port}/api/exercises/no_such_exercise/advice`)).json();
  assert.strictEqual(unknown.advice, null);
  assert.strictEqual(unknown.reason, 'no-history');
  console.log('✓ Route returns exerciseId, sessions (working sets only), advice, reason; n limits sessions; unknown exercise = no-history.');
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log('\n====================================================');
console.log('🎉 EXERCISE ADVICE TESTS PASSED!');
console.log('====================================================');
