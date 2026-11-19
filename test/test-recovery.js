import assert from 'node:assert';
import {
  statusFromPct,
  normalizeRecovery,
  useRecovery,
  getRecoveryMeta,
  RECOVERY_ERROR_MESSAGE
} from '../src/composables/useRecovery.js';

console.log('====================================================');
console.log('🧪 QA Test: Muscle Fatigue & Recovery Indicator (SPEC 2.3)');
console.log('====================================================\n');

// 1. Threshold mapping (SPEC 2.3): 0–49 fatigued, 50–84 recovering, 85–100 ready
console.log('▶ [1] Testing recovery % → status thresholds...');
assert.strictEqual(statusFromPct(0), 'fatigued');
assert.strictEqual(statusFromPct(49), 'fatigued');
assert.strictEqual(statusFromPct(50), 'recovering');
assert.strictEqual(statusFromPct(84), 'recovering');
assert.strictEqual(statusFromPct(85), 'ready');
assert.strictEqual(statusFromPct(100), 'ready');
assert.strictEqual(getRecoveryMeta('fatigued').label, 'เมื่อยล้า');
assert.strictEqual(getRecoveryMeta('recovering').label, 'กำลังฟื้นตัว');
assert.strictEqual(getRecoveryMeta('ready').label, 'พร้อมซ้อม');
console.log('✓ Thresholds and status labels verified.');

// 2. Payload normalization
console.log('▶ [2] Testing payload normalization...');
const normalized = normalizeRecovery([
  { muscle: 'legs', lastTrainedAt: '2026-11-17T10:00:00.000Z', recoveryPct: 40, status: 'fatigued' },
  { muscle: 'biceps', lastTrainedAt: null, recoveryPct: 120, status: 'ready' },
  { muscle: 'back', lastTrainedAt: 'not-a-date', recoveryPct: 60, status: 'bogus' }
]);
assert.strictEqual(normalized[0].status, 'fatigued');
assert.strictEqual(normalized[1].recoveryPct, 100, 'Percent must clamp to 100');
assert.strictEqual(normalized[1].lastTrainedAt, null);
assert.strictEqual(normalized[2].lastTrainedAt, null, 'Invalid date must become null');
assert.strictEqual(normalized[2].status, 'recovering', 'Unknown status must be derived from pct');
assert.throws(() => normalizeRecovery({ foo: 1 }), 'Non-array payload must throw');
assert.throws(() => normalizeRecovery([{ recoveryPct: 10 }]), 'Item without muscle must throw');
console.log('✓ Normalization and validation verified.');

// 3. Composable: success path
console.log('▶ [3] Testing useRecovery success path...');
const okFetch = async (url) => {
  assert.strictEqual(url, '/api/recovery');
  return { ok: true, status: 200, json: async () => normalized };
};
const okState = useRecovery(okFetch);
await okState.load();
assert.strictEqual(okState.error.value, '');
assert.strictEqual(okState.items.value.length, 3);
assert.strictEqual(okState.loading.value, false);
console.log('✓ Successful load populates items.');

// 4. Composable: failure paths must not throw and must show the Thai message
console.log('▶ [4] Testing useRecovery failure paths...');
const cases = [
  ['network error', async () => { throw new Error('offline'); }],
  ['HTTP 500', async () => ({ ok: false, status: 500, json: async () => ({}) })],
  ['invalid body', async () => ({ ok: true, status: 200, json: async () => ({ bad: true }) })]
];
for (const [label, fakeFetch] of cases) {
  const state = useRecovery(fakeFetch);
  state.items.value = [{ muscle: 'stale' }];
  await state.load();
  assert.strictEqual(state.error.value, RECOVERY_ERROR_MESSAGE, `${label}: error message`);
  assert.strictEqual(state.items.value.length, 0, `${label}: stale items cleared`);
  assert.strictEqual(state.loading.value, false, `${label}: loading reset`);
  console.log(`  ✓ ${label} → "${RECOVERY_ERROR_MESSAGE}"`);
}
console.log('✓ Failure paths verified.');

console.log('\n====================================================');
console.log('🎉 ALL RECOVERY INDICATOR TESTS PASSED!');
console.log('====================================================');
