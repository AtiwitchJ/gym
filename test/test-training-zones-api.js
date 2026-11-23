import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: GET /api/training/zones HTTP contract + UI wiring.
 * Uses a temp database only; never touches data/gym.db.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-zones-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Training Zones API & UI contract');
console.log('====================================================\n');

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const port = server.address().port;

try {
  // 1. Valid request: 200 + exact schema.
  console.log('▶ [1] Valid e1RM response...');
  const res = await fetch(`http://127.0.0.1:${port}/api/training/zones?e1rm=100`);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/json/);
  const body = await res.json();
  assert.deepStrictEqual(Object.keys(body).sort(), ['e1rm', 'summary', 'zones']);
  assert.strictEqual(body.e1rm, 100);
  assert.ok(Array.isArray(body.zones) && body.zones.length === 4);
  assert.deepStrictEqual(Object.keys(body.summary).sort(), ['maxWeight', 'minWeight', 'zoneCount']);
  console.log('  ✓ 200 OK, exact top-level and summary schema.\n');

  // 2. Every zone field present and typed.
  console.log('▶ [2] Zone field schema...');
  const expectedKeys = [
    'focusTh', 'icon', 'id', 'nameTh', 'pctMax', 'pctMin',
    'repMax', 'repMin', 'targetPct', 'targetWeight', 'weightMax', 'weightMin'
  ];
  const ids = new Set();
  for (const z of body.zones) {
    assert.deepStrictEqual(Object.keys(z).sort(), expectedKeys);
    assert.ok(['endurance', 'hypertrophy', 'strength', 'peaking'].includes(z.id));
    assert.ok(typeof z.nameTh === 'string' && z.nameTh.trim());
    assert.ok(typeof z.icon === 'string' && z.icon.trim());
    assert.ok(typeof z.focusTh === 'string' && z.focusTh.trim());
    assert.ok(z.pctMin < z.pctMax && z.repMin < z.repMax);
    assert.ok(z.weightMin <= z.targetWeight && z.targetWeight <= z.weightMax);
    assert.ok(z.weightMin >= 0 && z.weightMax <= body.e1rm);
    for (const k of ['pctMin', 'pctMax', 'repMin', 'repMax', 'targetPct', 'targetWeight', 'weightMin', 'weightMax']) {
      assert.ok(typeof z[k] === 'number' && Number.isFinite(z[k]), `${z.id}.${k} numeric`);
    }
    ids.add(z.id);
  }
  assert.strictEqual(ids.size, 4, 'unique zone ids');
  console.log('  ✓ All 12 fields typed, 4 unique zone ids.\n');

  // 3. Invalid inputs return 400, never 500 or a crash.
  console.log('▶ [3] Invalid e1RM returns 400...');
  for (const bad of ['0', '-5', 'abc', '1001', '']) {
    const badRes = await fetch(`http://127.0.0.1:${port}/api/training/zones?e1rm=${encodeURIComponent(bad)}`);
    assert.strictEqual(badRes.status, 400, `e1rm=${bad}`);
    const badBody = await badRes.json();
    assert.ok(typeof badBody.error === 'string' && badBody.error.trim());
  }
  const missing = await fetch(`http://127.0.0.1:${port}/api/training/zones`);
  assert.strictEqual(missing.status, 400, 'missing e1rm');
  console.log('  ✓ 0, negative, text, >1000 and missing all return 400 with error.\n');

  // 4. DB isolation & determinism — pure feature must not touch data/gym.db.
  console.log('▶ [4] Database isolation & determinism...');
  assert.notStrictEqual(path.resolve(repo.getDbPath()), path.resolve('data/gym.db'), 'must use temp DB');
  const again = await (await fetch(`http://127.0.0.1:${port}/api/training/zones?e1rm=100`)).json();
  assert.deepStrictEqual(again, body, 'identical input yields identical payload');
  console.log('  ✓ Temp DB used; real DB untouched; output deterministic.\n');

  // 5. UI wiring & accessibility.
  console.log('▶ [5] UI component contract...');
  const card = read('src/components/TrainingZonesCard.vue');
  const composable = read('src/composables/useTrainingZones.js');
  const profile = read('src/components/ProfileView.vue');
  assert.ok(card.includes('role="region"') && card.includes('aria-label="โซนความเข้มข้นจาก 1RM"'));
  assert.ok(card.includes('role="alert"') && card.includes('role="status"'));
  assert.ok(card.includes('role="progressbar"') && card.includes(':aria-valuenow="z.targetPct"'));
  assert.ok(card.includes('aria-valuetext'));
  assert.ok(card.includes('aria-label="1RM เป็นกิโลกรัม"'));
  assert.ok(card.includes('min-h-[44px]') && card.includes('min-w-[44px]'));
  assert.ok(card.includes('{{ z.icon }}'), 'icons rendered from API data, not hard-coded');
  assert.ok(!card.includes('focus:outline-none'), 'forbidden a11y class');
  assert.ok(!card.includes('text-ink-muted/80'), 'forbidden dim class');
  assert.ok(composable.includes('/api/training/zones?e1rm='));
  assert.ok(profile.includes('TrainingZonesCard'), 'card mounted in ProfileView');
  console.log('  ✓ ARIA roles, 44px targets, input label and mount verified.\n');

  // 6. Legacy routes still intact.
  console.log('▶ [6] Legacy routes unchanged...');
  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.strictEqual(health.status, 200);
  assert.strictEqual((await health.json()).status, 'ok');
  const landmarks = await fetch(`http://127.0.0.1:${port}/api/volume/landmarks`);
  assert.strictEqual(landmarks.status, 200);
  assert.strictEqual((await landmarks.json()).landmarks.length, 11);
  console.log('  ✓ /api/health and /api/volume/landmarks unaffected.\n');

  console.log('\n====================================================');
  console.log('🎉 ALL TRAINING ZONES API TESTS PASSED!');
  console.log('====================================================\n');
} finally {
  server.close();
}
