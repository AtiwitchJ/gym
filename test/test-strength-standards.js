import assert from 'node:assert';

/**
 * QA Test: Strength Standards calculation engine (pure functions, no DB, no clock).
 * Covers tier boundaries, warm-up exclusion, next-level distance, balance and empty state.
 */

const {
  LEVELS,
  BENCHMARKS,
  benchmarkFor,
  levelInfo,
  round,
  buildStrengthStandards
} = await import('../server/strength-standards.js');
const { calculateEstimated1RM } = await import('../server/estimate.js');

console.log('====================================================');
console.log('🧪 QA Test: Strength Standards calculation engine');
console.log('====================================================\n');

const BW = 70;
const bench = BENCHMARKS.find((b) => b.id === 'bench');
const row = (exerciseId, weight, reps, type = 'normal', extra = {}) => ({
  exerciseId,
  exerciseName: exerciseId.replace(/_/g, ' '),
  done: 1,
  type,
  weight,
  actualReps: reps,
  ...extra
});

try {
  // 1. Empty / invalid body weight -> unrated, no throw (Test 1).
  console.log('▶ [1] Empty and invalid body weight...');
  for (const bw of [null, undefined, 0, -5, 19, 'abc']) {
    const empty = buildStrengthStandards({ bodyWeight: bw, rows: [row('barbell_bench_press', 80, 5)] });
    assert.strictEqual(empty.hasBodyWeight, false);
    assert.strictEqual(empty.bodyWeight, null);
    assert.strictEqual(empty.overall.level, 'unrated');
    assert.strictEqual(empty.overall.strengthScore, 0);
    assert.strictEqual(empty.overall.balance, null);
    assert.deepStrictEqual(empty.benchmarks, []);
    assert.strictEqual(empty.hasWorkouts, true);
  }
  console.log('  ✓ null/0/negative/under-20/text -> 200-style unrated payload.\n');

  // 2. Ratio & tier boundary precision (Test 2).
  console.log('▶ [2] Tier boundaries for a 70 kg lifter (bench: .60/.80/1.05/1.40)...');
  const boundaryCases = [
    [41, 'untrained'],
    [45, 'novice'],
    [60, 'intermediate'],
    [80, 'advanced'],
    [105, 'elite']
  ];
  for (const [weight, expected] of boundaryCases) {
    const ratio = round(weight / BW, 2);
    assert.strictEqual(levelInfo(ratio, bench.thresholds).idx, LEVELS.indexOf(expected), `ratio ${ratio}`);
  }
  // Same five cases through the full engine. rir:-1 with 1 rep keeps e1RM === weight,
  // matching the spec's "41 kg -> ratio 0.58" boundary fixtures exactly.
  const byWeight = new Map(boundaryCases.map(([weight, expected]) => {
    const e1rm = calculateEstimated1RM(weight, 1, -1);
    return [weight, { expected, e1rm }];
  }));
  for (const [weight, { expected, e1rm }] of byWeight) {
    const full = buildStrengthStandards({ bodyWeight: BW, rows: [row('barbell_bench_press', weight, 1, 'normal', { rir: -1 })] });
    assert.strictEqual(full.benchmarks.length, 1);
    assert.strictEqual(full.benchmarks[0].bestE1rm, e1rm);
    assert.strictEqual(full.benchmarks[0].level, expected, `${weight} kg -> ${expected}`);
    assert.strictEqual(full.benchmarks[0].ratio, round(e1rm / BW, 2));
  }
  console.log('  ✓ 41/45/60/80/105 kg land on untrained/novice/intermediate/advanced/elite.\n');

  // 3. Warm-up sets excluded from best e1RM (Test 3).
  console.log('▶ [3] Warm-up set exclusion...');
  const withWarmup = buildStrengthStandards({
    bodyWeight: BW,
    rows: [
      row('barbell_bench_press', 100, 10, 'warmup'),
      row('barbell_bench_press', 60, 5, 'normal')
    ]
  });
  const expectedWorkingE1rm = calculateEstimated1RM(60, 5);
  assert.strictEqual(withWarmup.benchmarks[0].bestE1rm, expectedWorkingE1rm);
  assert.strictEqual(withWarmup.benchmarks[0].bestWeight, 60);
  assert.strictEqual(withWarmup.benchmarks[0].bestReps, 5);
  console.log('  ✓ 100x10 warm-up ignored; 60x5 kept as the PR.\n');

  // 4. Distance to next level (Test 4). Spec example: BW 70, e1RM 50 -> intermediate gate 56 kg -> 6.0 kg.
  console.log('▶ [4] Distance to next level...');
  const lifter = buildStrengthStandards({
    bodyWeight: BW,
    rows: [row('barbell_bench_press', 50, 1, 'normal', { rir: -1 })]
  });
  const b = lifter.benchmarks[0];
  assert.strictEqual(b.bestE1rm, 50);
  assert.strictEqual(b.level, 'novice');
  assert.strictEqual(b.nextLevel, 'intermediate');
  assert.strictEqual(b.thresholds.intermediate, 56);
  assert.strictEqual(b.kgToNextLevel, 6);
  assert.ok(b.progressPct > 0 && b.progressPct < 100);
  console.log('  ✓ 50 kg -> 6.0 kg short of intermediate (56 kg).\n');

  // 5. Muscle-balance detection (Test 5): push >> pull -> laggingGroup pull.
  console.log('▶ [5] Push/Pull balance detection...');
  const imbalanced = buildStrengthStandards({
    bodyWeight: BW,
    rows: [
      row('barbell_bench_press', 100, 1),
      row('lat_pulldown_machine', 20, 1)
    ]
  });
  const balance = imbalanced.overall.balance;
  assert.ok(balance, 'balance present when benchmarks exist');
  assert.strictEqual(balance.dominantGroup, 'push');
  assert.strictEqual(balance.laggingGroup, 'pull');
  assert.ok(balance.pushScore - balance.pullScore > 15, 'gap exceeds 15 points');
  assert.match(balance.recommendationTh, /ดึง|Pull/);
  assert.strictEqual(balance.legsScore, 0);
  console.log(`  ✓ push ${balance.pushScore} vs pull ${balance.pullScore} -> lagging 'pull'.\n`);

  // 6. Exercise mapping + benchmark schema + rounding.
  console.log('▶ [6] Exercise mapping and benchmark schema...');
  const mapping = {
    barbell_bench_press: 'bench',
    overhead_barbell_press: 'ohp',
    lat_pulldown_machine: 'lat',
    seated_cable_row: 'row',
    seated_leg_press: 'squat',
    barbell_deadlift: 'deadlift'
  };
  for (const [exerciseId, expected] of Object.entries(mapping)) {
    assert.strictEqual(benchmarkFor({ exerciseId }).id, expected, exerciseId);
  }
  const schema = [
    'bestE1rm', 'bestReps', 'bestWeight', 'category', 'displayNameTh', 'exerciseId',
    'icon', 'kgToNextLevel', 'level', 'levelLabelTh', 'nextLevel', 'nextLevelLabelTh',
    'progressPct', 'ratio', 'thresholds'
  ];
  for (const b of buildStrengthStandards({ bodyWeight: 72, rows: [row('barbell_bench_press', 90, 2)] }).benchmarks) {
    assert.deepStrictEqual(Object.keys(b).sort(), schema.sort());
    assert.deepStrictEqual(Object.keys(b.thresholds).sort(), ['advanced', 'elite', 'intermediate', 'novice', 'untrained']);
    assert.ok(b.ratio > 0 && b.progressPct >= 0 && b.progressPct <= 100);
  }
  assert.strictEqual(round(1.2345, 2), 1.23);
  console.log('  ✓ six archetypes mapped; 15 fields + 5 thresholds typed and finite.\n');

  console.log('\n====================================================');
  console.log('🎉 ALL STRENGTH STANDARDS UNIT TESTS PASSED!');
  console.log('====================================================\n');
} catch (err) {
  console.error('❌ STRENGTH STANDARDS UNIT TEST FAILED:', err);
  process.exit(1);
}
