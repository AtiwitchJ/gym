import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { useWeeklyVolume, VOLUME_TIMEOUT_MESSAGE, VOLUME_ERROR_MESSAGE, VOLUME_SLOW_MESSAGE } from '../src/composables/useWeeklyVolume.js';
import { useExerciseHistory, HISTORY_TIMEOUT_MESSAGE, HISTORY_ERROR_MESSAGE } from '../src/composables/useExerciseHistory.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const never = () => new Promise(() => {});
const okVolume = async () => ({ ok: true, status: 200, json: async () => ({ weeks: [{ weekStart: '2026-11-16', muscles: [], exercises: [] }] }) });

console.log('====================================================');
console.log('🧪 QA Test: slow loads say so, time out with a message, and can be retried (accessibility item 3)');
console.log('====================================================\n');

console.log('▶ [1] A slow load says it is loading, then times out with a message...');
const volume = useWeeklyVolume(never, { timeoutMs: 40, slowMs: 10 });
const pending = volume.load();
await wait(20);
assert.strictEqual(volume.loading.value, true, 'still loading');
assert.strictEqual(volume.slow.value, true, 'marked as slow after a while');
await pending;
assert.strictEqual(volume.error.value, VOLUME_TIMEOUT_MESSAGE, 'timeout message');
assert.strictEqual(volume.loading.value, false, 'no longer loading');
assert.strictEqual(volume.slow.value, false, 'slow flag cleared');
assert.ok(VOLUME_SLOW_MESSAGE.includes('กำลังโหลด'), 'slow message names the state');
console.log('✓ Slow and timeout verified.');

console.log('▶ [2] Retry loads again after a timeout...');
let calls = 0;
const flaky = async (url) => { calls++; return calls === 1 ? never() : okVolume(url); };
const retry = useWeeklyVolume(flaky, { timeoutMs: 40, slowMs: 1000 });
await retry.load();
assert.strictEqual(retry.error.value, VOLUME_TIMEOUT_MESSAGE);
await retry.retry();
assert.strictEqual(retry.error.value, '', 'retry clears the error');
assert.strictEqual(retry.weeks.value.length, 1, 'retry brings the data');
assert.strictEqual(calls, 2, 'one more request');
console.log('✓ Retry verified.');

console.log('▶ [3] A server error is still reported as a load error, not a timeout...');
const broken = useWeeklyVolume(async () => ({ ok: false, status: 500, json: async () => ({}) }), { timeoutMs: 500 });
await broken.load();
assert.strictEqual(broken.error.value, VOLUME_ERROR_MESSAGE);
console.log('✓ Error and timeout kept apart.');

console.log('▶ [4] The exercise history times out and retries the same exercise...');
const history = useExerciseHistory(never, { timeoutMs: 40 });
await history.load('a1');
assert.strictEqual(history.error.value, HISTORY_TIMEOUT_MESSAGE);
let seen = [];
const again = useExerciseHistory(async (url) => { seen.push(url); return { ok: true, status: 200, json: async () => [] }; }, { timeoutMs: 500 });
await again.load('b2');
await again.retry();
assert.deepStrictEqual(seen, ['/api/exercises/b2/history', '/api/exercises/b2/history'], 'retry reuses the same exercise id');
assert.ok(HISTORY_ERROR_MESSAGE.length > 0);
console.log('✓ History retry verified.');

console.log('▶ [5] Wiring: the chart and the modal show a retry button...');
const chart = fs.readFileSync(path.join(root, 'src/components/VolumeChart.vue'), 'utf8');
assert.ok(chart.includes('@click="retry"') && chart.includes('ลองอีกครั้ง'), 'volume chart has a retry button');
assert.ok(chart.includes("slow ? slowMessage : 'กำลังโหลดข้อมูล...'"), 'volume chart shows the slow message');
const modal = fs.readFileSync(path.join(root, 'src/components/ExerciseHistoryModal.vue'), 'utf8');
assert.ok(modal.includes('@click="retry"') && modal.includes('ลองอีกครั้ง'), 'history modal has a retry button');
console.log('✓ Wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL LOAD-RETRY TESTS PASSED!');
console.log('====================================================');
