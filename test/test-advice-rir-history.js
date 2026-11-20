import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  calculateWeightAdvice,
  getExerciseOverallAdvice,
  historyWeightAdvice,
  shouldFillWeight
} from '../src/composables/useWeightAdvisor.js';
import { normalizeExerciseHistory } from '../src/composables/useExerciseHistory.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: RIR-aware advice and history-based advice (approved rule)');
console.log('====================================================\n');

// Count console.error calls: criterion 3 says no console error when there is no history.
const realError = console.error;
let consoleErrors = 0;
console.error = (...args) => { consoleErrors += 1; realError(...args); };

console.log('▶ [1] RIR 0 (ล้ม) at a weight: never add weight to that weight...');
const failedOver = calculateWeightAdvice({ weight: 60, reps: 10, type: 'work', rir: 0 });
assert.strictEqual(failedOver.delta, 0, 'RIR 0 above target must hold');
assert.strictEqual(failedOver.suggestedWeight, 60);
assert.strictEqual(failedOver.status, 'optimal');
const failedUnder = calculateWeightAdvice({ weight: 60, reps: 5, type: 'work', rir: 0 });
assert.strictEqual(failedUnder.status, 'decrease', 'RIR 0 with too few reps still decreases');
assert.strictEqual(failedUnder.suggestedWeight, 58);
const overallFailed = getExerciseOverallAdvice([{ type: 'เล่นจริง', weight: 60, reps: 10, rir: 0 }]);
assert.strictEqual(overallFailed.workAdvice.delta, 0, 'overall: failed set at the base weight holds it');
assert.strictEqual(overallFailed.workAdvice.suggestedWeight, 60);
const overallFailedDown = getExerciseOverallAdvice([{ type: 'เล่นจริง', weight: 70, reps: 5, rir: 0 }]);
assert.strictEqual(overallFailedDown.workAdvice.suggestedWeight, 68);
console.log('  ✓ hold at 60 kg, decrease still allowed\n');

console.log('▶ [2] RIR 2+ (or 1) with reps above 8: +2 kg as before...');
const plusTwo = calculateWeightAdvice({ weight: 60, reps: 10, type: 'work', rir: 2 });
assert.strictEqual(plusTwo.status, 'increase');
assert.strictEqual(plusTwo.suggestedWeight, 62);
const plusOne = calculateWeightAdvice({ weight: 60, reps: 9, type: 'work', rir: 1 });
assert.strictEqual(plusOne.suggestedWeight, 62);
const noRir = calculateWeightAdvice({ weight: 60, reps: 10, type: 'work' });
assert.strictEqual(noRir.suggestedWeight, 60, 'missing RIR holds the weight');
assert.strictEqual(noRir.delta, 0);
const overallPlus = getExerciseOverallAdvice([{ type: 'เล่นจริง', weight: 60, reps: 9, rir: 2 }]);
assert.strictEqual(overallPlus.workAdvice.suggestedWeight, 62);
console.log('  ✓ 62 kg with RIR 2 and 1; missing RIR holds at 60 kg\n');

console.log('▶ [3] No history: null, old behavior, no console error...');
assert.strictEqual(historyWeightAdvice([]), null);
assert.strictEqual(historyWeightAdvice(undefined), null);
assert.strictEqual(historyWeightAdvice(normalizeExerciseHistory([]).sessions), null);
const onlyUnfinished = normalizeExerciseHistory([
  { sessionId: 'a', date: '2026-11-12', sets: [{ setIndex: 1, type: 'เล่นจริง', weight: 60, actualReps: 10, done: false, rir: 2 }] }
]);
assert.strictEqual(historyWeightAdvice(onlyUnfinished.sessions), null, 'unfinished sets are not history');
assert.strictEqual(consoleErrors, 0, 'no console errors on empty history');
console.log('  ✓ null for empty / unfinished history, no console error\n');

