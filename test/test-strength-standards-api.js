import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: GET /api/strength-standards HTTP contract + UI wiring.
 * Uses a temp database only; never touches data/gym.db.
 */

// This test asserts an empty-state first, so it always needs its own clean DB
// (the guarded runner shares one temp DB across every step of the chain).
const standardsTmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-standards-'));
process.env.GYM_DB_PATH = path.join(standardsTmpDir, 'gym-test.db');
process.env.GYM_FORBID_REAL_DB = '1';

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const realDb = path.join(root, 'data/gym.db');
const hashRealDb = () => (fs.existsSync(realDb)
  ? crypto.createHash('sha256').update(fs.readFileSync(realDb)).digest('hex')
  : null);

console.log('====================================================');
console.log('🧪 QA Test: Strength Standards API & UI contract');
console.log('====================================================\n');

const beforeHash = hashRealDb();
assert.notStrictEqual(path.resolve(repo.getDbPath()), path.resolve(realDb), 'must use temp DB');

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/api/strength-standards`;

try {
  // 1. Empty state -> 200 OK with hasBodyWeight:false, never 404 (Test 1).
  console.log('▶ [1] Empty state (no body weight)...');
  const emptyRes = await fetch(url);
  assert.strictEqual(emptyRes.status, 200);
  assert.match(emptyRes.headers.get('content-type') || '', /application\/json/);
  const empty = await emptyRes.json();
  assert.deepStrictEqual(Object.keys(empty).sort(), ['benchmarks', 'bodyWeight', 'bodyWeightDate', 'hasBodyWeight', 'hasWorkouts', 'overall']);
  assert.strictEqual(empty.bodyWeight, null);
  assert.strictEqual(empty.bodyWeightDate, null);
  assert.strictEqual(empty.hasBodyWeight, false);
  assert.strictEqual(empty.overall.level, 'unrated');
  assert.strictEqual(empty.overall.strengthScore, 0);
  assert.strictEqual(empty.overall.balance, null);
  assert.deepStrictEqual(empty.benchmarks, []);
  console.log('  ✓ 200 OK with an friendly unrated payload.\n');

  // Seed body weight + completed sets (including a warm-up that must be ignored).
  console.log('▶ [2] Seeding temp DB and reading a full payload...');
  repo.db.prepare('INSERT INTO body_weights (date, weight, note, updated_at) VALUES (?, ?, ?, ?)')
    .run('2026-11-23', 72, null, new Date().toISOString());
  repo.saveSession({
    id: 'ss_standards_qa_1',
    date: '2026-11-23',
    time: '10:00',
    dayKey: 'mon',
    dayTitle: 'QA Strength Standards',
    totalSetsDone: 4,
    exercises: [
      {
        id: 'barbell_bench_press',
        name: 'Barbell Bench Press',
        category: 'chest',
        sets: [
          { setIndex: 0, type: 'warmup', target: '10', weight: 200, actualReps: 10, done: true },
          { setIndex: 1, type: 'normal', target: '5', weight: 60, actualReps: 5, rir: 1, done: true }
        ]
      },
      {
        id: 'lat_pulldown_machine',
        name: 'Lat Pulldown Machine',
        category: 'back',
        sets: [{ setIndex: 0, type: 'normal', target: '6', weight: 50, actualReps: 6, rir: 1, done: true }]
      },
      {
        id: 'seated_leg_press',
        name: 'Seated Leg Press',
        category: 'quads',
        sets: [{ setIndex: 0, type: 'normal', target: '8', weight: 120, actualReps: 8, rir: 2, done: true }]
      }
    ]
  });

  const res = await fetch(url);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.hasBodyWeight, true);
  assert.strictEqual(body.hasWorkouts, true);
  assert.strictEqual(body.bodyWeight, 72);
  assert.strictEqual(body.bodyWeightDate, '2026-11-23');
  assert.ok(['untrained', 'novice', 'intermediate', 'advanced', 'elite'].includes(body.overall.level));
  assert.ok(body.overall.strengthScore > 0 && body.overall.strengthScore <= 100);
  assert.ok(typeof body.overall.summaryTh === 'string' && body.overall.summaryTh.trim());

  const balance = body.overall.balance;
  assert.ok(balance);
  for (const k of ['pushScore', 'pullScore', 'legsScore', 'dominantGroup', 'laggingGroup', 'recommendationTh']) {
    assert.ok(k in balance, `balance.${k} present`);
  }
  assert.ok(['push', 'pull', 'legs'].includes(balance.dominantGroup));
  assert.ok(['push', 'pull', 'legs'].includes(balance.laggingGroup));
  assert.ok(typeof balance.recommendationTh === 'string' && balance.recommendationTh.trim());

  assert.strictEqual(body.benchmarks.length, 3, 'bench + lat + leg press');
  assert.deepStrictEqual(body.benchmarks.map((b) => b.category).sort(), ['legs', 'pull', 'push']);
  const expectedKeys = [
    'bestE1rm', 'bestReps', 'bestWeight', 'category', 'displayNameTh', 'exerciseId',
    'icon', 'kgToNextLevel', 'level', 'levelLabelTh', 'nextLevel', 'nextLevelLabelTh',
    'progressPct', 'ratio', 'thresholds'
  ];
  for (const b of body.benchmarks) {
    assert.deepStrictEqual(Object.keys(b).sort(), expectedKeys.sort());
    for (const key of ['bestE1rm', 'bestWeight', 'bestReps', 'ratio', 'kgToNextLevel', 'progressPct']) {
      assert.ok(typeof b[key] === 'number' && Number.isFinite(b[key]), `${key} numeric`);
    }
    assert.ok(b.progressPct >= 0 && b.progressPct <= 100);
    assert.deepStrictEqual(Object.keys(b.thresholds).sort(), ['advanced', 'elite', 'intermediate', 'novice', 'untrained']);
  }

  const bench = body.benchmarks.find((b) => b.category === 'push');
  assert.strictEqual(bench.bestWeight, 60, '200x10 warm-up excluded from best set');
  assert.strictEqual(bench.bestReps, 5);
  // getCompletedSetVolumeRows() does not carry RIR, so e1RM here is the conservative
  // Epley estimate from weight x reps only: 60 x (1 + 5/30) = 70.
  assert.strictEqual(bench.bestE1rm, 70, '60x5 -> e1RM 70');
  assert.strictEqual(bench.ratio, 0.97);
  assert.strictEqual(bench.level, 'intermediate');
  assert.strictEqual(bench.nextLevel, 'advanced');
  assert.strictEqual(bench.thresholds.advanced, 75.6);
  assert.strictEqual(bench.kgToNextLevel, 5.6);
  console.log('  ✓ 3 benchmarks, exact schema, warm-up excluded, ratio/next-level math correct.\n');

  // 3. DB isolation & determinism.
  console.log('▶ [3] Database isolation & determinism...');
  const again = await (await fetch(url)).json();
  assert.deepStrictEqual(again, body, 'identical input yields identical payload');
  const afterHash = hashRealDb();
  assert.strictEqual(afterHash, beforeHash, 'data/gym.db hash unchanged');
  console.log('  ✓ Temp DB only; real DB hash unchanged; deterministic response.\n');

  // 4. UI wiring & accessibility.
  console.log('▶ [4] UI component contract...');
  const card = read('src/components/StrengthStandardsCard.vue');
  const composable = read('src/composables/useStrengthStandards.js');
  const profile = read('src/components/ProfileView.vue');
  const bodyWeightCard = read('src/components/BodyWeightCard.vue');
  assert.ok(card.includes('role="region"') && card.includes('aria-label="มาตรฐานความแข็งแรง"'));
  assert.ok(card.includes('role="alert"') && card.includes('role="status"'));
  assert.ok(card.includes('role="progressbar"') && card.includes('aria-valuetext'));
  assert.ok(card.includes(':aria-valuenow="cat.score"') && card.includes(':aria-valuenow="b.progressPct"'));
  assert.ok(card.includes('min-h-[44px]') && card.includes('min-w-[44px]'));
  assert.ok(!card.includes('focus:outline-none'), 'forbidden a11y class');
  assert.ok(!card.includes('text-ink-muted/80'), 'forbidden dim class');
  assert.ok(!card.includes('text-[10px]'), 'no sub-11px font');
  assert.ok(composable.includes("'/api/strength-standards'"), 'composable calls the endpoint');
  assert.ok(profile.includes('StrengthStandardsCard'), 'card mounted in ProfileView');
  assert.ok(bodyWeightCard.includes('id="body-weight"'), 'empty-state shortcut target exists');
  console.log('  ✓ ARIA roles, 44px targets, banned classes, endpoint and mount verified.\n');

  // 5. Legacy routes still intact.
  console.log('▶ [5] Legacy routes unchanged...');
  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  assert.strictEqual(health.status, 200);
  assert.strictEqual((await health.json()).status, 'ok');
  const zones = await fetch(`http://127.0.0.1:${port}/api/training/zones?e1rm=100`);
  assert.strictEqual(zones.status, 200);
  assert.strictEqual((await zones.json()).zones.length, 4);
  const landmarks = await fetch(`http://127.0.0.1:${port}/api/volume/landmarks`);
  assert.strictEqual(landmarks.status, 200);
  assert.strictEqual((await landmarks.json()).landmarks.length, 11);
  console.log('  ✓ /api/health, /api/training/zones and /api/volume/landmarks unaffected.\n');

  console.log('\n====================================================');
  console.log('🎉 ALL STRENGTH STANDARDS API TESTS PASSED!');
  console.log('====================================================\n');
} finally {
  server.close();
  fs.rmSync(standardsTmpDir, { recursive: true, force: true });
}
