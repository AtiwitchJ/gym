import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Exercise supersets: create a group from 2+ exercises of one day, remove one member, list by day.
 * Uses a temp database (set before server/db.js loads), never data/gym.db.
 */

if (!process.env.GYM_DB_PATH) {
  process.env.GYM_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'gym-supersets-')), 'gym-test.db');
}
const { default: repo } = await import('../server/db.js');
const { default: app } = await import('../server/server.js');
const { validateCreateInput, validateDayKey, ValidationError } = await import('../server/supersets.js');

console.log('====================================================');
console.log('🧪 Test: Exercise supersets (create, remove, list)');
console.log('====================================================\n');

// 1. Validation (pure)
console.log('▶ [1] Input validation...');
assert.deepStrictEqual(validateCreateInput({ dayKey: 'mon', exerciseIds: ['a', ' b '] }), { dayKey: 'mon', exerciseIds: ['a', 'b'] });
assert.throws(() => validateCreateInput({ dayKey: 'Mon!', exerciseIds: ['a', 'b'] }), ValidationError);
assert.throws(() => validateCreateInput({ dayKey: 'mon', exerciseIds: ['a'] }), /at least 2/);
assert.throws(() => validateCreateInput({ dayKey: 'mon', exerciseIds: ['a', 'a'] }), /distinct/);
assert.throws(() => validateCreateInput({ dayKey: 'mon', exerciseIds: ['a', ''] }), /non-empty/);
assert.throws(() => validateCreateInput({ dayKey: 'mon', exerciseIds: 'a,b' }), /array/);
assert.throws(() => validateCreateInput({ dayKey: 'mon', exerciseIds: ['a', 'x'.repeat(101)] }), /non-empty/);
assert.throws(() => validateDayKey(undefined), ValidationError);
console.log('✓ Bad dayKey, <2 ids, duplicates, empty ids, non-array all rejected with 400.');

const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api/supersets`;
const json = (r) => r.json();
const post = (body) => fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

try {
  // 2. Create
  console.log('▶ [2] Create a group (201)...');
  const created = await post({ dayKey: 'mon', exerciseIds: ['chest_press', 'lat_pulldown', 'leg_extension'] });
  assert.strictEqual(created.status, 201);
  const group = await created.json();
  assert.match(group.groupId, /^ss_/);
  assert.strictEqual(group.dayKey, 'mon');
  assert.deepStrictEqual(group.exerciseIds, ['chest_press', 'lat_pulldown', 'leg_extension'], 'order is kept');
  console.log(`✓ ${group.groupId} with ${group.exerciseIds.length} exercises.`);

  // 3. Conflict: an exercise already grouped on that day -> 409, nothing partly written
  console.log('▶ [3] Conflict on an already-grouped exercise (409, no partial write)...');
  const before = repo.getSupersets('mon').length;
  const clash = await post({ dayKey: 'mon', exerciseIds: ['shoulder_press', 'chest_press'] });
  assert.strictEqual(clash.status, 409);
  assert.strictEqual(repo.getSupersets('mon').length, before, 'no group created on conflict');
  assert.strictEqual(repo.getSupersetGroup(group.groupId).exerciseIds.length, 3);
  assert.strictEqual(repo.getSupersets('mon').flatMap((g) => g.exerciseIds).includes('shoulder_press'), false, 'shoulder_press not grouped by the failed call');
  // The same exercises on another day are allowed
  const otherDay = await post({ dayKey: 'wed', exerciseIds: ['chest_press', 'lat_pulldown'] });
  assert.strictEqual(otherDay.status, 201);
  console.log('✓ Conflict returns 409 with no partial group; same exercise on another day is allowed.');

  // 4. List by day
  console.log('▶ [4] List by day...');
  const monList = await (await fetch(`${base}?dayKey=mon`)).json();
  assert.strictEqual(monList.dayKey, 'mon');
  assert.strictEqual(monList.groups.length, 1);
  assert.strictEqual(monList.groups[0].groupId, group.groupId);
  const emptyList = await (await fetch(`${base}?dayKey=fri`)).json();
  assert.deepStrictEqual(emptyList.groups, []);
  const badList = await fetch(`${base}?dayKey=bad%20key`);
  assert.strictEqual(badList.status, 400);
  console.log('✓ GET lists the day\'s groups; empty day gives []; bad dayKey gives 400.');

  // 5. Remove one member: group of 3 stays with 2
  console.log('▶ [5] Remove one member from a group of 3...');
  const del1 = await fetch(`${base}/${group.groupId}/exercises/lat_pulldown`, { method: 'DELETE' });
  assert.strictEqual(del1.status, 200);
  const r1 = await del1.json();
  assert.deepStrictEqual(r1, { groupId: group.groupId, dayKey: 'mon', exerciseIds: ['chest_press', 'leg_extension'], dissolved: false });
  console.log('✓ Remaining: chest_press, leg_extension; not dissolved.');

  // 6. Removing another member leaves 1 -> group dissolved
  console.log('▶ [6] Dropping below 2 members dissolves the group...');
  const del2 = await fetch(`${base}/${group.groupId}/exercises/leg_extension`, { method: 'DELETE' });
  const r2 = await del2.json();
  assert.strictEqual(del2.status, 200);
  assert.deepStrictEqual(r2, { groupId: group.groupId, dayKey: 'mon', exerciseIds: [], dissolved: true });
  assert.strictEqual(repo.getSupersetGroup(group.groupId), null, 'group row removed');
  assert.deepStrictEqual((await (await fetch(`${base}?dayKey=mon`)).json()).groups, []);
  // The freed exercises can be grouped again
  const again = await post({ dayKey: 'mon', exerciseIds: ['chest_press', 'leg_extension'] });
  assert.strictEqual(again.status, 201);
  const againGroup = await again.json();
  console.log('✓ Group dissolved; chest_press and leg_extension can be grouped again.');

  // 7. Not found cases
  console.log('▶ [7] Not found...');
  const notMember = await fetch(`${base}/${againGroup.groupId}/exercises/hip_thrust`, { method: 'DELETE' });
  assert.strictEqual(notMember.status, 404);
  const unknownGroup = await fetch(`${base}/ss_missing/exercises/chest_press`, { method: 'DELETE' });
  assert.strictEqual(unknownGroup.status, 404);
  console.log('✓ Exercise not in group and unknown group both return 404.');

  // 8. Supersets do not change sessions or history
  console.log('▶ [8] Superset rows do not touch session data...');
  const sessionsBefore = repo.getHistory().length;
  repo.createSuperset('thu', ['row_back', 'chest_fly']);
  assert.strictEqual(repo.getHistory().length, sessionsBefore);
  console.log('✓ History session count unchanged by superset writes.');
} finally {
  await new Promise((resolve) => server.close(resolve));
}

console.log('\n====================================================');
console.log('🎉 EXERCISE SUPERSET TESTS PASSED!');
console.log('====================================================');
