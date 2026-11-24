import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  useWorkoutComparison,
  formatDelta,
  getVerdictMeta,
  getSetStatusMeta,
  normalizeComparison,
  VERDICT_META,
  SET_STATUS_META,
  COMP_ERROR_MESSAGE,
  COMP_TIMEOUT_MESSAGE
} from '../src/composables/useWorkoutComparison.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Workout Comparison Frontend & UI Contract');
console.log('====================================================\n');

// 1. Composable Pure Helpers
console.log('▶ [1] formatDelta formatting...');
assert.strictEqual(formatDelta(150, 'kg'), '+150 kg');
assert.strictEqual(formatDelta(-2.5, 'kg'), '-2.5 kg');
assert.strictEqual(formatDelta(0, 'เซ็ต'), '0 เซ็ต');
assert.strictEqual(formatDelta(8.8, '%', true), '+8.8%');
assert.strictEqual(formatDelta(-10.3, '%', true), '-10.3%');
assert.strictEqual(formatDelta(null), '—');
assert.strictEqual(formatDelta(undefined), '—');
console.log('  ✓ formatDelta handles positive, negative, zero, percentage and null safely.');

// 2. Metadata Helpers
console.log('▶ [2] Verdict & Set Status Metadata...');
assert.strictEqual(getVerdictMeta('overload').id, 'overload');
assert.strictEqual(getVerdictMeta('overload').icon, '🚀');
assert.strictEqual(getVerdictMeta('maintained').id, 'maintained');
assert.strictEqual(getVerdictMeta('regressed').id, 'regressed');
assert.strictEqual(getVerdictMeta('unknown').id, 'maintained', 'fallback to maintained');

assert.strictEqual(getSetStatusMeta('progressed').icon, '🟢');
assert.strictEqual(getSetStatusMeta('maintained').icon, '⚪');
assert.strictEqual(getSetStatusMeta('regressed').icon, '🔴');
console.log('  ✓ Verdict and Set status metadata mapped properly.');

// 3. Normalizer resilience
console.log('▶ [3] normalizeComparison resilience...');
const emptyNorm = normalizeComparison(null);
assert.strictEqual(emptyNorm.success, false);
assert.strictEqual(emptyNorm.hasComparison, false);
assert.deepStrictEqual(emptyNorm.exercises, []);
assert.deepStrictEqual(emptyNorm.newExercises, []);
assert.deepStrictEqual(emptyNorm.droppedExercises, []);

const validNorm = normalizeComparison({
  success: true,
  hasComparison: true,
  baseSession: { id: 's1' },
  targetSession: { id: 's0' },
  summary: { verdict: 'overload', verdictScore: 85 },
  exercises: [{ exerciseId: 'e1' }]
});
assert.strictEqual(validNorm.success, true);
assert.strictEqual(validNorm.hasComparison, true);
assert.strictEqual(validNorm.summary.verdict, 'overload');
assert.strictEqual(validNorm.exercises.length, 1);
console.log('  ✓ Normalizer guards against null/empty objects.');

// 4. Fetch layer & timeout handling in composable
console.log('▶ [4] useWorkoutComparison fetch & error handling...');
{
  let calledUrl = '';
  const mockFetch = async (url) => {
    calledUrl = url;
    return {
      ok: true,
      json: async () => ({
        success: true,
        hasComparison: true,
        baseSession: { id: 'b1', dayTitle: 'Day 1' },
        targetSession: { id: 't1', dayTitle: 'Day 1' },
        summary: {
          verdict: 'overload',
          verdictLabelTh: 'ก้าวหน้าขึ้น',
          verdictScore: 90,
          summaryTextTh: 'ก้าวหน้าขึ้น',
          macroDelta: { totalVolumeKg: { base: 1000, target: 800, diff: 200, pct: 25 } }
        },
        exercises: []
      })
    };
  };

  const comp = useWorkoutComparison({ fetch: mockFetch, useLocalState: true });
  await comp.fetchLatestPair('session-123');
  assert.ok(calledUrl.includes('/api/workout-comparison/latest-pair?sessionId=session-123'));
  assert.strictEqual(comp.hasComparison.value, true);
  assert.strictEqual(comp.verdict.value, 'overload');
  assert.strictEqual(comp.baseSession.value.id, 'b1');

  await comp.fetchComparison('b1', 't1');
  assert.ok(calledUrl.includes('/api/workout-comparison?baseId=b1&targetId=t1'));

  // Test error
  const failFetch = async () => ({ ok: false, status: 500 });
  const compFail = useWorkoutComparison({ fetch: failFetch, useLocalState: true });
  try {
    await compFail.fetchLatestPair('fail-id');
  } catch (e) {}
  assert.strictEqual(compFail.error.value, COMP_ERROR_MESSAGE);
  assert.strictEqual(compFail.data.value, null);

  // Test timeout
  const timeoutFetch = () => new Promise((resolve) => setTimeout(resolve, 50));
  const compTimeout = useWorkoutComparison({ fetch: timeoutFetch, timeoutMs: 10, useLocalState: true });
  try {
    await compTimeout.fetchLatestPair('slow-id');
  } catch (e) {}
  assert.strictEqual(compTimeout.error.value, COMP_TIMEOUT_MESSAGE);
}
console.log('  ✓ Composable fetch, query params, error and timeout verified.');

