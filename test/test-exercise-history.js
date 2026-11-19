import assert from 'node:assert';
import {
  normalizeExerciseHistory,
  normalizePr,
  hasPr,
  formatPr,
  setText,
  useExerciseHistory,
  HISTORY_ERROR_MESSAGE
} from '../src/composables/useExerciseHistory.js';

console.log('====================================================');
console.log('🧪 QA Test: Exercise history modal data & PR (item 2)');
console.log('====================================================\n');

const apiPayload = [
  {
    sessionId: 's2', date: '2026-11-16', time: '18:05', dayTitle: 'Program A',
    pr: { bestWeight: 40, bestReps: 10, estimated1RM: 53.3 },
    sets: [
      { setIndex: 1, type: 'warmup', weight: 20, actualReps: 15, done: true, rir: null },
      { setIndex: 2, type: 'working', weight: 40, actualReps: 9, done: true, rir: 2 },
      { setIndex: 3, type: 'working', weight: 40, actualReps: null, done: false, rir: null }
    ]
  },
  {
    sessionId: 's1', date: '2026-11-09', time: '18:00', dayTitle: 'Program B',
    pr: { bestWeight: 40, bestReps: 10, estimated1RM: 53.3 },
    sets: [{ setIndex: 1, type: 'working', weight: 36, actualReps: 10, done: true, rir: null }]
  }
];

console.log('▶ [1] Normalizes sessions and reads PR from the first row...');
const { sessions, pr } = normalizeExerciseHistory(apiPayload);
assert.strictEqual(sessions.length, 2);
assert.strictEqual(sessions[0].dayTitle, 'Program A');
assert.strictEqual(sessions[0].sets[1].weight, 40);
assert.strictEqual(sessions[0].sets[1].rir, 2);
assert.strictEqual(sessions[0].sets[2].done, false, 'skipped set stays not done');
assert.deepStrictEqual(pr, { bestWeight: 40, bestReps: 10, estimated1RM: 53.3 });
assert.throws(() => normalizeExerciseHistory({ sessions: [] }), 'non-array payload must throw');
console.log('✓ Normalization verified.');

console.log('▶ [2] PR card: three rows, dashes when there is no value...');
const rows = formatPr(pr);
assert.strictEqual(rows.length, 3);
assert.deepStrictEqual(rows.map((r) => r.value), ['40 kg', '10 ครั้ง', '53.3 kg']);
const emptyRows = formatPr(normalizePr(null));
assert.deepStrictEqual(emptyRows.map((r) => r.value), ['—', '—', '—']);
assert.strictEqual(hasPr(normalizePr(null)), false, 'no PR yet must show the empty hint');
assert.strictEqual(hasPr(pr), true);
assert.strictEqual(normalizePr({ bestWeight: 0, bestReps: 'x', estimated1RM: -1 }).bestWeight, null, 'zero weight is not a PR');
console.log('✓ PR formatting verified.');

console.log('▶ [3] History row text per set...');
assert.strictEqual(setText(sessions[0].sets[1]), '40 kg × 9 · RIR 2');
assert.strictEqual(setText(sessions[0].sets[0]), '20 kg × 15');
assert.strictEqual(setText(sessions[0].sets[2]), '40 kg × — · ยังไม่ได้ติ๊ก', 'a typed but unticked set says so (never ข้าม)');
assert.strictEqual(setText({ done: false, weight: null, actualReps: null }), '', 'an empty unticked set shows no text');
console.log('✓ Set labels verified.');

console.log('▶ [4] Fetch uses the exercise id and shows errors...');
let requested = '';
const okFetch = async (url) => {
  requested = url;
  return { ok: true, status: 200, json: async () => apiPayload };
};
const ok = useExerciseHistory(okFetch);
await ok.load('a1/x');
assert.strictEqual(requested, '/api/exercises/a1%2Fx/history', 'exercise id must be URL-encoded');
assert.strictEqual(ok.sessions.value.length, 2);
assert.strictEqual(ok.pr.value.bestWeight, 40);
assert.strictEqual(ok.error.value, '');

const failCases = [
  async () => { throw new Error('offline'); },
  async () => ({ ok: false, status: 500, json: async () => ({}) }),
  async () => ({ ok: true, status: 200, json: async () => ({ nope: true }) })
];
for (const fakeFetch of failCases) {
  const state = useExerciseHistory(fakeFetch);
  state.sessions.value = sessions;
  await state.load('a1');
  assert.strictEqual(state.error.value, HISTORY_ERROR_MESSAGE);
  assert.strictEqual(state.sessions.value.length, 0, 'stale rows must be cleared on error');
  assert.strictEqual(state.pr.value.bestWeight, null);
}
console.log('✓ Fetch success and failure paths verified.');

console.log('\n====================================================');
console.log('🎉 ALL EXERCISE HISTORY TESTS PASSED!');
console.log('====================================================');
