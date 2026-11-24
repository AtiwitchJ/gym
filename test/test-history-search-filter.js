import assert from 'node:assert/strict';
import { filterHistory } from '../src/composables/historyFilter.js';

const now = new Date(2026, 10, 24, 12);
const sessions = [
  { id: 1, date: '2026-11-24', dayTitle: 'Push', exercises: [{ name: 'Bench Press' }] },
  { id: 2, date: '2026-11-18', dayTitle: 'Pull', exercises: [{ name: 'Deadlift' }] },
  { id: 3, date: '2026-11-17', dayTitle: 'Push', exercises: [{ name: 'Bench Press' }] },
  { id: 4, date: 'bad', dayTitle: 'Push', exercises: [] }
];
assert.deepEqual(filterHistory(sessions, { query: ' bench ', routine: 'Push', days: 7 }, now).map(s => s.id), [1]);
assert.deepEqual(filterHistory(sessions, { days: 7 }, now).map(s => s.id), [1, 2]);
assert.deepEqual(filterHistory(sessions, { query: 'pull' }, now).map(s => s.id), [2]);
assert.equal(filterHistory(sessions, {}, now).length, 4);
assert.equal(filterHistory(sessions, { query: 'missing' }, now).length, 0);
console.log('History search and filters passed');
