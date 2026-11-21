import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  groupForExercise,
  groupNumber,
  partnerNames,
  toggleSelection,
  canLink,
  supersetMessageFor,
  fetchSupersets,
  createSupersetRequest,
  removeSupersetRequest,
  useSupersetStore,
  SUPERSET_MESSAGES
} from '../src/composables/useSupersets.js';

/**
 * Superset UI (client): link 2+ exercises of a day, show a badge and partners, remove one.
 * No database: the API is replaced by a fake fetch. Covers the rules, the Thai messages for
 * 409/404/400, the store flow, and the wiring in App.vue and ExerciseCard.vue.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fakeFetch(handler) {
  const calls = [];
  const fn = async (url, opts = {}) => {
    calls.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    const { status, body } = handler(url, opts);
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  fn.calls = calls;
  return fn;
}

console.log('====================================================');
console.log('🧪 QA Test: Exercise supersets on the day view (client)');
console.log('====================================================\n');

const groups = [
  { groupId: 'g1', dayKey: 'prog_a', exerciseIds: ['bench', 'row'] },
  { groupId: 'g2', dayKey: 'prog_a', exerciseIds: ['squat', 'lunge', 'curl'] }
];

console.log('▶ [1] Lookup: the group of an exercise, its number, and partner names...');
assert.strictEqual(groupForExercise(groups, 'row').groupId, 'g1');
assert.strictEqual(groupForExercise(groups, 'curl').groupId, 'g2');
assert.strictEqual(groupForExercise(groups, 'press'), null, 'ungrouped exercise has no group');
assert.strictEqual(groupForExercise(undefined, 'row'), null, 'no groups loaded yet');
assert.strictEqual(groupNumber(groups, 'g2'), 2);
assert.strictEqual(groupNumber(groups, 'nope'), 0);
const names = { bench: 'Bench Press', row: 'Row', squat: 'Squat', lunge: 'Lunge', curl: 'Curl' };
assert.deepStrictEqual(partnerNames(groups[1], 'squat', names), ['Lunge', 'Curl']);
assert.deepStrictEqual(partnerNames(groups[0], 'bench', {}), ['row'], 'unknown name falls back to the id');
assert.deepStrictEqual(partnerNames(null, 'x', names), []);
console.log('  ✓ lookup, numbering and partner names\n');

console.log('▶ [2] Selection: toggling and the link rule...');
assert.deepStrictEqual(toggleSelection([], 'press'), ['press']);
assert.deepStrictEqual(toggleSelection(['press', 'fly'], 'press'), ['fly'], 'tap again deselects');
assert.strictEqual(canLink(['press'], groups), false, 'one exercise is not a superset');
assert.strictEqual(canLink([], groups), false);
assert.strictEqual(canLink(['press', 'fly'], groups), true, 'two free exercises can link');
assert.strictEqual(canLink(['press', 'row'], groups), false, 'a grouped exercise blocks the link');
assert.strictEqual(canLink(['press', 'press'], groups), false, 'duplicate id blocks the link');
assert.strictEqual(canLink(null, groups), false);
console.log('  ✓ 2+ free exercises; grouped or duplicate blocks\n');

console.log('▶ [3] Thai messages for the API errors...');
assert.strictEqual(supersetMessageFor('link', 409), SUPERSET_MESSAGES.taken);
assert.strictEqual(supersetMessageFor('unlink', 404), SUPERSET_MESSAGES.notFound);
assert.strictEqual(supersetMessageFor('link', 400, 'a superset needs at least 2 exercises'), 'a superset needs at least 2 exercises');
assert.strictEqual(supersetMessageFor('link', 500), SUPERSET_MESSAGES.link);
assert.strictEqual(supersetMessageFor('unlink', 500), SUPERSET_MESSAGES.unlink);
assert.strictEqual(supersetMessageFor('load', 500), SUPERSET_MESSAGES.load);
console.log('  ✓ 409 / 404 / 400 / 500 mapped\n');

console.log('▶ [4] Fetch layer: GET, POST and DELETE shapes and their results...');
const getOk = fakeFetch(() => ({ status: 200, body: { dayKey: 'prog_a', groups } }));
assert.deepStrictEqual(await fetchSupersets('prog_a', getOk), groups);
assert.strictEqual(getOk.calls[0].url, '/api/supersets?dayKey=prog_a');
assert.strictEqual(getOk.calls[0].method, 'GET');

const getBad = fakeFetch(() => ({ status: 400, body: { error: 'dayKey must be a short lowercase key' } }));
await assert.rejects(() => fetchSupersets('BAD KEY', getBad), (err) => err.message === 'dayKey must be a short lowercase key');

const postOk = fakeFetch(() => ({ status: 201, body: { groupId: 'g9', dayKey: 'prog_a', exerciseIds: ['press', 'fly'] } }));
assert.deepStrictEqual(await createSupersetRequest('prog_a', ['press', 'fly'], postOk), { ok: true, groupId: 'g9' });
assert.deepStrictEqual(postOk.calls[0].body, { dayKey: 'prog_a', exerciseIds: ['press', 'fly'] });
assert.strictEqual(postOk.calls[0].method, 'POST');

const post409 = fakeFetch(() => ({ status: 409, body: { error: 'already grouped' } }));
assert.deepStrictEqual(await createSupersetRequest('prog_a', ['press', 'row'], post409), { ok: false, message: SUPERSET_MESSAGES.taken });

const del200 = fakeFetch(() => ({ status: 200, body: { groupId: 'g1', dayKey: 'prog_a', exerciseIds: ['bench'], dissolved: true } }));
assert.deepStrictEqual(await removeSupersetRequest('g1', 'row', del200), { ok: true, dissolved: true });
assert.strictEqual(del200.calls[0].url, '/api/supersets/g1/exercises/row');
assert.strictEqual(del200.calls[0].method, 'DELETE');

const del404 = fakeFetch(() => ({ status: 404, body: { error: 'not found' } }));
assert.deepStrictEqual(await removeSupersetRequest('gX', 'row', del404), { ok: false, message: SUPERSET_MESSAGES.notFound });
console.log('  ✓ request shapes and error mapping\n');

console.log('▶ [5] Store flow: link mode, confirm, reload; a grouped exercise cannot be picked...');
const store = useSupersetStore();
let linked = false;
const flow = fakeFetch((url, opts) => {
  if (opts.method === 'POST') {
    linked = true;
    return { status: 201, body: { groupId: 'g7', dayKey: 'prog_a', exerciseIds: ['press', 'fly'] } };
  }
  const now = linked ? [...groups, { groupId: 'g7', dayKey: 'prog_a', exerciseIds: ['press', 'fly'] }] : groups;
  return { status: 200, body: { dayKey: 'prog_a', groups: now } };
});
await store.load('prog_a', flow);
assert.strictEqual(store.groups.value.length, 2);
store.startLinking();
assert.strictEqual(store.linkMode.value, true);
store.toggle('row'); // grouped: ignored
assert.deepStrictEqual(store.selected.value, [], 'grouped exercise is not selectable');
store.toggle('press');
store.toggle('fly');
assert.strictEqual(await store.confirmLink('prog_a', flow), true);
assert.strictEqual(store.linkMode.value, false, 'link mode ends after a successful link');
assert.strictEqual(store.groups.value.length, 3, 'day is reloaded after linking');
const postCall = flow.calls.find((c) => c.method === 'POST');
assert.deepStrictEqual(postCall.body.exerciseIds, ['press', 'fly']);
console.log('  ✓ link flow posts the selection and reloads\n');

console.log('▶ [6] Store flow: a failed link keeps the message and reloads the day...');
const conflict = fakeFetch((url, opts) => {
  if (opts.method === 'POST') return { status: 409, body: { error: 'already grouped' } };
  return { status: 200, body: { dayKey: 'prog_a', groups } };
});
// A stale client: it still has the old groups (press and fly are free here), but the server already grouped them.
await store.load('prog_a', conflict);
store.startLinking();
store.toggle('press');
store.toggle('fly');
assert.strictEqual(await store.confirmLink('prog_a', conflict), false);
assert.strictEqual(store.error.value, SUPERSET_MESSAGES.taken);
assert.ok(conflict.calls.some((c) => c.method === 'GET'), 'day reloaded after the conflict');
console.log('  ✓ 409 shows the Thai message and reloads\n');

console.log('▶ [7] Store flow: remove one exercise, reload...');
const removal = fakeFetch((url, opts) => {
  if (opts.method === 'DELETE') return { status: 200, body: { groupId: 'g2', dayKey: 'prog_a', exerciseIds: ['squat', 'lunge'], dissolved: false } };
  return { status: 200, body: { dayKey: 'prog_a', groups } };
});
assert.strictEqual(await store.unlink('prog_a', 'g2', 'curl', removal), true);
assert.ok(removal.calls.some((c) => c.method === 'DELETE' && c.url === '/api/supersets/g2/exercises/curl'));
console.log('  ✓ remove sends DELETE and reloads\n');

console.log('▶ [8] Wiring: day toolbar in App.vue; badge, partners, remove and select in ExerciseCard.vue...');
const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');
const card = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
const cardTpl = card.split('<script setup>')[0];

assert.ok(app.includes('🔗 ทำซูเปอร์เซ็ต'), 'start button on the day view');
assert.ok(app.includes('เชื่อมเป็นซูเปอร์เซ็ต'), 'confirm button');
assert.ok(app.includes(':disabled="!supersetCanConfirm"'), 'confirm disabled until the selection is valid');
assert.ok(app.includes('min-h-[44px] px-3 rounded-xl border-2 border-plate bg-surface hover:bg-paper-subtle text-ink font-heading font-bold text-xs shadow'), 'start button 44 px');
assert.ok(app.includes('v-if="currentDayData.exercises.length >= 2"'), 'toolbar only when there are 2+ exercises');
assert.ok(app.includes("import { useSupersetStore, canLink } from './composables/useSupersets.js';"), 'App imports the store');
assert.ok(/watch\(\s*\(\) => \[activeDayKey\.value, isWorkoutDay\.value\]/.test(app), 'App loads the day when it changes');

assert.ok(cardTpl.includes('🔗 ซูเปอร์เซ็ต {{ myGroupNo }}'), 'badge with the group number');
assert.ok(cardTpl.includes('คู่กับ {{ partnerLabel }}'), 'partner names shown');
assert.ok(cardTpl.includes('นำออกจากซูเปอร์เซ็ต'), 'remove action');
assert.ok(/v-if="linkMode && !myGroup"/.test(cardTpl), 'select shown only in link mode and for ungrouped exercises');
assert.ok(cardTpl.includes('min-h-[44px] px-2.5 rounded-xl border-2 border-plate bg-white text-ink font-heading font-bold text-[11px]'), 'remove button 44 px');
assert.ok(card.includes("border-l-[6px] border-l-gold"), 'grouped card gets a gold accent');
assert.ok(card.includes("import { useSupersetStore, groupForExercise, groupNumber, partnerNames } from '../composables/useSupersets.js';"), 'card imports the helpers');
console.log('  ✓ toolbar, badge, partners, remove, select (44 px controls)\n');

console.log('✅ superset UI checks passed');
