import assert from 'node:assert';
import {
  normalizeWeeklyVolume,
  rankKeys,
  buildSeries,
  hasAnyVolume,
  useWeeklyVolume,
  VOLUME_ERROR_MESSAGE
} from '../src/composables/useWeeklyVolume.js';

console.log('====================================================');
console.log('🧪 QA Test: Weekly volume chart data (item 1)');
console.log('====================================================\n');

const starts = ['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23'];
const apiPayload = {
  weeks: starts.map((weekStart, i) => ({
    weekStart,
    muscles: i === 6 ? [{ muscle: 'chest', volume: 1200, sets: 6 }, { muscle: 'back', volume: 800, sets: 4 }] : [],
    exercises: i === 6 ? [{ exerciseId: 'a1', exerciseName: 'Flat DB Bench', volume: 1200, sets: 6 }] : []
  }))
};

console.log('▶ [1] Normalizes the API payload...');
const weeks = normalizeWeeklyVolume(apiPayload);
assert.strictEqual(weeks.length, 8, 'must keep all 8 weeks');
assert.strictEqual(weeks[6].muscles[0].key, 'chest');
assert.strictEqual(weeks[6].muscles[0].volume, 1200);
assert.strictEqual(weeks[6].exercises[0].label, 'Flat DB Bench');
assert.throws(() => normalizeWeeklyVolume({}), 'payload without weeks must throw');
assert.throws(() => normalizeWeeklyVolume(null), 'null payload must throw');
const junk = normalizeWeeklyVolume({ weeks: [{ weekStart: '2026-11-23', muscles: [{ muscle: 'x', volume: 'NaN' }], exercises: null }] });
assert.strictEqual(junk[0].muscles[0].volume, 0, 'non-numeric volume becomes 0');
assert.deepStrictEqual(junk[0].exercises, [], 'missing exercises list becomes []');
console.log('✓ Normalization verified.');

console.log('▶ [2] Ranks muscles by total volume...');
const ranked = rankKeys(weeks, 'muscles');
assert.deepStrictEqual(ranked.map((r) => r.key), ['chest', 'back']);
assert.strictEqual(ranked[0].total, 1200);
console.log('✓ Ranking verified.');

console.log('▶ [3] One bar per week, zeros where a week has no data...');
const chest = buildSeries(weeks, 'muscles', 'chest');
assert.strictEqual(chest.length, 8, 'a chart needs 8 bars per muscle');
assert.strictEqual(chest[6].volume, 1200);
assert.strictEqual(chest[0].volume, 0, 'empty week is a zero bar, not missing');
assert.strictEqual(chest[7].weekStart, '2026-11-23', 'bars keep week order, oldest first');
const unknown = buildSeries(weeks, 'muscles', 'nope');
assert.strictEqual(unknown.length, 8);
assert.ok(unknown.every((b) => b.volume === 0));
console.log('✓ 8-bar series verified.');

console.log('▶ [4] Empty state when there is no volume at all...');
const emptyWeeks = normalizeWeeklyVolume({ weeks: starts.map((weekStart) => ({ weekStart, muscles: [], exercises: [] })) });
assert.strictEqual(hasAnyVolume(emptyWeeks), false, 'no data must trigger the empty state');
assert.strictEqual(hasAnyVolume(weeks), true);
assert.strictEqual(rankKeys(emptyWeeks, 'exercises').length, 0);
console.log('✓ Empty-state detection verified.');

console.log('▶ [5] Fetch success and failure...');
const okFetch = async (url) => {
  assert.strictEqual(url, '/api/volume/weekly');
  return { ok: true, status: 200, json: async () => apiPayload };
};
const ok = useWeeklyVolume(okFetch);
await ok.load();
assert.strictEqual(ok.error.value, '');
assert.strictEqual(ok.weeks.value.length, 8);
assert.strictEqual(ok.loading.value, false);

const failCases = [
  async () => { throw new Error('offline'); },
  async () => ({ ok: false, status: 500, json: async () => ({}) }),
  async () => ({ ok: true, status: 200, json: async () => ({ nope: true }) })
];
for (const fakeFetch of failCases) {
  const state = useWeeklyVolume(fakeFetch);
  state.weeks.value = weeks;
  await state.load();
  assert.strictEqual(state.error.value, VOLUME_ERROR_MESSAGE);
  assert.strictEqual(state.weeks.value.length, 0, 'stale data must be cleared on error');
}
console.log('✓ Failure paths show the Thai error message.');

console.log('\n====================================================');
console.log('🎉 ALL VOLUME CHART TESTS PASSED!');
console.log('====================================================');