// A payload shaped like GET /api/exercises/:id/history (newest session first).
const apiPayload = [
  {
    sessionId: 's3', date: '2026-11-19', time: '18:00', dayTitle: 'A', pr: { bestWeight: 70, bestReps: 10, estimated1RM: 93.3 },
    sets: [
      { setIndex: 1, type: 'เล่นจริง', weight: 70, actualReps: 10, done: true, rir: 0, rirPlus: false },
      { setIndex: 2, type: 'เล่นจริง', weight: 70, actualReps: 9, done: false, rir: null, rirPlus: false }
    ]
  },
  {
    sessionId: 's2', date: '2026-11-12', time: '18:00', dayTitle: 'A', pr: { bestWeight: 70, bestReps: 10, estimated1RM: 93.3 },
    sets: [
      { setIndex: 1, type: 'วอร์ม', weight: 35, actualReps: 15, done: true, rir: null, rirPlus: false },
      { setIndex: 2, type: 'เล่นจริง', weight: 60, actualReps: 10, done: true, rir: 2, rirPlus: true },
      { setIndex: 3, type: 'เล่นจริง', weight: 60, actualReps: 9, done: true, rir: 1, rirPlus: false },
      { setIndex: 4, type: 'เล่นจริง', weight: 60, actualReps: 8, done: false, rir: null, rirPlus: false }
    ]
  }
];

console.log('▶ [4] Next weight from the API history matches the hand-computed value...');
// Newest session with a finished set is s3 (70 kg × 10, RIR 0): the failed set at 70 holds the weight.
const fromApi = historyWeightAdvice(normalizeExerciseHistory(apiPayload).sessions);
assert.ok(fromApi, 'history advice must exist');
assert.strictEqual(fromApi.source, 'history');
assert.strictEqual(fromApi.sessionDate, '2026-11-19');
assert.strictEqual(fromApi.workAdvice.suggestedWeight, 70, 'RIR 0 at 70 kg holds 70 kg');
assert.strictEqual(fromApi.workAdvice.delta, 0);

// Without the newest session, the older one (60 kg, RIR 2 and 1, reps 10 and 9) gives +2 kg = 62.
const olderOnly = historyWeightAdvice(normalizeExerciseHistory([apiPayload[1]]).sessions);
assert.strictEqual(olderOnly.workAdvice.suggestedWeight, 62);
assert.strictEqual(olderOnly.sessionDate, '2026-11-12');
assert.strictEqual(olderOnly.workAdvice.delta, 2);

// The same values through the normalizer keep rir and reps.
const normalized = normalizeExerciseHistory(apiPayload);
assert.strictEqual(normalized.sessions[1].sets[1].rir, 2);
assert.strictEqual(normalized.sessions[1].sets[1].rirPlus, true);
assert.strictEqual(normalized.sessions[0].sets[0].actualReps, 10);
console.log('  ✓ newest session decides: 70 kg held; older session gives 62 kg\n');

console.log('▶ [5] Advice never fills a weight the user already typed...');
assert.strictEqual(shouldFillWeight(''), true);
assert.strictEqual(shouldFillWeight(undefined), true);
assert.strictEqual(shouldFillWeight(null), true);
assert.strictEqual(shouldFillWeight('60'), false);
assert.strictEqual(shouldFillWeight(0), false, 'a typed 0 is a value');
assert.strictEqual(shouldFillWeight('0'), false);
const cardSources = ['ExerciseCard.vue', 'BonusCard.vue'].map((f) => ({
  name: f,
  src: fs.readFileSync(path.join(root, 'src/components', f), 'utf8')
}));
for (const { name, src } of cardSources) {
  assert.ok(/applySetAdvice[\s\S]*?shouldFillWeight\(getWeight\(sIdx\)\)/.test(src), `${name}: applySetAdvice must check shouldFillWeight`);
  assert.ok(/applyRecommendedWeightAll[\s\S]*?shouldFillWeight\(getWeight\(sIdx\)\)/.test(src), `${name}: applyRecommendedWeightAll must check shouldFillWeight`);
  assert.ok(/applyRecommendedWarmupWeight[\s\S]*?shouldFillWeight\(getWeight\(sIdx\)\)/.test(src), `${name}: applyRecommendedWarmupWeight must check shouldFillWeight`);
  assert.ok(/rir: getRir\(sIdx\)/.test(src), `${name}: advice must receive the set's RIR`);
}
console.log('  ✓ empty-only fill in all three apply paths, RIR passed in both cards\n');

