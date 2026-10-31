const assert = require('assert');
const repo = require('./db');

console.log('Testing SQLite Repository and Schema...');

// 1. Test draft state
repo.saveDraft('mon', { ex_bench: { wt_0: '60', set_0: true } });
const drafts = repo.getAllDrafts();
assert(drafts.mon, 'Draft for monday should exist');
assert.strictEqual(drafts.mon.ex_bench.wt_0, '60');
console.log('✓ Draft state save & get passed');

// 2. Test last weights
repo.saveLastWeight('ex_bench', 0, 62.5);
const weights = repo.getLastWeights();
assert(weights.ex_bench, 'ex_bench weight should exist');
assert.strictEqual(weights.ex_bench.wt_0, 62.5);
console.log('✓ Last weight save & get passed');

// 3. Test workout session
const testSession = {
  id: 'test_session_1',
  date: '2026-10-31',
  time: '23:30',
  dayKey: 'mon',
  dayTitle: 'วันจันทร์ - อก + หน้าแขน + ท้อง',
  totalSetsDone: 3,
  exercises: [
    {
      id: 'ex_bench',
      name: 'Barbell Bench Press',
      category: 'ท่าหลัก',
      sets: [
        { setIndex: 1, type: 'warm', target: '15 reps', weight: 40, done: true },
        { setIndex: 2, type: 'work', target: '6-8 reps', weight: 70, done: true }
      ]
    }
  ]
};

repo.saveSession(testSession);
const history = repo.getHistory();
assert(history.length > 0, 'History should not be empty');
const saved = history.find(h => h.id === 'test_session_1');
assert(saved, 'Saved session should be found');
assert.strictEqual(saved.totalSetsDone, 3);
assert.strictEqual(saved.exercises[0].sets[1].weight, 70);
console.log('✓ Workout session save & get passed');

// 4. Test delete
repo.deleteSession('test_session_1');
const historyAfter = repo.getHistory();
assert(!historyAfter.find(h => h.id === 'test_session_1'), 'Session should be deleted');
console.log('✓ Session delete passed');

// 5. Test Todos
repo.saveTodos([
  { id: 'todo_1', text: 'ดื่มน้ำ 3 ลิตร', done: false },
  { id: 'todo_2', text: 'ยืดเส้นหลังเล่น', done: true }
]);
const todos = repo.getTodos();
assert.strictEqual(todos.length, 2);
assert.strictEqual(todos[0].text, 'ดื่มน้ำ 3 ลิตร');
assert.strictEqual(todos[1].done, true);
console.log('✓ Todos save & get passed');

console.log('All SQLite tests passed successfully!');
