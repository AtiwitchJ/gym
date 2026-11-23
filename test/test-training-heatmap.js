import assert from 'node:assert';

/**
 * QA Test: pure training-heatmap logic — windowing, streaks, distributions and
 * warmup exclusion. No database access; safe under GYM_FORBID_REAL_DB=1.
 */
const heatmap = await import('../server/training-heatmap.js');

console.log('====================================================');
console.log('🧪 QA Test: Training heatmap pure logic');
console.log('====================================================\n');

const NOW = new Date(2026, 10, 24, 12, 0, 0); // Tue 24 Nov 2026, local

function session(id, date, sets) {
  return {
    id,
    date,
    time: '10:00',
    totalSetsDone: sets.filter((s) => s.done && !heatmap.isWarmupType(s.type)).length,
    exercises: [{ id: 'ex_main', name: 'Bench', category: 'ท่าหลัก', sets }]
  };
}

try {
  // 1. Window clamping & date helpers.
  console.log('▶ [1] Window clamping & date helpers...');
  assert.strictEqual(heatmap.normalizeDays(undefined), 365);
  assert.strictEqual(heatmap.normalizeDays(0), 365);
  assert.strictEqual(heatmap.normalizeDays(10), 30);
  assert.strictEqual(heatmap.normalizeDays(999), 365);
  assert.strictEqual(heatmap.normalizeDays(60), 60);
  assert.strictEqual(heatmap.toLocalDateStr(NOW), '2026-11-24');
  assert.strictEqual(heatmap.isValidDateStr('2026-02-30'), false);
  assert.strictEqual(heatmap.parseDateStr('2026-11-24').getDay(), 2);
  console.log('  ✓ days clamped to 30–365; local dates and calendar validation work.\n');

  // 2. Empty input → full empty schema, never throws.
  console.log('▶ [2] Empty history...');
  const empty = heatmap.buildTrainingHeatmap([], NOW);
  assert.deepStrictEqual(Object.keys(empty).sort(), [
    'days', 'leadingBlanks', 'monthlyDistribution', 'range', 'summary', 'weekdayDistribution', 'weeks'
  ]);
  assert.strictEqual(empty.range.start, '2025-11-25');
  assert.strictEqual(empty.range.end, '2026-11-24');
  assert.strictEqual(empty.days.length, 365);
  assert.ok(empty.days.every((d) => d.sessions === 0 && d.sets === 0 && d.level === 0));
  assert.strictEqual(empty.summary.activeDays, 0);
  assert.strictEqual(empty.summary.currentStreakDays, 0);
  assert.strictEqual(empty.summary.coveragePct, 0);
  assert.strictEqual(empty.weekdayDistribution.length, 7);
  assert.deepStrictEqual(empty.monthlyDistribution, []);
  assert.ok(empty.weeks.every((w) => w.length === 7));
  assert.strictEqual(heatmap.buildTrainingHeatmap(null, NOW).days.length, 365);
  console.log('  ✓ 365 zeroed cells, no crash, 7 weekday buckets, 7-cell weeks.\n');

  // 3. Seeded history with warmup, junk dates and out-of-range rows.
  console.log('▶ [3] Aggregation, streaks & warmup exclusion...');
  const history = [
    session('s1', '2026-11-24', [
      { setIndex: 1, type: 'warm', done: true, weight: 20, actualReps: 10 },
      { setIndex: 2, type: 'work', done: true, weight: 100, actualReps: 8 },
      { setIndex: 3, type: 'work', done: true, weight: 50, actualReps: 10 },
      { setIndex: 4, type: 'work', done: false, weight: 999, actualReps: 10 }
    ]),
    session('s2', '2026-11-23', [
      { setIndex: 1, type: 'work', done: true, weight: 60, actualReps: 8 }
    ]),
    session('s3', '2026-11-20', [
      ...Array.from({ length: 3 }, (_, i) => ({
        setIndex: i + 1, type: 'work', done: true, weight: 40, actualReps: 10
      }))
    ]),
    session('s4', '2026-11-19', [
      { setIndex: 1, type: 'work', done: true, weight: 80, actualReps: 5 }
    ]),
    session('s5', '2026-10-15', [
      { setIndex: 1, type: 'work', done: true, weight: 80, actualReps: 5 }
    ]),
    session('bad', 'not-a-date', []),
    session('old', '2024-01-01', [])
  ];
  const result = heatmap.buildTrainingHeatmap(history, NOW, 60);
  assert.strictEqual(result.range.days, 60);
  assert.strictEqual(result.range.start, '2026-09-26');
  const today = result.days.find((d) => d.date === '2026-11-24');
  assert.deepStrictEqual(today, { date: '2026-11-24', sessions: 1, sets: 2, volumeKg: 1300, level: 1 });
  assert.strictEqual(result.summary.totalSessions, 5, 'junk + out-of-range rows ignored');
  assert.strictEqual(result.summary.activeDays, 5);
  assert.strictEqual(result.summary.totalSets, 8, '2+1+3+1+1 working sets');
  assert.strictEqual(result.summary.currentStreakDays, 2, '23–24 Nov');
  assert.strictEqual(result.summary.bestStreakDays, 2, '19–20 and 23–24 Nov');
  assert.strictEqual(result.summary.lastActiveDate, '2026-11-24');
  assert.strictEqual(result.summary.mostActiveDate, '2026-11-20');
  assert.strictEqual(result.summary.avgSetsPerActiveDay, 1.6);
  console.log('  ✓ Warmup/unfinished sets excluded; streaks and aggregates exact.\n');

  // 4. Intensity thresholds produce only levels 0–4.
  console.log('▶ [4] Intensity levels...');
  assert.strictEqual(heatmap.intensityLevel(0), 0);
  assert.strictEqual(heatmap.intensityLevel(1), 1);
  assert.strictEqual(heatmap.intensityLevel(2), 1);
  assert.strictEqual(heatmap.intensityLevel(3), 2);
  assert.strictEqual(heatmap.intensityLevel(8), 3);
  assert.strictEqual(heatmap.intensityLevel(15), 4);
  assert.strictEqual(heatmap.intensityLevel(30), 4);
  console.log('  ✓ 1–2 / 3–7 / 8–14 / ≥15 sets map to shades 1–4.\n');

  // 5. Current streak survives a not-yet-logged today.
  console.log('▶ [5] Yesterday-anchored streak...');
  const withoutToday = history.filter((h) => h.id !== 's1');
  const anchored = heatmap.buildTrainingHeatmap(withoutToday, NOW, 30);
  assert.strictEqual(anchored.summary.currentStreakDays, 1, 'only 23 Nov remains');
  assert.strictEqual(anchored.days.find((d) => d.date === '2026-11-24').sessions, 0);
  console.log('  ✓ A quiet today does not break yesterday\'s streak.\n');

  // 6. Weekday + monthly distributions use Thai labels and correct buckets.
  console.log('▶ [6] Distributions...');
  assert.strictEqual(result.weekdayDistribution.length, 7);
  assert.strictEqual(result.weekdayDistribution[0].labelTh, 'จ.');
  assert.strictEqual(result.weekdayDistribution[6].labelTh, 'อา.');
  const byDay = Object.fromEntries(result.weekdayDistribution.map((w) => [w.day, w.sessions]));
  // 24 Nov = Tue (index 1), 23 Nov = Mon (0), 20 Nov = Fri (4), 19 Nov = Thu (3), 15 Oct = Thu (3)
  assert.strictEqual(byDay[1], 1);
  assert.strictEqual(byDay[0], 1);
  assert.strictEqual(byDay[4], 1);
  assert.strictEqual(byDay[3], 2);
  assert.deepStrictEqual(result.monthlyDistribution, [
    { month: '2026-10', labelTh: 'ต.ค. 2569', sessions: 1, sets: 1 },
    { month: '2026-11', labelTh: 'พ.ย. 2569', sessions: 4, sets: 7 }
  ]);
  console.log('  ✓ Monday-first weekdays and chronological Thai-month roll-up.\n');

  console.log('\n====================================================');
  console.log('🎉 ALL TRAINING HEATMAP PURE TESTS PASSED!');
  console.log('====================================================\n');
} catch (err) {
  console.error('\n✗ TRAINING HEATMAP PURE TEST FAILED:', err.message);
  process.exit(1);
}
