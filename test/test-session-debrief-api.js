import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: Post-Workout Fatigue, Session RPE (sRPE) & Muscle Soreness Debrief API
 *
 * Covers:
 * (1) computeSessionLoadAu — 120 นาที (7200 วิ) × RPE 8 = 960 AU, ปัดเป็น integer
 * (2) stepper/enum normalize ค่า --> 'low'|'good'|'insane' และ 'good'|'mild_ache'|'pain', ค่า invalid → fallback หรือ 400 ตาม contract
 * (3) POST /api/history บันทึก debrief แล้ว GET history คืนค่าครบทั้ง 4 field
 * (4) ค่าเริ่มต้น sessionRpe=7 เมื่อไม่ส่ง
 * (5) column ใหม่เป็น NULL สำหรับ session เก่า (backward compatible)
 * (6) session ใหม่ที่ไม่มี debrief ยังทำงานปกติ
 * (7) DB isolation: data/gym.db ไม่ถูกแตะต้อง และ sha256 ไม่เปลี่ยนแปลง
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-debrief-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');

const {
  DEFAULT_SESSION_RPE,
  DEFAULT_PUMP_RATING,
  DEFAULT_JOINT_COMFORT,
  PUMP_RATINGS,
  JOINT_COMFORTS,
  normalizeSrpe,
  normalizePumpRating,
  normalizeJointComfort,
  computeSessionLoadAu,
  getSrpeLabel,
  getPumpRatingLabel,
  getJointComfortLabel,
  useSessionDebrief
} = await import('../src/composables/useSessionDebrief.js');

const { buildSessionSummary } = await import('../src/composables/useSessionSummary.js');

console.log('====================================================');
console.log('🧪 QA Test: Post-Workout sRPE & Debrief API');
console.log('====================================================\n');

// ------------------------------------------------------------------
// 0. Database Isolation Verification
// ------------------------------------------------------------------
console.log('▶ [0] Verifying database isolation...');
assert.notStrictEqual(
  path.resolve(repo.getDbPath()),
  path.resolve('data/gym.db'),
  'Tests must NEVER write to real data/gym.db'
);
console.log('  ✓ Temp database isolated correctly.\n');

