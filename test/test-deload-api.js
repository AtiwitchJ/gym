import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * QA Test: Deload Week Detection & Volume/Intensity Tapering Advisor API
 * Spec reference: docs/DELOAD-ADVISOR-SPEC-20261123.md
 *
 * Covers:
 * (1) weekStart UTC Monday + 6-week window รวมสัปดาห์ว่าง (oldest -> current)
 * (2) sessionLoadAu null -> loadAu = 0 และ backward compatible กับ session เก่า
 * (3) workingSets นับเฉพาะ set done && !isWarmupSet
 * (4) acute / chronic / ACWR round2 + chronic = 0 -> acwr = null
 * (5) risingWeeks >= 4 -> signal 'rising_4w'
 * (6) status อื่น ๆ:
 *     - acwr > 1.5 -> deload (signal 'acwr_high')
 *     - jointComfort = 'pain' -> deload (signal 'joint_pain')
 *     - acwr < 0.8 -> push (signal 'low_acwr')
 *     - ข้อมูลว่าง -> hold ไม่แครช
 * (7) GET /api/deload ผ่าน temp DB ตอบ JSON ตรง schema ทุกฟิลด์ (200) + data/gym.db ปลอดภัย
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-deload-')), 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');
const deload = await import('../server/deload.js');
const { buildDeload, WEEKS_COUNT, round2 } = deload.default || deload;

const volume = await import('../server/volume.js');
const { weekStartOf, recentWeekStarts } = volume.default || volume;

const useDeloadMod = await import('../src/composables/useDeload.js');
const {
  normalizeDeload,
  acwrLabel,
  formatAcwr,
  getStatusMeta,
  DELOAD_STATUS_META,
  SIGNAL_META
} = useDeloadMod.default || useDeloadMod;

console.log('====================================================');
console.log('🧪 QA Test: Deload Week Detection & Tapering Advisor');
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

// Start test server
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const port = server.address().port;
const base = `http://127.0.0.1:${port}/api/deload`;

