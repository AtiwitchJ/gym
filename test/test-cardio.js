import assert from 'node:assert';

/**
 * QA Test: pure cardio logic — validation, MET estimation and weekly roll-up.
 * No database access; safe under GYM_FORBID_REAL_DB=1.
 */
const cardio = await import('../server/cardio.js');

console.log('====================================================');
console.log('🧪 QA Test: Cardio pure logic');
console.log('====================================================\n');

try {
  // 1. Type catalogue.
  console.log('▶ [1] Cardio type catalogue...');
  assert.strictEqual(cardio.CARDIO_TYPES.length, 8);
  assert.strictEqual(new Set(cardio.CARDIO_TYPES.map((t) => t.id)).size, 8);
  assert.ok(cardio.CARDIO_TYPES.every((t) => t.id && t.labelTh && t.icon && t.met > 0));
  assert.strictEqual(cardio.normalizeType('run').id, 'run');
  assert.strictEqual(cardio.normalizeType(' RUN ').id, 'run');
  assert.strictEqual(cardio.normalizeType('nope'), null);
  console.log('  ✓ 8 unique types with Thai labels, icons and MET values.\n');

  // 2. Valid payload normalization.
  console.log('▶ [2] Payload validation (valid)...');
  const clean = cardio.validateCardioPayload({
    date: '2026-11-24',
    type: 'cycle',
    durationMin: 45.6,
    distanceKm: 12.345,
    calories: 320.7,
    note: 'around the block'
  });
  assert.deepStrictEqual(clean, {
    date: '2026-11-24',
    type: 'cycle',
    durationMin: 46,
    distanceKm: 12.35,
    calories: 321,
    note: 'around the block'
  });
  const minimal = cardio.validateCardioPayload({ type: 'walk', durationMin: 20 });
  assert.strictEqual(minimal.type, 'walk');
  assert.strictEqual(minimal.durationMin, 20);
  assert.strictEqual(minimal.distanceKm, null);
  assert.strictEqual(minimal.calories, null);
  assert.strictEqual(minimal.note, '');
  assert.match(minimal.date, /^\d{4}-\d{2}-\d{2}$/, 'missing date defaults to today');
  console.log('  ✓ Normalizes/rounds fields; missing date defaults to today.\n');

  // 3. Invalid payloads return a 400-style error, never a generic crash.
  console.log('▶ [3] Payload validation (invalid → status 400)...');
  const badPayloads = [
    null,
    [],
    { durationMin: 30 },
    { type: 'teleport', durationMin: 30 },
    { type: 'run', durationMin: 0 },
    { type: 'run', durationMin: 601 },
    { type: 'run', durationMin: 'abc' },
    { type: 'run', durationMin: 30, date: '24-11-2026' },
    { type: 'run', durationMin: 30, date: '2026-13-01' },
    { type: 'run', durationMin: 30, distanceKm: -1 },
    { type: 'run', durationMin: 30, calories: 10001 }
  ];
  for (const p of badPayloads) {
    let threw = false;
    try {
      cardio.validateCardioPayload(p);
    } catch (err) {
      threw = true;
      assert.strictEqual(err.status, 400, `status for ${JSON.stringify(p)}`);
      assert.ok(err.message && err.message.trim());
    }
    assert.ok(threw, `should reject ${JSON.stringify(p)}`);
  }
  console.log(`  ✓ ${badPayloads.length} invalid payloads rejected with status 400.\n`);

  // 4. Date helpers & Monday-based week boundaries.
  console.log('▶ [4] Week boundaries...');
  const now = new Date(2026, 10, 24, 14, 30, 0); // Tue 24 Nov 2026, local
  assert.strictEqual(cardio.toLocalDateStr(now), '2026-11-24');
  assert.strictEqual(cardio.toLocalDateStr(cardio.startOfWeek(now)), '2026-11-23');
  assert.strictEqual(cardio.toLocalDateStr(cardio.addDays(cardio.startOfWeek(now), 6)), '2026-11-29');
  assert.strictEqual(cardio.isValidDateString('2026-02-30'), false);
  assert.strictEqual(cardio.isValidDateString('2026-02-28'), true);
  console.log('  ✓ Week = Mon 23 → Sun 29 Nov 2026; invalid calendar date rejected.\n');

  // 5. MET estimation vs explicit calories.
  console.log('▶ [5] Calorie estimation...');
  // 9.8 MET × 3.5 × 70 kg / 200 × 30 min = 360.15 → 360
  assert.strictEqual(cardio.effectiveCalories({ type: 'run', durationMin: 30, calories: null }), 360);
  assert.strictEqual(cardio.effectiveCalories({ type: 'run', durationMin: 30, calories: 250 }), 250);
  assert.strictEqual(cardio.effectiveCalories({ type: 'unknown', durationMin: 30, calories: null }), 0);
  assert.strictEqual(cardio.effectiveCalories(null), 0);
  console.log('  ✓ MET estimate for 30-min run = 360 kcal; explicit value wins.\n');

  // 6. Weekly roll-up with mixed rows (this week, last week, older).
  console.log('▶ [6] Weekly summary & deltas...');
  const sessions = [
    { id: 1, date: '2026-11-23', type: 'run', durationMin: 30, distanceKm: 5, calories: null },       // this week
    { id: 2, date: '2026-11-24', type: 'cycle', durationMin: 40, distanceKm: 12, calories: 300 },     // this week
    { id: 3, date: '2026-11-24', type: 'run', durationMin: 20, distanceKm: 3.5, calories: 200 },      // this week
    { id: 4, date: '2026-11-16', type: 'walk', durationMin: 25, distanceKm: 2, calories: null },      // last week
    { id: 5, date: '2026-11-20', type: 'run', durationMin: 35, distanceKm: 6, calories: null },       // last week
    { id: 6, date: '2026-11-01', type: 'swim', durationMin: 60, distanceKm: 1, calories: 500 }        // older
  ];
  const summary = cardio.buildCardioSummary(sessions, now);
  assert.deepStrictEqual(Object.keys(summary).sort(), [
    'allTime', 'byType', 'delta', 'lastWeek', 'thisWeek', 'weekEnd', 'weekStart'
  ]);
  assert.strictEqual(summary.weekStart, '2026-11-23');
  assert.strictEqual(summary.weekEnd, '2026-11-29');
  // this week: 3 sessions, 30+40+20=90 min, 5+12+3.5=20.5 km, 360+300+200=860 kcal
  assert.deepStrictEqual(summary.thisWeek, {
    sessions: 3, totalMinutes: 90, totalDistanceKm: 20.5, totalCalories: 860
  });
  // last week: 2 sessions, 25+35=60 min, 2+6=8 km, walk 25min→133 + run 35min→420 = 553
  const walkKcal = Math.round((3.8 * 3.5 * 70 * 25) / 200);
  const runKcal = Math.round((9.8 * 3.5 * 70 * 35) / 200);
  assert.deepStrictEqual(summary.lastWeek, {
    sessions: 2, totalMinutes: 60, totalDistanceKm: 8, totalCalories: walkKcal + runKcal
  });
  assert.deepStrictEqual(summary.delta, {
    sessions: 1, totalMinutes: 30, totalDistanceKm: 12.5,
    totalCalories: 860 - (walkKcal + runKcal)
  });
  assert.deepStrictEqual(summary.byType.map((t) => t.id), ['run', 'cycle']);
  assert.strictEqual(summary.byType.find((t) => t.id === 'run').totalCalories, 560);
  // all time: 6 sessions, 30+40+20+25+35+60 = 210 min
  assert.strictEqual(summary.allTime.sessions, 6);
  assert.strictEqual(summary.allTime.totalMinutes, 210);
  assert.strictEqual(summary.allTime.totalCalories, 860 + (walkKcal + runKcal) + 500);
  console.log('  ✓ thisWeek/lastWeek/delta/byType/allTime computed correctly.\n');

  // 7. Empty input is always safe.
  console.log('▶ [7] Empty state...');
  const empty = cardio.buildCardioSummary([], now);
  assert.strictEqual(empty.thisWeek.sessions, 0);
  assert.strictEqual(empty.lastWeek.sessions, 0);
  assert.strictEqual(empty.allTime.sessions, 0);
  assert.deepStrictEqual(empty.byType, []);
  assert.strictEqual(empty.delta.totalCalories, 0);
  console.log('  ✓ Empty input yields zeroed aggregates, no throw.\n');

  console.log('\n====================================================');
  console.log('🎉 ALL CARDIO PURE LOGIC TESTS PASSED!');
  console.log('====================================================\n');
} catch (err) {
  console.error('\n✗ CARDIO PURE LOGIC TEST FAILED:', err.message);
  console.error(err.stack);
  process.exit(1);
}