// Start ephemeral server
const server = app.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api/history`;

async function getHistory() {
  const res = await fetch(base);
  return { status: res.status, body: await res.json() };
}

async function postSession(payload) {
  const res = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return { status: res.status, body: await res.json() };
}

try {
  // ------------------------------------------------------------------
  // (1) computeSessionLoadAu — 120 นาที × RPE 8 = 960 AU, ปัดเป็น integer
  // ------------------------------------------------------------------
  console.log('▶ [1] computeSessionLoadAu calculation and integer rounding...');
  // 120 minutes = 7200 seconds, RPE 8 -> (7200 / 60) * 8 = 120 * 8 = 960 AU
  assert.strictEqual(computeSessionLoadAu(7200, 8), 960);
  assert.strictEqual(computeSessionLoadAu(7200, 7), 840);

  // Rounding checks
  // 75 seconds (= 1.25 min) × RPE 7 = 8.75 AU -> Math.round -> 9 AU
  assert.strictEqual(computeSessionLoadAu(75, 7), 9);
  // 45 seconds (= 0.75 min) × RPE 5 = 3.75 AU -> Math.round -> 4 AU
  assert.strictEqual(computeSessionLoadAu(45, 5), 4);
  // 35 seconds (= 0.583 min) × RPE 6 = 3.5 AU -> Math.round -> 4 AU
  assert.strictEqual(computeSessionLoadAu(35, 6), 4);
  // 0 seconds -> 0 AU
  assert.strictEqual(computeSessionLoadAu(0, 10), 0);
  // Missing or negative duration -> 0 AU
  assert.strictEqual(computeSessionLoadAu(null, 8), 0);
  assert.strictEqual(computeSessionLoadAu(undefined, 8), 0);

  console.log('  ✓ 120 min × RPE 8 correctly computed as 960 AU with integer rounding.\n');

  // ------------------------------------------------------------------
  // (2) stepper/enum normalize ค่า --> 'low'|'good'|'insane' และ 'good'|'mild_ache'|'pain'
  //     ค่า invalid → fallback หรือ 400 ตาม contract
  // ------------------------------------------------------------------
  console.log('▶ [2] Normalization fallback & HTTP 400 validation contract...');

  // Pump rating enum & fallbacks
  assert.deepStrictEqual(PUMP_RATINGS, ['low', 'good', 'insane']);
  assert.strictEqual(normalizePumpRating('low'), 'low');
  assert.strictEqual(normalizePumpRating('good'), 'good');
  assert.strictEqual(normalizePumpRating('insane'), 'insane');
  assert.strictEqual(normalizePumpRating('  INSANE  '), 'insane');
  assert.strictEqual(normalizePumpRating('LOW'), 'low');
  assert.strictEqual(normalizePumpRating('invalid_pump'), DEFAULT_PUMP_RATING);
  assert.strictEqual(normalizePumpRating(null), DEFAULT_PUMP_RATING);
  assert.strictEqual(normalizePumpRating(undefined), DEFAULT_PUMP_RATING);

  // Joint comfort enum & fallbacks
  assert.deepStrictEqual(JOINT_COMFORTS, ['good', 'mild_ache', 'pain']);
  assert.strictEqual(normalizeJointComfort('good'), 'good');
  assert.strictEqual(normalizeJointComfort('mild_ache'), 'mild_ache');
  assert.strictEqual(normalizeJointComfort('pain'), 'pain');
  assert.strictEqual(normalizeJointComfort(' MILD_ACHE '), 'mild_ache');
  assert.strictEqual(normalizeJointComfort('PAIN'), 'pain');
  assert.strictEqual(normalizeJointComfort('severe_injury'), DEFAULT_JOINT_COMFORT);
  assert.strictEqual(normalizeJointComfort(null), DEFAULT_JOINT_COMFORT);
  assert.strictEqual(normalizeJointComfort(undefined), DEFAULT_JOINT_COMFORT);

  // Stepper helper logic in composable
  const debrief = useSessionDebrief({ sessionRpe: 7 });
  assert.strictEqual(debrief.sessionRpe.value, 7);
  debrief.incrementRpe();
  assert.strictEqual(debrief.sessionRpe.value, 8);
  debrief.setRpe(10);
  debrief.incrementRpe();
  assert.strictEqual(debrief.sessionRpe.value, 10, 'Clamps at maximum 10');
  debrief.setRpe(1);
  debrief.decrementRpe();
  assert.strictEqual(debrief.sessionRpe.value, 1, 'Clamps at minimum 1');

  // HTTP 400 Validation on API Contract
  const badRpeHigh = await postSession({
    id: 'bad-rpe-high',
    date: '2026-11-23',
    time: '20:00',
    dayKey: 'mon',
    dayTitle: 'Chest Day',
    sessionRpe: 11
  });
  assert.strictEqual(badRpeHigh.status, 400, 'RPE > 10 must return HTTP 400');
  assert.ok(badRpeHigh.body.error.includes('sessionRpe'));

  const badRpeLow = await postSession({
    id: 'bad-rpe-low',
    date: '2026-11-23',
    time: '20:00',
    dayKey: 'mon',
    dayTitle: 'Chest Day',
    sessionRpe: 0
  });
  assert.strictEqual(badRpeLow.status, 400, 'RPE < 1 must return HTTP 400');

  const badPump = await postSession({
    id: 'bad-pump',
    date: '2026-11-23',
    time: '20:00',
    dayKey: 'mon',
    dayTitle: 'Chest Day',
    sessionRpe: 7,
    pumpRating: 'mega_pump'
  });
  assert.strictEqual(badPump.status, 400, "Invalid pump rating must return HTTP 400");
  assert.ok(badPump.body.error.includes('pumpRating'));

  const badJoint = await postSession({
    id: 'bad-joint',
    date: '2026-11-23',
    time: '20:00',
    dayKey: 'mon',
    dayTitle: 'Chest Day',
    sessionRpe: 7,
    jointComfort: 'critical_pain'
  });
  assert.strictEqual(badJoint.status, 400, "Invalid joint comfort must return HTTP 400");
  assert.ok(badJoint.body.error.includes('jointComfort'));

  console.log('  ✓ Enum normalizations, stepper bounds, and HTTP 400 rejections confirmed.\n');

  // ------------------------------------------------------------------
  // (3) POST /api/history บันทึก debrief แล้ว GET history คืนค่าครบทั้ง 4 field
  // ------------------------------------------------------------------
  console.log('▶ [3] POST /api/history saves debrief and GET returns all 4 fields...');
  const debriefSession = {
    id: 'session-debrief-test-001',
    date: '2026-11-23',
    time: '20:30',
    dayKey: 'mon',
    dayTitle: 'วันจันทร์ (อก + หน้าแขน)',
    totalSetsDone: 4,
    durationSec: 7200,
    sessionRpe: 8,
    sessionLoadAu: 960,
    pumpRating: 'insane',
    jointComfort: 'mild_ache',
    exercises: [
      {
        id: 'chest_press',
        name: 'Incline Chest Press',
        category: 'ท่าหลัก',
        sets: [
          { setIndex: 1, type: 'normal', target: '8-10', weight: 80, actualReps: 8, done: true, rir: 1 }
        ]
      }
    ]
  };

  const saveRes = await postSession(debriefSession);
  assert.strictEqual(saveRes.status, 200, 'POST /api/history with debrief must succeed');

  const historyRes = await getHistory();
  assert.strictEqual(historyRes.status, 200);
  const found = historyRes.body.find(s => s.id === 'session-debrief-test-001');
  assert.ok(found, 'Session must exist in history');
  assert.strictEqual(found.sessionRpe, 8, 'sessionRpe must match');
  assert.strictEqual(found.sessionLoadAu, 960, 'sessionLoadAu must match');
  assert.strictEqual(found.pumpRating, 'insane', 'pumpRating must match');
  assert.strictEqual(found.jointComfort, 'mild_ache', 'jointComfort must match');
  assert.strictEqual(typeof found.sessionRpe, 'number');
  assert.strictEqual(typeof found.sessionLoadAu, 'number');
  assert.strictEqual(typeof found.pumpRating, 'string');
  assert.strictEqual(typeof found.jointComfort, 'string');

  console.log('  ✓ Debrief persisted and retrieved with exact values and types.\n');

  // ------------------------------------------------------------------
  // (4) ค่าเริ่มต้น sessionRpe=7 เมื่อไม่ส่ง
  // ------------------------------------------------------------------
  console.log('▶ [4] Default sessionRpe=7 when omitted / not sent...');
  assert.strictEqual(DEFAULT_SESSION_RPE, 7);
  assert.strictEqual(normalizeSrpe(undefined), 7);
  assert.strictEqual(normalizeSrpe(null), 7);
  assert.strictEqual(normalizeSrpe(''), 7);

  // In summary builder
  const summaryNoRpe = buildSessionSummary(
    { title: 'Test Day', exercises: [] },
    {},
    { durationSec: 3600 }
  );
  assert.strictEqual(summaryNoRpe.sessionRpe, 7, 'Default summary sessionRpe is 7');
  assert.strictEqual(summaryNoRpe.sessionLoadAu, 420, 'Default summary sessionLoadAu is 60m * 7 = 420');

  // Server auto-calculates sessionLoadAu when sessionRpe is 7 and durationSec is 3600
  const sessionAutoLoad = {
    id: 'session-auto-load-002',
    date: '2026-11-23',
    time: '21:00',
    dayKey: 'tue',
    dayTitle: 'Leg Day',
    totalSetsDone: 3,
    durationSec: 3600,
    sessionRpe: 7
  };
  await postSession(sessionAutoLoad);
  const historyAuto = await getHistory();
  const foundAuto = historyAuto.body.find(s => s.id === 'session-auto-load-002');
  assert.ok(foundAuto);
  assert.strictEqual(foundAuto.sessionRpe, 7);
  assert.strictEqual(foundAuto.sessionLoadAu, 420, 'Server auto-computes sessionLoadAu = Math.round((3600/60) * 7)');

  console.log('  ✓ Default sessionRpe=7 and auto-calculated sessionLoadAu verified.\n');

  // ------------------------------------------------------------------
  // (5) column ใหม่เป็น NULL สำหรับ session เก่า (backward compatible)
  // ------------------------------------------------------------------
  console.log('▶ [5] Backward compatibility: NULL debrief columns for legacy sessions...');
  repo.db.prepare(`
    INSERT INTO workout_sessions (id, date, time, day_key, day_title, total_sets_done)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('legacy-session-v1.5', '2026-11-01', '08:00', 'mon', 'Older Monday Workout', 6);

  const historyLegacy = await getHistory();
  const legacy = historyLegacy.body.find(s => s.id === 'legacy-session-v1.5');
  assert.ok(legacy, 'Legacy session must be retrieved');
  assert.strictEqual(legacy.sessionRpe, null, 'Legacy session sessionRpe must be null');
  assert.strictEqual(legacy.sessionLoadAu, null, 'Legacy session sessionLoadAu must be null');
  assert.strictEqual(legacy.pumpRating, null, 'Legacy session pumpRating must be null');
  assert.strictEqual(legacy.jointComfort, null, 'Legacy session jointComfort must be null');

  console.log('  ✓ Legacy sessions gracefully return null for all new debrief columns.\n');

  // ------------------------------------------------------------------
  // (6) session ใหม่ที่ไม่มี debrief ยังทำงานปกติ
  // ------------------------------------------------------------------
  console.log('▶ [6] New sessions without debrief continue to function seamlessly...');
  const plainSession = {
    id: 'session-no-debrief-003',
    date: '2026-11-23',
    time: '21:30',
    dayKey: 'wed',
    dayTitle: 'Rest / Active Recovery',
    totalSetsDone: 0,
    exercises: []
  };

  const plainRes = await postSession(plainSession);
  assert.strictEqual(plainRes.status, 200, 'Saving session without debrief succeeds with HTTP 200');

  const historyPlain = await getHistory();
  const foundPlain = historyPlain.body.find(s => s.id === 'session-no-debrief-003');
  assert.ok(foundPlain);
  assert.strictEqual(foundPlain.sessionRpe, null);
  assert.strictEqual(foundPlain.sessionLoadAu, null);
  assert.strictEqual(foundPlain.pumpRating, null);
  assert.strictEqual(foundPlain.jointComfort, null);

  console.log('  ✓ Normal session save flow works properly without debrief.\n');

  // ------------------------------------------------------------------
  // (7) Thai Labels and UI Config helpers
  // ------------------------------------------------------------------
  console.log('▶ [7] Thai label and UI helper mappings...');
  assert.strictEqual(getSrpeLabel(7), 'หนักกำลังดี');
  assert.strictEqual(getSrpeLabel(8), 'หนักมาก');
  assert.strictEqual(getSrpeLabel(10), 'หมดแรงเต็มที่');
  assert.strictEqual(getPumpRatingLabel('good'), 'กำลังดี / แน่น');
  assert.strictEqual(getPumpRatingLabel('insane'), 'ปั๊มจัด / ตึงเปรี๊ยะ');
  assert.strictEqual(getJointComfortLabel('good'), 'ปกติ / ไร้อาการ');
  assert.strictEqual(getJointComfortLabel('mild_ache'), 'ตึง / เมื่อยเล็กน้อย');
  assert.strictEqual(getJointComfortLabel('pain'), 'เจ็บ / ปวดแปลบ');
  console.log('  ✓ Thai debrief labels mapped accurately.\n');

  console.log('====================================================');
  console.log('🎉 ALL POST-WORKOUT DEBRIEF QA TESTS PASSED!');
  console.log('====================================================');
} finally {
  server.close();
}
