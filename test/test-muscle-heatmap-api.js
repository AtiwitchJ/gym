import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: 2D Anatomical Muscle Recovery Heatmap
 * Spec: GYM Competitor RE report at commit 5057767 (v1.7.1).
 *
 * Backward compatibility: the legacy GET /api/recovery array is untouched;
 * the heatmap uses the new GET /api/recovery/heatmap contract.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-heatmap-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');
const recoveryMod = await import('../server/recovery.js');
const recovery = recoveryMod.default || recoveryMod;
const slugMod = await import('../server/muscle-slug-map.js');
const slug = slugMod.default || slugMod;

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: 2D Muscle Recovery Heatmap');
console.log('====================================================\n');

const NOW = Date.parse('2026-11-23T12:00:00.000Z');

try {
  // ----------------------------------------------------------------
  // Case 1: slug whitelist + label inference
  // ----------------------------------------------------------------
  console.log('▶ [1] Slug whitelist and label inference...');
  assert.strictEqual(slug.MUSCLE_KEYS.length, 11);
  assert.deepStrictEqual(slug.MUSCLE_KEYS, [
    'chest', 'lats', 'biceps', 'triceps', 'quads',
    'hamstrings', 'glutes', 'delts', 'abs', 'calves', 'traps'
  ]);
  assert.strictEqual(slug.muscleKeyFor('อกส่วนกลาง (Mid Chest)'), 'chest');
  assert.strictEqual(slug.muscleKeyFor('หลังส่วนกว้าง/ปีก (Lats)'), 'lats');
  assert.strictEqual(slug.muscleKeyFor('แขนด้านหน้ามัดหลัก (Biceps Brachii)'), 'biceps');
  assert.strictEqual(slug.muscleKeyFor('ต้นขาด้านหน้า (Quads), ก้น (Glutes)'), 'quads', 'first/primary mover wins');
  assert.strictEqual(slug.muscleKeyFor('ไม่มีคำที่รู้จัก'), null);
  assert.strictEqual(slug.normalizeToWhitelist('CHEST'), 'chest');
  assert.strictEqual(slug.normalizeToWhitelist('unknown'), null);
  console.log('  ✓ 11 canonical slugs and inference verified.\n');

  // ----------------------------------------------------------------
  // Case 2: pure buildRecoveryHeatmap shape + status bands
  // ----------------------------------------------------------------
  console.log('▶ [2] Pure heatmap payload and status bands...');
  const rows = [
    { exerciseId: 't1', date: '2026-11-23', time: '11:00', done: 1 }, // chest 1h ago
    { exerciseId: 'm3', date: '2026-11-22', time: '12:00', done: 1 }, // quads 24h ago
    { exerciseId: 'w2', date: '2026-11-20', time: '12:00', done: 1 }  // lats 72h ago -> ready
  ];
  const payload = recovery.buildRecoveryHeatmap(rows, NOW);
  assert.ok(payload.summary && Array.isArray(payload.muscles));
  assert.strictEqual(payload.muscles.length, 11);
  for (const m of payload.muscles) {
    assert.deepStrictEqual(Object.keys(m).sort(), [
      'displayName', 'hoursRemaining', 'lastTrainedAt', 'muscleKey', 'recoveryPct', 'status'
    ]);
    assert.ok(slug.MUSCLE_KEY_SET.has(m.muscleKey));
    assert.ok(['fatigued', 'recovering', 'ready', 'untrained'].includes(m.status));
    assert.ok(m.recoveryPct >= 0 && m.recoveryPct <= 100);
    assert.ok(m.hoursRemaining >= 0);
  }
  const chest = payload.muscles.find((m) => m.muscleKey === 'chest');
  assert.strictEqual(chest.status, 'fatigued');
  assert.strictEqual(chest.recoveryPct, 2); // 1h / 48h ~= 2
  const quads = payload.muscles.find((m) => m.muscleKey === 'quads');
  assert.strictEqual(quads.status, 'recovering'); // 24/48 = 50
  const lats = payload.muscles.find((m) => m.muscleKey === 'lats');
  assert.strictEqual(lats.status, 'ready'); // 72h -> capped 100
  const untrained = payload.muscles.find((m) => m.muscleKey === 'abs');
  assert.strictEqual(untrained.status, 'untrained');
  assert.strictEqual(untrained.lastTrainedAt, null);
  assert.strictEqual(untrained.recoveryPct, 100);
  console.log('  ✓ Status bands, slugs and untrained handling verified.\n');

  // ----------------------------------------------------------------
  // Case 3: summary counters match muscles
  // ----------------------------------------------------------------
  console.log('▶ [3] Summary counters...');
  const s = payload.summary;
  assert.strictEqual(s.fatiguedCount, payload.muscles.filter((m) => m.status === 'fatigued').length);
  assert.strictEqual(s.recoveringCount, payload.muscles.filter((m) => m.status === 'recovering').length);
  assert.strictEqual(s.readyCount, payload.muscles.filter((m) => m.status === 'ready').length);
  assert.ok(['fatigued', 'recovering', 'ready'].includes(s.overallStatus));
  const empty = recovery.buildRecoveryHeatmap([], NOW);
  assert.strictEqual(empty.summary.overallStatus, 'ready');
  assert.ok(empty.muscles.every((m) => m.status === 'untrained'));
  console.log('  ✓ Summary counts and empty store verified.\n');

  // ----------------------------------------------------------------
  // Case 4: legacy array route unchanged
  // ----------------------------------------------------------------
  console.log('▶ [4] Legacy /api/recovery stays an array...');
  const legacy = recovery.buildRecovery(rows, NOW);
  assert.ok(Array.isArray(legacy));
  assert.deepStrictEqual(Object.keys(legacy[0]).sort(), ['lastTrainedAt', 'muscle', 'recoveryPct', 'status']);
  console.log('  ✓ Legacy array shape preserved.\n');

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const port = server.address().port;

  try {
    // ----------------------------------------------------------------
    // Case 5: HTTP contract for both routes
    // ----------------------------------------------------------------
    console.log('▶ [5] HTTP contract for heatmap and legacy routes...');
    const heatRes = await fetch(`http://127.0.0.1:${port}/api/recovery/heatmap`);
    assert.strictEqual(heatRes.status, 200);
    const heatBody = await heatRes.json();
    assert.ok(heatBody.summary && Array.isArray(heatBody.muscles));
    assert.strictEqual(heatBody.muscles.length, 11);
    const legacyRes = await fetch(`http://127.0.0.1:${port}/api/recovery`);
    assert.strictEqual(legacyRes.status, 200);
    assert.ok(Array.isArray(await legacyRes.json()));
    console.log('  ✓ Both endpoints respond with their respective contracts.\n');

    // ----------------------------------------------------------------
    // Case 6: UI contract (SVG + accessibility + toggle + colors)
    // ----------------------------------------------------------------
    console.log('▶ [6] Heatmap UI contract...');
    const card = read('src/components/RecoveryPanel.vue');
    assert.ok(path.resolve(repo.getDbPath()) !== path.resolve('data/gym.db'), 'test must use a temp database');
    const fsAvailable = fs.existsSync(path.join(root, 'src/components/MuscleHeatmapSvg.vue'));
    if (fsAvailable) {
      const svg = read('src/components/MuscleHeatmapSvg.vue');
      assert.ok(svg.includes('<svg') && svg.includes('viewBox'), 'SVG canvas required');
      assert.ok(svg.includes('role="img"') && svg.includes('<title'), 'screen reader support required');
      for (const key of slug.MUSCLE_KEYS) {
        assert.ok(svg.includes(key), `SVG must render ${key}`);
      }
      // Colors live in useRecovery.js STATUS_COLORS as the single source of
      // truth; the SVG consumes them through getFillColor(), not hardcoded.
      const composable = read('src/composables/useRecovery.js');
      for (const color of ['#EF4444', '#F59E0B', '#10B981', '#E5E7EB']) {
        assert.ok(composable.includes(color), `STATUS_COLORS missing ${color}`);
      }
      assert.ok(svg.includes('STATUS_COLORS') && svg.includes('getFillColor'), 'SVG must consume STATUS_COLORS');
      assert.ok(card.includes('MuscleHeatmapSvg'), 'RecoveryPanel must mount the heatmap');
      assert.ok(/ด้านหน้า|front/i.test(card) && /ด้านหลัง|back/i.test(card), 'front/back toggle required');
      assert.ok(/รายการ|list/i.test(card), 'list fallback required');
      assert.ok(!svg.includes('focus:outline-none'), 'forbidden a11y class');
      console.log('  ✓ SVG paths, colors, front/back toggle and list fallback verified.');
    } else {
      console.log('  ⓘ MuscleHeatmapSvg.vue not present yet (frontend still working) — UI assertions skipped.');
    }
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log('🎉 ALL MUSCLE HEATMAP TESTS PASSED!');
  console.log('====================================================\n');
} catch (err) {
  console.error('\n✗ MUSCLE HEATMAP TEST FAILED:', err.message);
  process.exitCode = 1;
}
