import assert from 'node:assert';
import app from '../server/server.js';
import { statusFromPct, normalizeRecovery } from '../src/composables/useRecovery.js';

/**
 * QA: Muscle Fatigue & Recovery Indicator — formula + API contract (SPEC docs/COMPETITOR-RE-BENCHMARK-SPEC.md §2.3)
 *
 * Contract (GET /api/recovery):
 *   [{ muscle, lastTrainedAt: ISO|null, recoveryPct: number, status: "fatigued"|"recovering"|"ready" }]
 *
 * Formula:
 *   recoveryPct = min(100, hoursSinceLast / 48 * 100)   (rounded to 2 decimals in this test)
 *   0–49 -> fatigued | 50–84 -> recovering | 85–100 -> ready
 *   never trained (lastTrainedAt null) -> recoveryPct 100, status ready
 */

const HOURS_FULL_RECOVERY = 48;
const VALID_STATUSES = ['fatigued', 'recovering', 'ready'];

// Spec oracle: the §2.3 formula, used as the expected value.
function specRecovery(hoursSince) {
  if (hoursSince === null) return { recoveryPct: 100, status: 'ready' };
  const raw = Math.min(100, Math.max(0, hoursSince) / HOURS_FULL_RECOVERY * 100);
  const recoveryPct = Math.round(raw * 100) / 100;
  return { recoveryPct, status: statusFromPct(recoveryPct) };
}

// pct -> hours that produce it (48h = 100%).
const hoursForPct = (pct) => pct * HOURS_FULL_RECOVERY / 100;

console.log('====================================================');
console.log('🧪 QA Test: Recovery Formula & API Contract (SPEC 2.3)');
console.log('====================================================\n');

// ------------------------------------------------------------------
// 1. UNIT: hours -> recoveryPct -> status at boundaries (0, 49, 50, 84, 85, 100 %)
// ------------------------------------------------------------------
console.log('▶ [1] Hours-to-percent boundaries...');
const hourCases = [
  { label: '0 %',   hours: hoursForPct(0),   pct: 0,   status: 'fatigued' },
  { label: '49 %',  hours: hoursForPct(49),  pct: 49,  status: 'fatigued' },
  { label: '50 %',  hours: hoursForPct(50),  pct: 50,  status: 'recovering' },
  { label: '84 %',  hours: hoursForPct(84),  pct: 84,  status: 'recovering' },
  { label: '85 %',  hours: hoursForPct(85),  pct: 85,  status: 'ready' },
  { label: '100 %', hours: hoursForPct(100), pct: 100, status: 'ready' },
];
for (const c of hourCases) {
  const got = specRecovery(c.hours);
  assert.strictEqual(got.recoveryPct, c.pct, `${c.label}: recoveryPct for ${c.hours}h`);
  assert.strictEqual(got.status, c.status, `${c.label}: status for ${c.hours}h`);
}
console.log('✓ Hour boundaries map to the expected % and status.');

// ------------------------------------------------------------------
// 2. UNIT: never trained -> lastTrainedAt null, 100 %, ready
// ------------------------------------------------------------------
console.log('▶ [2] Never-trained muscle...');
assert.deepStrictEqual(specRecovery(null), { recoveryPct: 100, status: 'ready' });
const neverTrained = normalizeRecovery([
  { muscle: 'chest', lastTrainedAt: null, recoveryPct: 100, status: 'ready' },
]);
assert.strictEqual(neverTrained[0].lastTrainedAt, null, 'never-trained lastTrainedAt must stay null');
assert.strictEqual(neverTrained[0].recoveryPct, 100);
assert.strictEqual(neverTrained[0].status, 'ready');
console.log('✓ Never-trained case returns null / 100 / ready.');

