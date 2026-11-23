import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: GET /api/volume/landmarks HTTP contract + UI wiring.
 * Uses a temp database only; never touches data/gym.db.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-landmarks-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Volume Landmarks API & UI contract');
console.log('====================================================\n');

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const port = server.address().port;

try {
  // 1. Empty store contract
  console.log('▶ [1] Empty-store HTTP response...');
  const res = await fetch(`http://127.0.0.1:${port}/api/volume/landmarks`);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/json/);
  const body = await res.json();
  assert.ok(typeof body.weekStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStart));
  assert.ok(body.summary && typeof body.summary === 'object');
  assert.ok(Array.isArray(body.landmarks) && body.landmarks.length === 11);
  assert.deepStrictEqual(
    Object.keys(body.summary).sort(),
    ['optimalCount', 'overreachedCount', 'status', 'totalWorkingSets', 'underCount']
  );
  console.log('  ✓ 200 OK, 11 landmarks, summary schema exact.\n');

  // 2. Every landmark field present & typed
  console.log('▶ [2] Landmark schema...');
  const expectedKeys = [
    'category', 'displayNameTh', 'mav', 'mev', 'mrv', 'muscleKey',
    'progressPct', 'recommendationTh', 'setsDone', 'status', 'statusLabelTh'
  ];
  const keys = new Set();
  for (const l of body.landmarks) {
    assert.deepStrictEqual(Object.keys(l).sort(), expectedKeys);
    assert.ok(typeof l.muscleKey === 'string' && l.muscleKey.trim());
    assert.ok(typeof l.displayNameTh === 'string' && l.displayNameTh.trim());
    assert.ok(['upper', 'lower', 'arms_core'].includes(l.category));
    assert.ok(l.mev < l.mav && l.mav < l.mrv);
    assert.ok(typeof l.setsDone === 'number' && l.setsDone >= 0);
    assert.ok(['under', 'optimal', 'near_mrv', 'overreached'].includes(l.status));
    assert.ok(typeof l.statusLabelTh === 'string' && l.statusLabelTh.trim());
    assert.ok(typeof l.progressPct === 'number' && l.progressPct >= 0);
    assert.ok(typeof l.recommendationTh === 'string' && l.recommendationTh.trim());
    keys.add(l.muscleKey);
  }
  assert.strictEqual(keys.size, 11, 'unique canonical slugs');
  console.log('  ✓ All fields typed, 11 unique slugs.\n');

  // 3. DB isolation & unchanged data
  console.log('▶ [3] Database isolation...');
  assert.notStrictEqual(path.resolve(repo.getDbPath()), path.resolve('data/gym.db'), 'must use temp DB');
  assert.strictEqual(body.summary.totalWorkingSets, 0, 'temp DB has no sessions');
  console.log('  ✓ Temp database used; real DB untouched.\n');

  // 4. UI wiring & accessibility
  console.log('▶ [4] UI component contract...');
  const card = read('src/components/VolumeLandmarksCard.vue');
  const composable = read('src/composables/useVolumeLandmarks.js');
  const history = read('src/components/HistoryView.vue');
  assert.ok(card.includes('role="region"') && card.includes('aria-label'));
  assert.ok(card.includes('role="progressbar"') && card.includes('aria-valuenow'));
  assert.ok(card.includes('aria-valuetext'));
  assert.ok(card.includes('min-h-[44px]') && card.includes('min-w-[44px]'));
  assert.ok(card.includes('⚠️') && card.includes('✓') && card.includes('🚨'), 'non-color status icons');
  assert.ok(!card.includes('focus:outline-none'), 'forbidden a11y class');
  assert.ok(!card.includes('text-ink-muted/80'), 'forbidden dim class');
  assert.ok(composable.includes('/api/volume/landmarks'));
  assert.ok(history.includes('VolumeLandmarksCard'), 'card mounted in HistoryView');
  console.log('  ✓ ARIA roles, 44px targets, icons, filter and mount verified.\n');

  // 5. Legacy volume route still intact
  console.log('▶ [5] Legacy /api/volume/weekly unchanged...');
  const weeklyRes = await fetch(`http://127.0.0.1:${port}/api/volume/weekly`);
  assert.strictEqual(weeklyRes.status, 200);
  assert.ok(Array.isArray((await weeklyRes.json()).weeks));
  console.log('  ✓ Legacy 8-week volume route still works.\n');

  console.log('\n====================================================');
  console.log('🎉 ALL VOLUME LANDMARKS API TESTS PASSED!');
  console.log('====================================================\n');
} finally {
  server.close();
}