console.log('▶ [6] Advice text is short enough to fit a 360 px screen (no nowrap on the advice line)...');
const longest = [
  calculateWeightAdvice({ weight: 60, reps: 10, type: 'work', rir: 0 }).reasonText,
  getExerciseOverallAdvice([{ type: 'เล่นจริง', weight: 60, reps: 10, rir: 0 }]).workAdvice.reason
];
for (const text of longest) {
  assert.ok(text.length <= 60, `advice text should stay short, got ${text.length}: ${text}`);
}
console.log('  ✓ advice texts are under 60 characters\n');

console.log('▶ [7] Strict rule: +2 only when every set is at the top with RIR 1/2+; per-set and next-session agree...');
// a) every set at the top with RIR 2+ -> +2, for one set and for two sets
assert.strictEqual(calculateWeightAdvice({ weight: 60, reps: 8, type: 'work', rir: 2 }).suggestedWeight, 62);
assert.strictEqual(getExerciseOverallAdvice([
  { type: 'เล่นจริง', weight: 60, reps: 8, rir: 2 },
  { type: 'เล่นจริง', weight: 60, reps: 9, rir: 2 }
]).workAdvice.suggestedWeight, 62);
// b) one set below the top holds the weight
const oneBelow = getExerciseOverallAdvice([
  { type: 'เล่นจริง', weight: 60, reps: 8, rir: 2 },
  { type: 'เล่นจริง', weight: 60, reps: 7, rir: 2 }
]);
assert.strictEqual(oneBelow.workAdvice.delta, 0);
assert.strictEqual(oneBelow.workAdvice.suggestedWeight, 60);
assert.strictEqual(calculateWeightAdvice({ weight: 60, reps: 7, type: 'work', rir: 2 }).delta, 0);
// c) RIR 0 holds, per set and overall
const oneFailed = getExerciseOverallAdvice([
  { type: 'เล่นจริง', weight: 60, reps: 8, rir: 0 },
  { type: 'เล่นจริง', weight: 60, reps: 8, rir: 2 }
]);
assert.strictEqual(oneFailed.workAdvice.delta, 0);
assert.strictEqual(oneFailed.workAdvice.suggestedWeight, 60);
assert.strictEqual(calculateWeightAdvice({ weight: 60, reps: 8, type: 'work', rir: 0 }).delta, 0);
// d) missing RIR holds at the top, per set and overall
assert.strictEqual(getExerciseOverallAdvice([{ type: 'เล่นจริง', weight: 60, reps: 8 }]).workAdvice.delta, 0);
assert.strictEqual(calculateWeightAdvice({ weight: 60, reps: 8, type: 'work' }).delta, 0);
// e) a skipped set (done:false, or skipped:true) does not count: not a hold, not a decrease
const withSkipped = getExerciseOverallAdvice([
  { type: 'เล่นจริง', weight: 60, reps: 8, rir: 2 },
  { type: 'เล่นจริง', weight: 60, reps: 5, rir: 0, done: false },
  { type: 'เล่นจริง', weight: 60, reps: 5, rir: 0, skipped: true }
]);
assert.strictEqual(withSkipped.workAdvice.status, 'increase');
assert.strictEqual(withSkipped.workAdvice.suggestedWeight, 62);
// f) the decrease rule is unchanged (majority below the minimum)
assert.strictEqual(getExerciseOverallAdvice([{ type: 'เล่นจริง', weight: 60, reps: 5, rir: 2 }]).workAdvice.suggestedWeight, 58);
console.log('  ✓ +2 only when all sets reach 8 with RIR 1/2+; holds otherwise; skipped sets ignored\n');

console.error = realError;
console.log('✅ RIR-aware and history advice checks passed');
