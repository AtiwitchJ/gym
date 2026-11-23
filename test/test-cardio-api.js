import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: /api/cardio HTTP contract + UI wiring.
 * Uses a temp database only; never touches data/gym.db.
 */
if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-cardio-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Cardio API & UI contract');
console.log('====================================================\n');

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

try {
  // 1. Empty GET returns 200 with full schema (never 404).
  console.log('▶ [1] Empty GET /api/cardio...');
  const emptyRes = await fetch(`${base}/api/cardio`);
  assert.strictEqual(emptyRes.status, 200);
  assert.match(emptyRes.headers.get('content-type') || '', /application\/json/);
  const empty = await emptyRes.json();
  assert.deepStrictEqual(Object.keys(empty).sort(), ['sessions', 'summary']);
  assert.deepStrictEqual(empty.sessions, []);
  assert.deepStrictEqual(Object.keys(empty.summary).sort(), [
    'allTime', 'byType', 'delta', 'lastWeek', 'thisWeek', 'weekEnd', 'weekStart'
  ]);
  assert.strictEqual(empty.summary.thisWeek.sessions, 0);
  console.log('  ✓ 200 OK, exact schema, empty aggregates.\n');

  // 2. POST creates a session with 201 + updated summary.
  console.log('▶ [2] POST /api/cardio...');
  const today = new Date();
  const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const createdRes = await fetch(`${base}/api/cardio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: localDate, type: 'run', durationMin: 30, distanceKm: 5.2, note: 'QA run' })
  });
  assert.strictEqual(createdRes.status, 201);
  const created = await createdRes.json();
  assert.deepStrictEqual(Object.keys(created).sort(), ['session', 'summary']);
  assert.ok(Number.isInteger(created.session.id) && created.session.id > 0);
  assert.strictEqual(created.session.type, 'run');
  assert.strictEqual(created.session.durationMin, 30);
  assert.strictEqual(created.session.distanceKm, 5.2);
  assert.strictEqual(created.session.calories, null, 'omitted calories stay null');
  assert.strictEqual(created.summary.thisWeek.sessions, 1);
  assert.strictEqual(created.summary.thisWeek.totalMinutes, 30);
  console.log('  ✓ 201 with persisted session and recomputed weekly summary.\n');

  // 3. GET reflects persisted row + estimated calories.
  console.log('▶ [3] GET after POST + MET estimate...');
  const after = await (await fetch(`${base}/api/cardio`)).json();
  assert.strictEqual(after.sessions.length, 1);
  assert.strictEqual(after.sessions[0].note, 'QA run');
  assert.strictEqual(after.summary.thisWeek.totalCalories, 360, '30-min run ≈ 360 kcal');
  assert.strictEqual(after.summary.byType.length, 1);
  assert.strictEqual(after.summary.byType[0].id, 'run');
  assert.strictEqual(after.summary.allTime.sessions, 1);
  console.log('  ✓ Persisted row read back; MET estimate = 360 kcal.\n');

  // 4. Invalid POST returns 400, not 500.
  console.log('▶ [4] Invalid POST → 400...');
  for (const bad of [
    { type: 'teleport', durationMin: 30 },
    { type: 'run', durationMin: 0 },
    { type: 'run', durationMin: 30, distanceKm: -5 },
    { durationMin: 30 }
  ]) {
    const badRes = await fetch(`${base}/api/cardio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bad)
    });
    assert.strictEqual(badRes.status, 400, `POST ${JSON.stringify(bad)}`);
    const badBody = await badRes.json();
    assert.ok(typeof badBody.error === 'string' && badBody.error.trim());
  }
  const countAfterBad = (await (await fetch(`${base}/api/cardio`)).json()).sessions.length;
  assert.strictEqual(countAfterBad, 1, 'invalid POSTs must not write rows');
  console.log('  ✓ All invalid payloads 400; no rows written.\n');

  // 5. DELETE removes the row; second DELETE 404.
  console.log('▶ [5] DELETE /api/cardio/:id...');
  const delRes = await fetch(`${base}/api/cardio/${created.session.id}`, { method: 'DELETE' });
  assert.strictEqual(delRes.status, 200);
  const delBody = await delRes.json();
  assert.strictEqual(delBody.deleted, true);
  assert.strictEqual(delBody.summary.thisWeek.sessions, 0);
  const delAgain = await fetch(`${base}/api/cardio/${created.session.id}`, { method: 'DELETE' });
  assert.strictEqual(delAgain.status, 404);
  console.log('  ✓ DELETE 200 with recomputed summary; repeat DELETE 404.\n');

  // 6. DB isolation + legacy routes intact.
  console.log('▶ [6] Isolation & legacy routes...');
  assert.notStrictEqual(path.resolve(repo.getDbPath()), path.resolve('data/gym.db'), 'must use temp DB');
  const health = await fetch(`${base}/api/health`);
  assert.strictEqual(health.status, 200);
  assert.strictEqual((await health.json()).status, 'ok');
  const zones = await fetch(`${base}/api/training/zones?e1rm=100`);
  assert.strictEqual(zones.status, 200);
  assert.strictEqual((await zones.json()).zones.length, 4);
  const standards = await fetch(`${base}/api/strength-standards`);
  assert.strictEqual(standards.status, 200);
  console.log('  ✓ Temp DB used; /api/health, zones and strength-standards unaffected.\n');

  // 7. UI wiring & accessibility.
  console.log('▶ [7] UI component contract...');
  const card = read('src/components/CardioCard.vue');
  const composable = read('src/composables/useCardio.js');
  const profile = read('src/components/ProfileView.vue');
  assert.ok(card.includes('role="region"') && card.includes('aria-label="บันทึกการออกกำลังกายคาร์ดิโอ"'));
  assert.ok(card.includes('role="alert"') && card.includes('role="status"'));
  assert.ok(card.includes('min-h-[44px]') && card.includes('min-w-[44px]'));
  assert.ok(card.includes('aria-label="ประเภทคาร์ดิโอ"'));
  assert.ok(card.includes('CARDIO_TYPE_META'), 'icons/labels rendered from data, not hard-coded');
  assert.ok(!card.includes('focus:outline-none'), 'forbidden a11y class');
  assert.ok(!card.includes('text-ink-muted/80'), 'forbidden dim class');
  assert.ok(composable.includes("'/api/cardio'"));
  assert.ok(composable.includes("method: 'POST'"));
  assert.ok(composable.includes("method: 'DELETE'"));
  assert.ok(profile.includes('CardioCard'), 'card mounted in ProfileView');
  console.log('  ✓ ARIA roles, 44px targets, form labels and mount verified.\n');

  console.log('\n====================================================');
  console.log('🎉 ALL CARDIO API TESTS PASSED!');
  console.log('====================================================\n');
} finally {
  server.close();
}
