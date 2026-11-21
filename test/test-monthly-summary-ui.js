import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  monthKeyOf,
  isMonthKey,
  shiftMonth,
  monthLabel,
  normalizeMonthlySummary,
  hasMonthlyData,
  formatVolumeKg,
  formatBestSet,
  formatE1RM,
  useMonthlySummary,
  MONTHLY_ERROR_MESSAGE,
  MONTHLY_TIMEOUT_MESSAGE
} from '../src/composables/useMonthlySummary.js';

/**
 * Monthly summary UI: month helpers, the response check, the Thai text, load/error/retry, and the
 * wiring in HistoryView and the component (44 px controls). No database: fetch is faked.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fakeFetch(handler) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    return handler(url, calls.length);
  };
  fn.calls = calls;
  return fn;
}
const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const bad = (status) => ({ ok: false, status, json: async () => ({ error: 'x' }) });

const sample = {
  month: '2026-11',
  sessions: 3,
  completedWorkingSets: 9,
  volumeKg: 4321.5,
  prs: [
    { exerciseId: 'bench', exerciseName: 'Bench', bestWeight: 70, bestReps: 8, estimated1RM: 88.9 },
    { exerciseId: 'row', exerciseName: 'Row', bestWeight: null, bestReps: null, estimated1RM: null }
  ]
};

console.log('====================================================');
console.log('🧪 QA Test: Monthly summary on the history page');
console.log('====================================================\n');

console.log('▶ [1] Month helpers (local time, year wrap, validation)...');
assert.strictEqual(monthKeyOf(new Date(2026, 10, 21)), '2026-11');
assert.strictEqual(monthKeyOf(new Date(2026, 0, 3)), '2026-01', 'pads the month');
assert.strictEqual(shiftMonth('2026-01', -1), '2025-12', 'back over the year');
assert.strictEqual(shiftMonth('2026-12', 1), '2027-01', 'forward over the year');
assert.strictEqual(shiftMonth('2026-11', 0), '2026-11');
assert.strictEqual(shiftMonth('bad', 1), 'bad', 'invalid key unchanged');
assert.ok(isMonthKey('2026-11') && !isMonthKey('2026-13') && !isMonthKey('26-11') && !isMonthKey(null));
// Thai locale shows the Buddhist year (พ.ศ. = ค.ศ. + 543); the month key stays Gregorian.
assert.ok(monthLabel('2026-11').includes(String(2026 + 543)), 'Thai month label uses the Thai (พ.ศ.) year');
console.log('  ✓ month helpers\n');

console.log('▶ [2] Response check: valid shape normalizes; wrong shape throws...');
const n = normalizeMonthlySummary(sample);
assert.strictEqual(n.month, '2026-11');
assert.strictEqual(n.completedWorkingSets, 9);
assert.strictEqual(n.volumeKg, 4321.5);
assert.strictEqual(n.prs[1].bestWeight, null, 'null PR stays null');
assert.throws(() => normalizeMonthlySummary({ month: '2026-11' }), /Invalid monthly summary/);
assert.throws(() => normalizeMonthlySummary(null), /Invalid monthly summary/);
assert.throws(() => normalizeMonthlySummary({ month: 'x', prs: [] }), /Invalid monthly summary/);
console.log('  ✓ valid and invalid payloads\n');

console.log('▶ [3] Empty state and text formatting...');
assert.strictEqual(hasMonthlyData({ sessions: 0, completedWorkingSets: 0 }), false, 'nothing done: empty state');
assert.strictEqual(hasMonthlyData({ sessions: 1, completedWorkingSets: 0 }), true);
assert.strictEqual(hasMonthlyData(null), false);
assert.strictEqual(formatVolumeKg(4321.5), '4,321.5 กก.');
assert.strictEqual(formatVolumeKg(0), '0 กก.');
assert.strictEqual(formatVolumeKg(NaN), '—');
assert.strictEqual(formatBestSet(n.prs[0]), '70 กก. × 8');
assert.strictEqual(formatBestSet(n.prs[1]), '—', 'no set: dash');
assert.strictEqual(formatE1RM(n.prs[0]), '88.9 กก.');
assert.strictEqual(formatE1RM(n.prs[1]), '—');
console.log('  ✓ empty state and formatting\n');

console.log('▶ [4] Load: request URL, data, and the summary is set...');
const okFetch = fakeFetch(() => ok(sample));
const s1 = useMonthlySummary(okFetch);
await s1.load('2026-11');
assert.strictEqual(okFetch.calls[0], '/api/summary/monthly?month=2026-11');
assert.strictEqual(s1.summary.value.completedWorkingSets, 9);
assert.strictEqual(s1.loading.value, false);
assert.strictEqual(s1.error.value, '');
console.log('  ✓ request and data\n');

console.log('▶ [5] Errors: HTTP failure and timeout show Thai messages; retry loads again...');
const failFetch = fakeFetch((url, n) => (n === 1 ? bad(500) : ok(sample)));
const s2 = useMonthlySummary(failFetch);
await s2.load('2026-11');
assert.strictEqual(s2.error.value, MONTHLY_ERROR_MESSAGE);
assert.strictEqual(s2.summary.value, null, 'no stale data after an error');
await s2.retry();
assert.strictEqual(s2.error.value, '', 'error cleared by retry');
assert.strictEqual(s2.summary.value.sessions, 3);

const hangFetch = fakeFetch(() => new Promise(() => {}));
const s3 = useMonthlySummary(hangFetch, { timeoutMs: 30, slowMs: 5 });
await s3.load('2026-11');
assert.strictEqual(s3.error.value, MONTHLY_TIMEOUT_MESSAGE, 'a stuck request times out with a message');
assert.strictEqual(s3.loading.value, false);
console.log('  ✓ HTTP error, timeout, retry\n');

console.log('▶ [6] Latest request wins: an older slow answer does not overwrite a newer month...');
const slowFetch = fakeFetch((url) => {
  if (url.endsWith('2026-10')) return new Promise((r) => setTimeout(() => r(ok({ ...sample, month: '2026-10', sessions: 99 })), 40));
  return ok({ ...sample, month: '2026-11', sessions: 3 });
});
const s4 = useMonthlySummary(slowFetch);
const first = s4.load('2026-10');
await s4.load('2026-11');
await first;
assert.strictEqual(s4.month.value, '2026-11');
assert.strictEqual(s4.summary.value.month, '2026-11', 'the stale 2026-10 answer is ignored');
assert.strictEqual(s4.summary.value.sessions, 3);
console.log('  ✓ stale answer ignored\n');

console.log('▶ [7] Wiring: HistoryView shows the component; controls are 44 px; Thai labels...');
const hist = fs.readFileSync(path.join(root, 'src/components/HistoryView.vue'), 'utf8');
assert.ok(hist.includes("import MonthlySummary from './MonthlySummary.vue';"), 'HistoryView imports it');
assert.ok(hist.includes('<MonthlySummary />'), 'HistoryView renders it');
const comp = fs.readFileSync(path.join(root, 'src/components/MonthlySummary.vue'), 'utf8');
assert.ok(comp.includes("aria-label=\"เดือนก่อนหน้า\"") && comp.includes("aria-label=\"เดือนถัดไป\""), 'month buttons labelled');
const buttons = comp.match(/<button\b[\s\S]*?>/g) || [];
assert.ok(buttons.length >= 3, 'found the buttons');
for (const b of buttons) assert.ok(b.includes('min-h-[44px]'), `button under 44 px: ${b.slice(0, 80)}`);
assert.ok(comp.includes('role="alert"') && comp.includes('ลองอีกครั้ง'), 'error box with retry');
assert.ok(comp.includes('aria-live="polite"'), 'month change is announced');
console.log('  ✓ HistoryView wiring, 44 px controls, labels\n');

console.log('▶ [8] Package: test is in the npm test chain...');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.ok(pkg.scripts.test.includes('node test/test-monthly-summary-ui.js'), 'added to npm test');
console.log('  ✓ in npm test\n');

console.log('✅ monthly summary UI checks passed');