// ------------------------------------------------------------------
// 3. UNIT: recoveryPct never exceeds 100 (and never goes below 0)
// ------------------------------------------------------------------
console.log('▶ [3] Cap at 100...');
for (const h of [48, 72, 200, 1000]) {
  const { recoveryPct } = specRecovery(h);
  assert.ok(recoveryPct <= 100, `recoveryPct for ${h}h must be <= 100, got ${recoveryPct}`);
  assert.strictEqual(recoveryPct, 100, `recoveryPct for ${h}h should be capped at 100`);
}
assert.strictEqual(specRecovery(0).recoveryPct, 0, 'just trained must be 0 %');
const clamped = normalizeRecovery([{ muscle: 'back', lastTrainedAt: null, recoveryPct: 150, status: 'ready' }]);
assert.strictEqual(clamped[0].recoveryPct, 100, 'normalizeRecovery must clamp recoveryPct > 100 to 100');
console.log('✓ recoveryPct capped at 100 for 48h, 72h, 200h, 1000h; client clamp verified.');

// ------------------------------------------------------------------
// 4. INTEGRATION: GET /api/recovery shape, status and formula
// ------------------------------------------------------------------
console.log('▶ [4] Integration: GET /api/recovery...');

async function runIntegration() {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/api/recovery`);
    assert.strictEqual(res.status, 200, `GET /api/recovery must return 200, got ${res.status}`);
    assert.match(res.headers.get('content-type') || '', /application\/json/, 'must return JSON');

    const body = await res.json();
    const fetchedAt = Date.now();
    assert.ok(Array.isArray(body), 'response must be an array');
    assert.ok(body.length > 0, 'response must include at least one muscle');

    const seen = new Set();
    for (const item of body) {
      assert.deepStrictEqual(
        Object.keys(item).sort(),
        ['lastTrainedAt', 'muscle', 'recoveryPct', 'status'],
        `item shape mismatch: ${JSON.stringify(item)}`,
      );
      assert.ok(typeof item.muscle === 'string' && item.muscle.trim(), 'muscle must be a non-empty string');
      assert.ok(!seen.has(item.muscle), `duplicate muscle: ${item.muscle}`);
      seen.add(item.muscle);

      assert.ok(
        item.lastTrainedAt === null || (typeof item.lastTrainedAt === 'string' && !Number.isNaN(Date.parse(item.lastTrainedAt))),
        `lastTrainedAt must be null or ISO string for ${item.muscle}`,
      );
      assert.ok(
        typeof item.recoveryPct === 'number' && Number.isFinite(item.recoveryPct),
        `recoveryPct must be a finite number for ${item.muscle}`,
      );
      assert.ok(item.recoveryPct >= 0 && item.recoveryPct <= 100, `recoveryPct out of 0..100 for ${item.muscle}: ${item.recoveryPct}`);
      assert.ok(VALID_STATUSES.includes(item.status), `invalid status for ${item.muscle}: ${item.status}`);
      assert.strictEqual(item.status, statusFromPct(item.recoveryPct), `status must match band for ${item.muscle}`);

      if (item.lastTrainedAt === null) {
        assert.strictEqual(item.recoveryPct, 100, `never-trained ${item.muscle} must be 100`);
        assert.strictEqual(item.status, 'ready', `never-trained ${item.muscle} must be ready`);
      } else {
        // Recompute from lastTrainedAt. Allow 1 point for rounding and request latency.
        const hours = (fetchedAt - Date.parse(item.lastTrainedAt)) / 3600000;
        const expected = specRecovery(Math.max(0, hours)).recoveryPct;
        assert.ok(
          Math.abs(item.recoveryPct - expected) <= 1,
          `${item.muscle}: recoveryPct ${item.recoveryPct} != expected ${expected} (hours=${hours.toFixed(2)})`,
        );
      }
    }
    console.log(`✓ Endpoint returned ${body.length} muscle entries with valid shape, status bands, and formula.`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

await runIntegration();

console.log('\n====================================================');
console.log('✅ test-recovery-contract.js: ALL CHECKS PASSED');
console.log('====================================================');
