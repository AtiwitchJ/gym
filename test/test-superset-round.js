import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  groupMembersFor,
  roundComplete,
  shouldRestAfterTick,
  groupNextUndone,
  nextUndoneWithGroups,
  doneFromState,
  countFromExercises
} from '../src/composables/supersetRound.js';
import { nextUndoneSet } from '../src/composables/useRestPanel.js';

/**
 * Superset round rule on the set screen (pure + wiring).
 * A group's sets are done in rounds: set 0 of each member, then set 1 of each, ...
 * Rest starts only after a whole round is done. The rest panel's "ต่อไป" names the group's next step.
 * Ungrouped exercises: rest after every set and "ต่อไป" as before (checked against nextUndoneSet).
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: Superset round rule (rest after the round; ungrouped unchanged)');
console.log('====================================================\n');

const groups = [{ groupId: 'g1', dayKey: 'prog_a', exerciseIds: ['A', 'B'] }];
const exercises = [
  { id: 'A', name: 'Bench', sets: [{ type: 'warm' }, { type: 'work' }, { type: 'work' }] },
  { id: 'B', name: 'Row', sets: [{ type: 'work' }, { type: 'work' }, { type: 'work' }] },
  { id: 'C', name: 'Curl', sets: [{ type: 'work' }, { type: 'work' }] }
];
// A "done" state helper: day state = { exId: { set_i: true } }
const stateOf = (done) => {
  const st = {};
  for (const [id, i] of done) {
    st[id] = st[id] || {};
    st[id][`set_${i}`] = true;
  }
  return st;
};
const isDoneFor = (done) => doneFromState(stateOf(done));
const countFor = countFromExercises(exercises);

console.log('▶ [1] Membership: grouped exercises have members in group order; ungrouped have none...');
assert.deepStrictEqual(groupMembersFor(groups, 'A'), ['A', 'B']);
assert.deepStrictEqual(groupMembersFor(groups, 'B'), ['A', 'B']);
assert.strictEqual(groupMembersFor(groups, 'C'), null, 'ungrouped exercise has no members');
assert.strictEqual(groupMembersFor(undefined, 'A'), null);
console.log('  ✓ membership\n');

console.log('▶ [2] Rest after the round, not after each set (group A+B, 3 sets each)...');
// Tick A set 0 (warm): round 0 not complete (B has not ticked set 0) -> no rest
assert.strictEqual(shouldRestAfterTick(groups, 'A', 0, isDoneFor([['A', 0]]), countFor), false, 'A set 0 alone: no rest');
// Tick B set 0: round 0 complete -> rest
assert.strictEqual(shouldRestAfterTick(groups, 'B', 0, isDoneFor([['A', 0], ['B', 0]]), countFor), true, 'round 0 complete: rest');
// Round 1: A set 1 ticked first -> no rest; B set 1 completes the round -> rest
assert.strictEqual(shouldRestAfterTick(groups, 'A', 1, isDoneFor([['A', 0], ['B', 0], ['A', 1]]), countFor), false);
assert.strictEqual(shouldRestAfterTick(groups, 'B', 1, isDoneFor([['A', 0], ['B', 0], ['A', 1], ['B', 1]]), countFor), true);
console.log('  ✓ no rest mid-round; rest when the round completes\n');

console.log('▶ [3] Members with fewer sets do not hold the round (C-like short member)...');
const short = [{ id: 'A', sets: exercises[0].sets }, { id: 'D', sets: [{ type: 'work' }] }];
const shortCount = countFromExercises(short);
const shortGroup = [{ groupId: 'g2', dayKey: 'prog_a', exerciseIds: ['A', 'D'] }];
// Round 1 has only A (D has one set): A set 1 alone completes round 1
assert.strictEqual(shouldRestAfterTick(shortGroup, 'A', 1, isDoneFor([['A', 0], ['D', 0], ['A', 1]]), shortCount), true);
assert.strictEqual(roundComplete(['A', 'D'], 2, isDoneFor([['A', 2]]), shortCount), true, 'round 2: only A has it');
console.log('  ✓ short member skipped in later rounds\n');

console.log('▶ [4] Ungrouped exercises rest after every set, as before...');
assert.strictEqual(shouldRestAfterTick(groups, 'C', 0, isDoneFor([['C', 0]]), countFor), true, 'ungrouped set 0: rest');
assert.strictEqual(shouldRestAfterTick([], 'C', 1, isDoneFor([['C', 1]]), countFor), true, 'no groups at all: rest');
assert.strictEqual(shouldRestAfterTick(undefined, 'A', 0, isDoneFor([['A', 0]]), countFor), true, 'no groups list: exercise is ungrouped, rests as before');
console.log('  ✓ ungrouped and no-groups rest after each set\n');

console.log('▶ [5] Round order: the group\'s next step goes set 0 of each member, then set 1...');
assert.deepStrictEqual(groupNextUndone(['A', 'B'], isDoneFor([]), countFor), { exerciseId: 'A', setIndex: 0 });
assert.deepStrictEqual(groupNextUndone(['A', 'B'], isDoneFor([['A', 0]]), countFor), { exerciseId: 'B', setIndex: 0 });
assert.deepStrictEqual(groupNextUndone(['A', 'B'], isDoneFor([['A', 0], ['B', 0]]), countFor), { exerciseId: 'A', setIndex: 1 });
assert.strictEqual(groupNextUndone(['A', 'B'], isDoneFor([['A', 0], ['B', 0], ['A', 1], ['B', 1], ['A', 2], ['B', 2]]), countFor), null);
console.log('  ✓ A0 → B0 → A1 → B1 → A2 → B2\n');

console.log('▶ [6] "ต่อไป": inside a group it names the group\'s next member, not the next set in day order...');
// A set 0 done: the day-order next set is A set 1, but the round says B set 0
const afterA0 = nextUndoneWithGroups(exercises, isDoneFor([['A', 0]]), groups);
assert.deepStrictEqual({ id: afterA0.exerciseId, set: afterA0.setIndex, name: afterA0.exerciseName }, { id: 'B', set: 0, name: 'Row' });
assert.strictEqual(afterA0.label, 'เซ็ต 0');
// Round 0 complete: next is A set 1
const afterRound0 = nextUndoneWithGroups(exercises, isDoneFor([['A', 0], ['B', 0]]), groups);
assert.deepStrictEqual({ id: afterRound0.exerciseId, set: afterRound0.setIndex }, { id: 'A', set: 1 });
console.log('  ✓ "ต่อไป" follows the round\n');

console.log('▶ [7] Ungrouped: "ต่อไป" is exactly nextUndoneSet (same result for every state)...');
const day = { exercises: exercises.slice(2), bonusExercises: [] };
const cases = [[], [['C', 0]], [['C', 0], ['C', 1]]];
for (const done of cases) {
  const st = stateOf(done);
  const a = nextUndoneWithGroups(day.exercises, doneFromState(st), []);
  const b = nextUndoneSet(day, st);
  assert.deepStrictEqual(a, b, `ungrouped must match nextUndoneSet for ${JSON.stringify(done)}`);
}
// Also with groups present but none of the exercises in a group
const same = nextUndoneWithGroups(exercises, isDoneFor([['A', 0], ['B', 0]]), [{ groupId: 'x', dayKey: 'prog_a', exerciseIds: ['P', 'Q'] }]);
assert.deepStrictEqual(same, nextUndoneSet({ exercises }, stateOf([['A', 0], ['B', 0]])));
console.log('  ✓ ungrouped matches nextUndoneSet\n');

console.log('▶ [8] All done: no next step (null), the hint shows "จบทุกท่า"...');
const allDone = [];
for (const ex of exercises) ex.sets.forEach((_, i) => allDone.push([ex.id, i]));
assert.strictEqual(nextUndoneWithGroups(exercises, isDoneFor(allDone), groups), null);
console.log('  ✓ null when every set is done\n');

console.log('▶ [9] Wiring: the rest starts only in the round branch, with the ticked exercise\'s saved rest...');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
const onToggle = card.slice(card.indexOf('function onToggle(sIdx)'), card.indexOf('function onToggle(sIdx)') + 1400);
assert.ok(onToggle.includes('shouldRestAfterTick('), 'ExerciseCard asks the round rule');
assert.ok(/if \(startRest\) \{[\s\S]*?const saved = getCustomRest\(props\.exercise\.id\);[\s\S]*?startTimer\(\);/.test(onToggle), 'saved rest of the ticked exercise and startTimer only inside if (startRest)');
const bonus = fs.readFileSync(path.join(root, 'src/components/BonusCard.vue'), 'utf8');
const bonusToggle = bonus.slice(bonus.indexOf('function onToggle(sIdx)'), bonus.indexOf('function onToggle(sIdx)') + 900);
assert.ok(bonusToggle.includes('shouldRestAfterTick('), 'BonusCard asks the round rule');
assert.ok(/if \(startRest\) startTimer\(\);/.test(bonusToggle), 'BonusCard starts the timer only when the round rule allows');
console.log('  ✓ ExerciseCard and BonusCard gate the rest on the round\n');

console.log('▶ [10] Wiring: RestTimer "ต่อไป" uses the group-aware next step...');
const timer = fs.readFileSync(path.join(root, 'src/components/RestTimer.vue'), 'utf8');
assert.ok(timer.includes("import { nextUndoneWithGroups, doneFromState } from '../composables/supersetRound.js';"), 'RestTimer imports the group-aware next step');
assert.ok(timer.includes('return nextUndoneWithGroups(dayExercises, doneFromState(userState[currentDay.value]), superset.groups.value);'), 'next uses the group-aware step');
assert.ok(timer.includes('{{ nextHint }}'), 'the existing "ต่อไป" line is still the one shown');
console.log('  ✓ "ต่อไป" line driven by the round rule\n');

console.log('✅ superset round rule checks passed');
