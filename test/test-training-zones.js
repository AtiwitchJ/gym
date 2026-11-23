import assert from 'node:assert';
const mod = await import('../server/training-zones.js');
const { ZONES, MAX_E1RM_KG, normalizeE1rm, roundToHalf, buildTrainingZones, zoneFor } = mod.default || mod;

console.log('====================================================');
console.log('🧪 QA Test: %1RM Training Zones (pure logic)');
console.log('====================================================\n');

// 1. Zone definitions: 4 zones, ascending, non-overlapping, rep bands descending.
console.log('▶ [1] Zone definitions...');
assert.strictEqual(ZONES.length, 4);
assert.deepStrictEqual(ZONES.map((z) => z.id), ['endurance', 'hypertrophy', 'strength', 'peaking']);
for (let i = 0; i < ZONES.length; i += 1) {
  const z = ZONES[i];
  assert.ok(z.pctMin < z.pctMax, `${z.id}: pctMin < pctMax`);
  assert.ok(z.repMin < z.repMax, `${z.id}: repMin < repMax`);
  assert.ok(z.nameTh.trim() && z.icon.trim() && z.focusTh.trim(), `${z.id}: display fields present`);
  if (i > 0) {
    assert.ok(ZONES[i - 1].pctMax < z.pctMin, `${z.id}: does not overlap previous zone`);
    assert.ok(ZONES[i - 1].repMin > z.repMin, `${z.id}: fewer reps than previous zone`);
  }
}
console.log('  ✓ 4 ordered, non-overlapping zones with Thai labels.\n');

// 2. Exact weight math at e1RM = 100 kg.
console.log('▶ [2] Weight bands at e1RM = 100 kg...');
const r100 = buildTrainingZones(100);
assert.strictEqual(r100.e1rm, 100);
assert.deepStrictEqual(
  r100.zones.map((z) => [z.weightMin, z.weightMax, z.targetWeight]),
  [[50, 60, 55], [65, 75, 70], [80, 90, 85], [92, 100, 96]]
);
assert.deepStrictEqual(
  r100.zones.map((z) => [z.pctMin, z.pctMax, z.repMin, z.repMax]),
  [[50, 60, 15, 20], [65, 75, 8, 12], [80, 90, 4, 6], [92, 100, 1, 3]]
);
console.log('  ✓ Bands and targets match the standard intensity table.\n');

// 3. Rounding to nearest 0.5 kg (dumbbells + plates).
console.log('▶ [3] Loads rounded to nearest 0.5 kg...');
assert.strictEqual(roundToHalf(40.2), 40);
assert.strictEqual(roundToHalf(36.85), 37);
assert.strictEqual(roundToHalf(33.5), 33.5);
const r67 = buildTrainingZones(67);
const end = r67.zones[0];
assert.strictEqual(end.weightMin, 33.5); // 67 * 0.50
assert.strictEqual(end.weightMax, 40);   // 67 * 0.60 = 40.2 -> 40
assert.strictEqual(end.targetWeight, 37); // 67 * 0.55 = 36.85 -> 37
assert.ok(r67.zones.every((z) => Number.isInteger(z.weightMin * 2) && Number.isInteger(z.targetWeight * 2)));
console.log('  ✓ All weights are multiples of 0.5 kg.\n');

// 4. Invalid e1RM rejected consistently.
console.log('▶ [4] Invalid e1RM rejected...');
for (const bad of [0, -5, NaN, Infinity, 'abc', '', null, undefined, MAX_E1RM_KG + 1]) {
  assert.strictEqual(normalizeE1rm(bad), null, `normalizeE1rm(${String(bad)})`);
  assert.throws(() => buildTrainingZones(bad), /e1rm must be a finite number/, `buildTrainingZones(${String(bad)})`);
}
assert.strictEqual(normalizeE1rm('100'), 100);
assert.strictEqual(normalizeE1rm(MAX_E1RM_KG), MAX_E1RM_KG);
console.log('  ✓ Only finite 0 < e1RM <= 1000 accepted; string numbers coerced.\n');

// 5. zoneFor mapping, including intentional gaps.
console.log('▶ [5] zoneFor mapping...');
assert.strictEqual(zoneFor(100, 50), 'endurance');
assert.strictEqual(zoneFor(100, 60), 'endurance');
assert.strictEqual(zoneFor(100, 70), 'hypertrophy');
assert.strictEqual(zoneFor(100, 85), 'strength');
assert.strictEqual(zoneFor(100, 100), 'peaking');
assert.strictEqual(zoneFor(100, 62), null, 'gap between endurance and hypertrophy');
assert.strictEqual(zoneFor(100, 91), null, 'gap between strength and peaking');
assert.strictEqual(zoneFor(0, 50), null);
assert.strictEqual(zoneFor(100, -10), null);
console.log('  ✓ In-band loads map; gap loads return null.\n');

// 6. Summary consistency across scales.
console.log('▶ [6] Summary consistency...');
for (const e of [40, 100, 250, 1000]) {
  const out = buildTrainingZones(e);
  assert.strictEqual(out.summary.zoneCount, 4);
  assert.strictEqual(out.summary.minWeight, out.zones[0].weightMin);
  assert.strictEqual(out.summary.maxWeight, out.zones[3].weightMax);
  for (const z of out.zones) {
    assert.ok(z.weightMin <= z.targetWeight && z.targetWeight <= z.weightMax, `${e}kg ${z.id}`);
    assert.strictEqual(z.targetPct, (z.pctMin + z.pctMax) / 2);
  }
  for (let i = 1; i < out.zones.length; i += 1) {
    assert.ok(out.zones[i].weightMin > out.zones[i - 1].weightMax, `${e}kg monotonic bands`);
  }
}
console.log('  ✓ Summary, targets and band ordering hold at every scale.\n');

console.log('\n====================================================');
console.log('🎉 ALL TRAINING ZONES PURE TESTS PASSED!');
console.log('====================================================\n');
