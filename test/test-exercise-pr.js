import assert from 'node:assert';
import stats from '../server/exercise-stats.js';
import { calculateEstimated1RM } from '../src/composables/useRpeAdvisor.js';

/**
 * PR (personal record) per exercise. Pure function tests + the route contract on GET /api/exercises/:id/history.
 */

const { computePr, withPr } = stats;

console.log('====================================================');
console.log('🧪 Test: Exercise PR (best weight, best reps, e1RM)');
console.log('====================================================\n');

// 1. Empty history
console.log('▶ [1] Empty history...');
assert.deepStrictEqual(computePr([]), { bestWeight: null, bestReps: null, estimated1RM: null });
assert.deepStrictEqual(computePr(undefined), { bestWeight: null, bestReps: null, estimated1RM: null });
assert.deepStrictEqual(withPr([]), []);
console.log('✓ Empty history → nulls, array stays empty.');

// 2. Only completed sets count
console.log('▶ [2] Only completed sets count...');
const history = [
  {
    date: '2026-11-10',
    sets: [
      { weight: 60, actualReps: 10, rir: 2, done: true },
      { weight: 200, actualReps: 1, rir: 0, done: false }, // not completed → ignored
    ],
  },
  {
    date: '2026-11-17',
    sets: [
      { weight: 70, actualReps: 6, rir: 1, done: true },
      { weight: 65, actualReps: 12, rir: null, done: true },
    ],
  },
];
const pr = computePr(history);
assert.strictEqual(pr.bestWeight, 70);
assert.strictEqual(pr.bestReps, 12);
console.log('✓ Ignored non-completed 200 kg set; best weight 70, best reps 12.');

// 3. e1RM uses the frontend formula and the max across sets
console.log('▶ [3] e1RM matches calculateEstimated1RM and takes the max...');
const expected = Math.max(
  calculateEstimated1RM(60, 10, 2),
  calculateEstimated1RM(70, 6, 1),
  calculateEstimated1RM(65, 12, null),
);
assert.strictEqual(pr.estimated1RM, expected);
assert.strictEqual(calculateEstimated1RM(80, 8, 2), 106.7); // spec example
console.log(`✓ estimated1RM = ${pr.estimated1RM} kg (matches frontend formula).`);

// 4. Sets without weight or reps do not break the PR
console.log('▶ [4] Bodyweight / missing values...');
const bw = computePr([{ sets: [{ weight: null, actualReps: 15, rir: null, done: true }, { weight: 0, actualReps: 8, done: true }] }]);
assert.deepStrictEqual(bw, { bestWeight: null, bestReps: 15, estimated1RM: null });
console.log('✓ Reps-only sets give bestReps; e1RM stays null without weight.');

// 5. withPr keeps the array shape and attaches the same PR to each item
console.log('▶ [5] withPr keeps array shape...');
const wrapped = withPr(history);
assert.ok(Array.isArray(wrapped));
assert.strictEqual(wrapped.length, 2);
assert.deepStrictEqual(wrapped[0].pr, pr);
assert.deepStrictEqual(wrapped[1].pr, pr);
assert.strictEqual(wrapped[0].date, '2026-11-10');
console.log('✓ Array preserved; each item carries pr.');

// 6. Route contract (real DB, read-only GET)
console.log('▶ [6] GET /api/exercises/:id/history contract...');
const { default: app } = await import('../server/server.js');
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
try {
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/api/exercises/shoulder_press/history`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body), 'history must stay an array');
  for (const item of body) {
    assert.deepStrictEqual(Object.keys(item.pr).sort(), ['bestReps', 'bestWeight', 'estimated1RM']);
  }
  console.log(`✓ Route returned ${body.length} sessions, each with pr.`);
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log('\n====================================================');
console.log('🎉 EXERCISE PR TESTS PASSED!');
console.log('====================================================');
