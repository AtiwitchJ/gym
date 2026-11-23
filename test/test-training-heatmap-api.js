import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: /api/training-heatmap HTTP contract + UI wiring.
 * Uses a temp database only; never touches data/gym.db.
 */
// Always use a fresh isolated temp DB: the guarded runner shares one temp DB
// across steps, and earlier steps seed workout history into it.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-heatmap-'));
process.env.GYM_DB_PATH = path.join(tmpDir, 'gym-test.db');
process.env.GYM_FORBID_REAL_DB = '1';

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

function localDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function makeSession(id, date, sets) {
  const normalized = sets.map((s) => ({ target: '8 reps', ...s }));
  return {
    id,
    date,
    time: '10:00',
    dayKey: 'mon',
    dayTitle: 'วันจันทร์ - ขา + ก้น',
    totalSetsDone: normalized.filter((s) => s.done && s.type !== 'warm').length,
    exercises: [{ id: 'ex_bench', name: 'Barbell Bench Press', category: 'ท่าหลัก', sets: normalized }]
  };
}

console.log('====================================================');
console.log('🧪 QA Test: Training heatmap API & UI contract');
console.log('====================================================\n');

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

try {
  // 1. Empty GET returns 200 with the full schema (never 404).
  console.log('▶ [1] Empty GET /api/training-heatmap...');
  const emptyRes = await fetch(`${base}/api/training-heatmap`);
  assert.strictEqual(emptyRes.status, 200);
  assert.match(emptyRes.headers.get('content-type') || '', /application\/json/);
  const empty = await emptyRes.json();
  assert.deepStrictEqual(Object.keys(empty).sort(), [
    'days', 'leadingBlanks', 'monthlyDistribution', 'range', 'summary', 'weekdayDistribution', 'weeks'
  ]);
  assert.strictEqual(empty.days.length, 365);
  assert.strictEqual(empty.summary.totalSessions, 0);
  assert.strictEqual(empty.summary.activeDays, 0);
  assert.strictEqual(empty.summary.currentStreakDays, 0);
  console.log('  ✓ 200 OK, exact schema, 365 zeroed days.\n');

  // 2. Seed history through the real repository (warmups excluded from sets).
  console.log('▶ [2] Seed sessions via repo.saveSession...');
  repo.saveSession(makeSession('hm_today', localDate(0), [
    { setIndex: 1, type: 'warm', done: true, weight: 20, actualReps: 10 },
    { setIndex: 2, type: 'work', done: true, weight: 100, actualReps: 8 },
    { setIndex: 3, type: 'work', done: true, weight: 50, actualReps: 10 }
  ]));
  repo.saveSession(makeSession('hm_yesterday', localDate(-1), [
    { setIndex: 1, type: 'work', done: true, weight: 60, actualReps: 8 }
  ]));
  repo.saveSession(makeSession('hm_old', localDate(-40), [
    { setIndex: 1, type: 'work', done: true, weight: 80, actualReps: 5 }
  ]));
  const full = await (await fetch(`${base}/api/training-heatmap`)).json();
  assert.strictEqual(full.summary.totalSessions, 3);
  assert.strictEqual(full.summary.activeDays, 3);
  assert.strictEqual(full.summary.totalSets, 4, '2 working sets today + 1 + 1; warmup excluded');
  assert.strictEqual(full.summary.currentStreakDays, 2, 'yesterday + today');
  const todayCell = full.days.find((d) => d.date === localDate(0));
  assert.strictEqual(todayCell.sets, 2);
  assert.strictEqual(todayCell.volumeKg, 1300);
  assert.ok(todayCell.level >= 1);
  console.log('  ✓ Seeded history aggregated; warmup excluded; streak = 2.\n');

  // 3. ?days=30 window excludes the 40-day-old session.
  console.log('▶ [3] Window query ?days=30...');
  const narrowRes = await fetch(`${base}/api/training-heatmap?days=30`);
  assert.strictEqual(narrowRes.status, 200);
  const narrow = await narrowRes.json();
  assert.strictEqual(narrow.range.days, 30);
  assert.strictEqual(narrow.days.length, 30);
  assert.strictEqual(narrow.summary.totalSessions, 2);
  assert.strictEqual(narrow.summary.activeDays, 2);
  const clamped = await (await fetch(`${base}/api/training-heatmap?days=999`)).json();
  assert.strictEqual(clamped.range.days, 365);
  console.log('  ✓ Window filter and clamp applied server-side.\n');

  // 4. DB isolation + legacy routes intact.
  console.log('▶ [4] Isolation & legacy routes...');
  assert.notStrictEqual(path.resolve(repo.getDbPath()), path.resolve('data/gym.db'), 'must use temp DB');
  const health = await fetch(`${base}/api/health`);
  assert.strictEqual(health.status, 200);
  assert.strictEqual((await health.json()).status, 'ok');
  const cardio = await fetch(`${base}/api/cardio`);
  assert.strictEqual(cardio.status, 200);
  const standards = await fetch(`${base}/api/strength-standards`);
  assert.strictEqual(standards.status, 200);
  console.log('  ✓ Temp DB used; /api/health, cardio and strength-standards unaffected.\n');

  // 5. UI wiring & accessibility.
  console.log('▶ [5] UI component contract...');
  const card = read('src/components/TrainingHeatmapCard.vue');
  const composable = read('src/composables/useTrainingHeatmap.js');
  const profile = read('src/components/ProfileView.vue');
  assert.ok(card.includes('role="region"') && card.includes('aria-label="ความสม่ำเสมอในการฝึก 12 เดือน"'));
  assert.ok(card.includes('role="alert"') && card.includes('role="status"'));
  assert.ok(card.includes('min-h-[44px]') && card.includes('min-w-[44px]'));
  assert.ok(card.includes('aria-label="ตารางความถี่การฝึกแต่ละวัน"'));
  assert.ok(card.includes('levelClass'), 'shades driven by data, not hard-coded text');
  assert.ok(!card.includes('focus:outline-none'), 'forbidden a11y class');
  assert.ok(!card.includes('text-ink-muted/80'), 'forbidden dim class');
  assert.ok(!/text-\[(?:8|9|10)px\]/.test(card), 'no font smaller than 11px');
  assert.ok(composable.includes('/api/training-heatmap'), 'composable calls the endpoint');
  assert.ok(profile.includes('TrainingHeatmapCard'), 'card mounted in ProfileView');
  console.log('  ✓ ARIA roles, 44px targets, min font size and mount verified.\n');

  console.log('\n====================================================');
  console.log('🎉 ALL TRAINING HEATMAP API TESTS PASSED!');
  console.log('====================================================\n');
} finally {
  server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