// 5. WorkoutComparisonModal.vue accessibility and Neobrutalism inspection
console.log('▶ [5] WorkoutComparisonModal.vue Accessibility & Styling Tokens...');
const modalSrc = read('src/components/WorkoutComparisonModal.vue');

assert.ok(!modalSrc.includes('focus:outline-none'), 'No focus:outline-none allowed');
assert.ok(modalSrc.includes('focus-visible:ring-2 focus-visible:ring-plate'), 'Has accessible focus-visible ring');
assert.ok(!modalSrc.includes('text-ink-muted/80'), 'No forbidden text-ink-muted/80 token');
assert.ok(!/text-\[(8|9|10)px\]/.test(modalSrc), 'No typography smaller than 11px');

// Check min-h 44px on buttons
const buttons = modalSrc.match(/<button\b[\s\S]*?>/g) || [];
assert.ok(buttons.length >= 5, `Expected multiple interactive buttons, found ${buttons.length}`);
for (const btn of buttons) {
  assert.ok(btn.includes('min-h-[44px]'), `Button under 44px min-h: ${btn.slice(0, 100)}`);
  assert.ok(btn.includes('touch-manipulation'), `Button missing touch-manipulation: ${btn.slice(0, 100)}`);
}
console.log(`  ✓ All ${buttons.length} buttons meet 44px touch target and focus visibility standards.`);

// 6. HistoryView.vue integration
console.log('▶ [6] HistoryView.vue Comparison Button & Modal Integration...');
const historySrc = read('src/components/HistoryView.vue');
assert.ok(historySrc.includes('WorkoutComparisonModal'), 'HistoryView imports and renders WorkoutComparisonModal');
assert.ok(historySrc.includes('openComparison(session.id)'), 'HistoryView calls openComparison with session.id');
assert.ok(historySrc.includes('เทียบกับรอบก่อน'), 'HistoryView button displays Thai label เทียบกับรอบก่อน');
assert.ok(historySrc.includes('min-h-[44px]'), 'Compare button in HistoryView is 44px tall');
console.log('  ✓ HistoryView wiring and 44px button verified.');

// 7. WorkoutSummaryModal.vue integration
console.log('▶ [7] WorkoutSummaryModal.vue Comparison Trigger Button...');
const summarySrc = read('src/components/WorkoutSummaryModal.vue');
assert.ok(summarySrc.includes("emit('compare', summary)"), 'Summary modal emits compare event');
assert.ok(summarySrc.includes('ดูผลเทียบกับรอบก่อนหน้า'), 'Summary modal button has Thai label');
assert.ok(summarySrc.includes('min-h-[44px]'), 'Compare button in summary modal is 44px tall');
assert.ok(!summarySrc.includes('/api/'), 'Summary modal remains free of /api/ network calls');
assert.ok(!summarySrc.includes('saveSession'), 'Summary modal does not save session');
console.log('  ✓ WorkoutSummaryModal compare trigger button verified.');

// 8. App.vue integration
console.log('▶ [8] App.vue Comparison Handling & Modal Mount...');
const appSrc = read('src/App.vue');
assert.ok(appSrc.includes('WorkoutComparisonModal'), 'App.vue imports and renders WorkoutComparisonModal');
assert.ok(appSrc.includes('@compare="onSummaryCompare"'), 'App.vue listens to compare event from summary modal');
assert.ok(appSrc.includes('onSummaryCompare(summary)'), 'App.vue handles summary compare and opens latest pair');
console.log('  ✓ App.vue wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL WORKOUT COMPARISON UI TESTS PASSED!');
console.log('====================================================');