try {
  // ------------------------------------------------------------------
  // (1) weekStart UTC Monday + 6-week window รวมสัปดาห์ว่าง
  // ------------------------------------------------------------------
  console.log('▶ [1] weekStart UTC Monday + 6-week window (oldest -> current)...');
  assert.strictEqual(WEEKS_COUNT, 6);

  // Monday anchor test
  assert.strictEqual(weekStartOf('2026-11-23'), '2026-11-23', 'Monday is its own weekStart');
  assert.strictEqual(weekStartOf('2026-11-25'), '2026-11-23', 'Wednesday maps to Monday');
  assert.strictEqual(weekStartOf('2026-11-29'), '2026-11-23', 'Sunday maps to preceding Monday');
  assert.strictEqual(weekStartOf('invalid-date'), null, 'Invalid date returns null');

  const anchorMs = Date.parse('2026-11-23T12:00:00.000Z'); // Monday
  const expectedStarts = [
    '2026-10-19',
    '2026-10-26',
    '2026-11-02',
    '2026-11-09',
    '2026-11-16',
    '2026-11-23'
  ];
  const starts = recentWeekStarts(anchorMs, 6);
  assert.deepStrictEqual(starts, expectedStarts, 'recentWeekStarts produces 6 consecutive Monday dates');

  const emptyDeload = buildDeload([], anchorMs);
  assert.strictEqual(emptyDeload.weeks.length, 6);
  assert.deepStrictEqual(
    emptyDeload.weeks.map((w) => w.weekStart),
    expectedStarts,
    'Empty weeks preserve 6-week chronological starts'
  );
  emptyDeload.weeks.forEach((w) => {
    assert.strictEqual(w.sessions, 0);
    assert.strictEqual(w.loadAu, 0);
    assert.strictEqual(w.workingSets, 0);
  });
  console.log('  ✓ 6-week window with UTC Monday weekStart verified.\n');

  // ------------------------------------------------------------------
  // (2) sessionLoadAu null -> loadAu = 0 และ backward compatible กับ session เก่า
  // ------------------------------------------------------------------
  console.log('▶ [2] sessionLoadAu null / missing -> loadAu=0 & backward compatibility...');
  const legacySessions = [
    {
      id: 'legacy-1',
      date: '2026-11-23',
      sessionLoadAu: null,
      exercises: [{ sets: [{ done: true, type: 'normal' }] }]
    },
    {
      id: 'legacy-2',
      date: '2026-11-24',
      sessionLoadAu: undefined,
      exercises: [{ sets: [{ done: true, type: 'normal' }] }]
    },
    {
      id: 'legacy-3',
      date: '2026-11-25',
      sessionLoadAu: 0,
      exercises: [{ sets: [{ done: true, type: 'normal' }] }]
    },
    {
      id: 'legacy-4',
      date: '2026-11-26',
      sessionLoadAu: -100,
      exercises: [{ sets: [{ done: true, type: 'normal' }] }]
    },
    {
      id: 'modern-1',
      date: '2026-11-27',
      sessionLoadAu: 450,
      exercises: [{ sets: [{ done: true, type: 'normal' }] }]
    }
  ];

  const legacyRes = buildDeload(legacySessions, anchorMs);
  const currentWk = legacyRes.weeks[5];
  assert.strictEqual(currentWk.sessions, 5, 'All sessions counted regardless of loadAu presence');
  assert.strictEqual(currentWk.loadAu, 450, 'Only finite positive sessionLoadAu contributes to loadAu');
  console.log('  ✓ Legacy sessions with null/missing loadAu safely handled.\n');

  // ------------------------------------------------------------------
  // (3) workingSets นับเฉพาะ set done && !isWarmupSet
  // ------------------------------------------------------------------
  console.log('▶ [3] workingSets counts only completed non-warmup sets...');
  const workingSetsSession = [
    {
      id: 'set-filter-test',
      date: '2026-11-23',
      sessionLoadAu: 300,
      exercises: [
        {
          id: 'bench',
          sets: [
            { setIndex: 1, type: 'warm', done: true }, // warm-up, excluded
            { setIndex: 2, type: 'warmup', done: true }, // warm-up, excluded
            { setIndex: 3, type: 'normal', done: false }, // unticked, excluded
            { setIndex: 4, type: 'normal', done: true }, // counted! (1)
            { setIndex: 5, type: 'drop', done: true }, // counted! (2)
            { setIndex: 6, type: 'failure', done: true } // counted! (3)
          ]
        }
      ]
    }
  ];

  const wsRes = buildDeload(workingSetsSession, anchorMs);
  assert.strictEqual(wsRes.weeks[5].workingSets, 3, 'Exactly 3 completed working sets counted');
  console.log('  ✓ workingSets filtering matches specification (warmups and uncompleted excluded).\n');

  // ------------------------------------------------------------------
  // (4) acute / chronic / ACWR round2 + chronic = 0 -> acwr = null
  // ------------------------------------------------------------------
  console.log('▶ [4] acute / chronic / ACWR calculation and round2 precision...');
  // Chronic = mean of weeks[1..4]
  // Let weeks:
  // week 0 (10-19): 200 (ignored for chronic)
  // week 1 (10-26): 800
  // week 2 (11-02): 1000
  // week 3 (11-09): 1200
  // week 4 (11-16): 1400  -> sum = 4400, chronic = 4400/4 = 1100
  // week 5 (11-23): 1500  -> acute = 1500, ACWR = 1500 / 1100 = 1.3636... -> 1.36
  const acwrSessions = [
    { date: '2026-10-19', sessionLoadAu: 200 },
    { date: '2026-10-26', sessionLoadAu: 800 },
    { date: '2026-11-02', sessionLoadAu: 1000 },
    { date: '2026-11-09', sessionLoadAu: 1200 },
    { date: '2026-11-16', sessionLoadAu: 1400 },
    { date: '2026-11-23', sessionLoadAu: 1500 }
  ];

  const acwrRes = buildDeload(acwrSessions, anchorMs);
  assert.strictEqual(acwrRes.current.acuteLoadAu, 1500);
  assert.strictEqual(acwrRes.current.chronicLoadAu, 1100);
  assert.strictEqual(acwrRes.current.acwr, 1.36, '1500 / 1100 rounded to 2 decimals is 1.36');

  // chronic = 0 -> acwr = null
  const noChronicSessions = [
    { date: '2026-11-23', sessionLoadAu: 800 } // only current week has load
  ];
  const noChronicRes = buildDeload(noChronicSessions, anchorMs);
  assert.strictEqual(noChronicRes.current.acuteLoadAu, 800);
  assert.strictEqual(noChronicRes.current.chronicLoadAu, 0);
  assert.strictEqual(noChronicRes.current.acwr, null, 'chronicLoadAu = 0 yields acwr = null');
  console.log('  ✓ acute / chronic / ACWR math and chronic=0 null check verified.\n');

  // ------------------------------------------------------------------
  // (5) risingWeeks >= 4 -> signal 'rising_4w'
  // ------------------------------------------------------------------
  console.log('▶ [5] risingWeeks streak detection and rising_4w trigger...');
  // week 0: 450
  // week 1: 400 (dropped from week 0)
  // week 2: 500 (> 400) -> 1
  // week 3: 600 (> 500) -> 2
  // week 4: 700 (> 600) -> 3
  // week 5: 800 (> 700) -> 4
  const risingSessions = [
    { date: '2026-10-19', sessionLoadAu: 450 },
    { date: '2026-10-26', sessionLoadAu: 400 },
    { date: '2026-11-02', sessionLoadAu: 500 },
    { date: '2026-11-09', sessionLoadAu: 600 },
    { date: '2026-11-16', sessionLoadAu: 700 },
    { date: '2026-11-23', sessionLoadAu: 800 }
  ];

  const risingRes = buildDeload(risingSessions, anchorMs);
  assert.strictEqual(risingRes.current.risingWeeks, 4, 'risingWeeks is strictly 4');
  assert.ok(risingRes.recommendation.signals.includes('rising_4w'), 'signals includes rising_4w');
  assert.strictEqual(risingRes.recommendation.status, 'deload', 'rising_4w triggers deload recommendation');

  // Broken streak (equal value stops count)
  const plateauSessions = [
    { date: '2026-10-26', sessionLoadAu: 400 },
    { date: '2026-11-02', sessionLoadAu: 500 },
    { date: '2026-11-09', sessionLoadAu: 600 },
    { date: '2026-11-16', sessionLoadAu: 800 },
    { date: '2026-11-23', sessionLoadAu: 800 } // equal, not strictly greater
  ];
  const plateauRes = buildDeload(plateauSessions, anchorMs);
  assert.strictEqual(plateauRes.current.risingWeeks, 0, 'Plateau resets risingWeeks to 0');
  console.log('  ✓ risingWeeks consecutive check and rising_4w signal verified.\n');

  // ------------------------------------------------------------------
  // (6) Status triggers:
  //     - acwr > 1.5 -> deload ('acwr_high')
  //     - jointComfort = 'pain' -> deload ('joint_pain')
  //     - acwr < 0.8 -> push ('low_acwr')
  //     - empty / balanced -> hold
  // ------------------------------------------------------------------
  console.log('▶ [6] Deload / Push / Hold status decisions & signals...');

  // (6a) ACWR high (> 1.5)
  // chronic = 1000, acute = 1600 -> acwr = 1.6
  const highAcwrSessions = [
    { date: '2026-10-26', sessionLoadAu: 1000 },
    { date: '2026-11-02', sessionLoadAu: 1000 },
    { date: '2026-11-09', sessionLoadAu: 1000 },
    { date: '2026-11-16', sessionLoadAu: 1000 },
    { date: '2026-11-23', sessionLoadAu: 1600 }
  ];
  const highAcwrRes = buildDeload(highAcwrSessions, anchorMs);
  assert.strictEqual(highAcwrRes.current.acwr, 1.6);
  assert.ok(highAcwrRes.recommendation.signals.includes('acwr_high'));
  assert.strictEqual(highAcwrRes.recommendation.status, 'deload');

  // (6b) Joint pain in current or previous week -> deload
  const painSessions = [
    { date: '2026-10-26', sessionLoadAu: 1000 },
    { date: '2026-11-02', sessionLoadAu: 1000 },
    { date: '2026-11-09', sessionLoadAu: 1000 },
    { date: '2026-11-16', sessionLoadAu: 1000 },
    { date: '2026-11-23', sessionLoadAu: 1000, jointComfort: 'pain' }
  ];
  const painRes = buildDeload(painSessions, anchorMs);
  assert.ok(painRes.recommendation.signals.includes('joint_pain'));
  assert.strictEqual(painRes.recommendation.status, 'deload');

  // Pain in preceding week (index 4) also triggers
  const prevPainSessions = [
    { date: '2026-10-26', sessionLoadAu: 1000 },
    { date: '2026-11-02', sessionLoadAu: 1000 },
    { date: '2026-11-09', sessionLoadAu: 1000 },
    { date: '2026-11-16', sessionLoadAu: 1000, jointComfort: 'pain' },
    { date: '2026-11-23', sessionLoadAu: 1000 }
  ];
  const prevPainRes = buildDeload(prevPainSessions, anchorMs);
  assert.ok(prevPainRes.recommendation.signals.includes('joint_pain'));
  assert.strictEqual(prevPainRes.recommendation.status, 'deload');

  // (6c) Low ACWR (< 0.8) without deload signals -> push
  // chronic = 1000, acute = 600 -> acwr = 0.6
  const lowAcwrSessions = [
    { date: '2026-10-26', sessionLoadAu: 1000 },
    { date: '2026-11-02', sessionLoadAu: 1000 },
    { date: '2026-11-09', sessionLoadAu: 1000 },
    { date: '2026-11-16', sessionLoadAu: 1000 },
    { date: '2026-11-23', sessionLoadAu: 600 }
  ];
  const lowAcwrRes = buildDeload(lowAcwrSessions, anchorMs);
  assert.strictEqual(lowAcwrRes.current.acwr, 0.6);
  assert.ok(lowAcwrRes.recommendation.signals.includes('low_acwr'));
  assert.strictEqual(lowAcwrRes.recommendation.status, 'push');
  assert.strictEqual(lowAcwrRes.recommendation.labelTh, 'พร้อมเพิ่มโหลด');

  // (6d) Empty history -> hold with explanation, no crash
  const emptyRes = buildDeload([], anchorMs);
  assert.strictEqual(emptyRes.recommendation.status, 'hold');
  assert.strictEqual(emptyRes.recommendation.labelTh, 'รักษาจังหวะ');
  assert.ok(emptyRes.recommendation.reasonTh.includes('ข้อมูลยังไม่พอ'));
  assert.strictEqual(emptyRes.current.acwr, null);
  assert.strictEqual(emptyRes.current.risingWeeks, 0);

  // Taper contract constants
  assert.strictEqual(emptyRes.recommendation.taper.setReductionPct, 50);
  assert.strictEqual(emptyRes.recommendation.taper.targetRir, '3–4');
  assert.strictEqual(emptyRes.recommendation.taper.suggestedSetsPerExercise, 3);

  console.log('  ✓ Deload, Push, and Hold status rules and taper configs verified.\n');

  // ------------------------------------------------------------------
  // (7) GET /api/deload via temp DB responds 200 with complete JSON schema
  // ------------------------------------------------------------------
  console.log('▶ [7] HTTP GET /api/deload endpoint contract & schema conformance...');

  // Seed sample session into temp database
  repo.saveSession({
    id: 'deload-seed-session-1',
    date: '2026-11-23',
    time: '18:00',
    dayKey: 'mon',
    dayTitle: 'Mon Chest',
    totalSetsDone: 4,
    durationSec: 3600,
    sessionRpe: 8,
    sessionLoadAu: 480,
    pumpRating: 'good',
    jointComfort: 'good',
    exercises: [
      {
        id: 'bench',
        name: 'Bench Press',
        category: 'ท่าหลัก',
        sets: [
          { setIndex: 1, type: 'warm', done: true, target: '15', weight: 40, actualReps: 15 },
          { setIndex: 2, type: 'normal', done: true, target: '8-10', weight: 80, actualReps: 8 }
        ]
      }
    ]
  });

  const res = await fetch(base);
  assert.strictEqual(res.status, 200, 'GET /api/deload returns HTTP 200');
  const payload = await res.json();

  // Validate complete schema
  assert.ok(Array.isArray(payload.weeks), 'weeks is array');
  assert.strictEqual(payload.weeks.length, 6, 'weeks has 6 entries');
  for (const w of payload.weeks) {
    assert.strictEqual(typeof w.weekStart, 'string');
    assert.strictEqual(typeof w.sessions, 'number');
    assert.strictEqual(typeof w.loadAu, 'number');
    assert.strictEqual(typeof w.workingSets, 'number');
  }

  assert.ok(payload.current, 'current object exists');
  assert.strictEqual(typeof payload.current.weekStart, 'string');
  assert.strictEqual(typeof payload.current.acuteLoadAu, 'number');
  assert.strictEqual(typeof payload.current.chronicLoadAu, 'number');
  assert.ok(payload.current.acwr === null || typeof payload.current.acwr === 'number');
  assert.strictEqual(typeof payload.current.risingWeeks, 'number');

  assert.ok(payload.recommendation, 'recommendation object exists');
  assert.ok(['deload', 'hold', 'push'].includes(payload.recommendation.status));
  assert.strictEqual(typeof payload.recommendation.labelTh, 'string');
  assert.strictEqual(typeof payload.recommendation.reasonTh, 'string');
  assert.ok(Array.isArray(payload.recommendation.signals));
  assert.strictEqual(payload.recommendation.taper.setReductionPct, 50);
  assert.strictEqual(payload.recommendation.taper.targetRir, '3–4');
  assert.strictEqual(payload.recommendation.taper.suggestedSetsPerExercise, 3);

  // Client normalizer validation
  const normalized = normalizeDeload(payload);
  assert.strictEqual(normalized.weeks.length, 6);
  assert.ok(['deload', 'hold', 'push'].includes(normalized.recommendation.status));

  // UI helper validations
  assert.strictEqual(formatAcwr(null), '—');
  assert.strictEqual(formatAcwr(1.234), '1.23');
  assert.ok(acwrLabel(1.6).includes('สูงเกินเกณฑ์'));
  assert.ok(acwrLabel(0.6).includes('ต่ำกว่าปกติ'));
  assert.ok(acwrLabel(1.0).includes('สมดุลเหมาะสม'));

  assert.strictEqual(getStatusMeta('deload').id, 'deload');
  assert.strictEqual(getStatusMeta('push').id, 'push');
  assert.strictEqual(getStatusMeta('hold').id, 'hold');
  assert.strictEqual(getStatusMeta('unknown').id, 'hold');

  console.log('  ✓ GET /api/deload schema, client normalizer, and UI helpers fully verified.\n');

  console.log('====================================================');
  console.log('🎉 ALL DELOAD ADVISOR QA TESTS PASSED!');
  console.log('====================================================');
} finally {
  server.close();
}
