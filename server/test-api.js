const path = require('path');
const os = require('os');
const fs = require('fs');
const assert = require('assert');

// Guard against opening real data/gym.db when run standalone
if (!process.env.GYM_DB_PATH) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gym-test-api-'));
  process.env.GYM_DB_PATH = path.join(tmpDir, 'gym-test.db');
  process.env.GYM_FORBID_REAL_DB = '1';
}

const repo = require('./db');

console.log('Testing SQLite Repository and Schema...');

// 1. Test draft state
repo.saveDraft('mon', { ex_bench: { wt_0: '60', set_0: true } });
const drafts = repo.getAllDrafts();
assert(drafts.mon, 'Draft for monday should exist');
assert.strictEqual(drafts.mon.ex_bench.wt_0, '60');
console.log('✓ Draft state save & get passed');

// 2. Test last weights and reps
repo.saveLastRecord('ex_bench', 0, 62.5, 12);
const weights = repo.getLastWeights();
assert(weights.ex_bench, 'ex_bench record should exist');
assert.strictEqual(weights.ex_bench.wt_0, 62.5);
assert.strictEqual(weights.ex_bench.reps_0, 12);
console.log('✓ Last weight & reps save & get passed');

// 3. Test workout session
const testSession = {
  id: 'test_session_1',
  date: '2026-10-31',
  time: '23:30',
  dayKey: 'mon',
  dayTitle: 'วันจันทร์ - ขา + ก้น',
  totalSetsDone: 3,
  exercises: [
    {
      id: 'ex_bench',
      name: 'Barbell Bench Press',
      category: 'ท่าหลัก',
      sets: [
        { setIndex: 1, type: 'warm', target: '15 reps', weight: 40, actualReps: 15, done: true },
        { setIndex: 2, type: 'work', target: '6-8 reps', weight: 70, actualReps: 8, done: true }
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
assert.strictEqual(saved.exercises[0].sets[1].actualReps, 8);
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

// 6. Test Gym Profiles (Repo CRUD & Plate Inventory)
const profile1 = repo.saveGymProfile({
  name: 'Anytime Fitness Rama 9',
  plate_inventory: { '25': 4, '20': 6, '15': 2, '10': 4, '5': 4, '2.5': 4, '1.25': 4 },
  default_bar_weight: 20
});
assert(profile1 && profile1.id, 'Gym profile should be created with an id');
assert.strictEqual(profile1.name, 'Anytime Fitness Rama 9');
assert.strictEqual(profile1.default_bar_weight, 20);
assert.deepStrictEqual(profile1.plate_inventory, { '25': 4, '20': 6, '15': 2, '10': 4, '5': 4, '2.5': 4, '1.25': 4 });

const allProfiles = repo.getGymProfiles();
assert(Array.isArray(allProfiles), 'getGymProfiles should return array');
const foundP1 = allProfiles.find(p => p.id === profile1.id);
assert(foundP1, 'Created profile should exist in getGymProfiles');
assert.strictEqual(foundP1.name, 'Anytime Fitness Rama 9');

const singleP1 = repo.getGymProfileById(profile1.id);
assert.strictEqual(singleP1.name, 'Anytime Fitness Rama 9');

// Update profile
const updatedP1 = repo.saveGymProfile({
  id: profile1.id,
  name: 'Anytime Fitness Rama 9 (Main)',
  plate_inventory: { '20': 10 },
  default_bar_weight: 15
});
assert.strictEqual(updatedP1.name, 'Anytime Fitness Rama 9 (Main)');
assert.strictEqual(updatedP1.default_bar_weight, 15);
assert.deepStrictEqual(updatedP1.plate_inventory, { '20': 10 });

// Delete profile
const delP1 = repo.deleteGymProfile(profile1.id);
assert.strictEqual(delP1.success, true);
assert.strictEqual(repo.getGymProfileById(profile1.id), null);
console.log('✓ Gym profiles repository CRUD passed');

// 7. Test Gym Profiles HTTP Endpoints & Validation
const app = require('./server');

(async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/gym-profiles`;

  try {
    // 7.1 POST /api/gym-profiles - create
    const postRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Iron Gym',
        plate_inventory: { '25': 2, '20': 4 },
        default_bar_weight: 20
      })
    });
    assert.strictEqual(postRes.status, 201, 'POST should return 201 Created');
    const created = await postRes.json();
    assert(created.id, 'Created profile must have id');
    assert.strictEqual(created.name, 'Iron Gym');
    assert.deepStrictEqual(created.plate_inventory, { '25': 2, '20': 4 });
    assert.strictEqual(created.default_bar_weight, 20);

    // 7.2 GET /api/gym-profiles - list
    const listRes = await fetch(baseUrl);
    assert.strictEqual(listRes.status, 200);
    const list = await listRes.json();
    assert(Array.isArray(list));
    const inList = list.find(p => p.id === created.id);
    assert(inList, 'Created profile must be in list');

    // 7.3 GET /api/gym-profiles/:id
    const getRes = await fetch(`${baseUrl}/${created.id}`);
    assert.strictEqual(getRes.status, 200);
    const single = await getRes.json();
    assert.strictEqual(single.id, created.id);
    assert.strictEqual(single.name, 'Iron Gym');

    // 7.4 PUT /api/gym-profiles/:id - update
    const putRes = await fetch(`${baseUrl}/${created.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Iron Gym Platinum',
        plate_inventory: { '25': 6 },
        default_bar_weight: 20
      })
    });
    assert.strictEqual(putRes.status, 200);
    const updated = await putRes.json();
    assert.strictEqual(updated.name, 'Iron Gym Platinum');
    assert.deepStrictEqual(updated.plate_inventory, { '25': 6 });

    // 7.5 Validation tests (400)
    // Empty name
    const badNameRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' })
    });
    assert.strictEqual(badNameRes.status, 400);

    // Bad plate_inventory
    const badInvRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Valid Gym', plate_inventory: 'not-json' })
    });
    assert.strictEqual(badInvRes.status, 400);

    // Bad default_bar_weight (< 0)
    const badBarRes = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Valid Gym', default_bar_weight: -5 })
    });
    assert.strictEqual(badBarRes.status, 400);

    // 7.6 DELETE /api/gym-profiles/:id
    const delRes = await fetch(`${baseUrl}/${created.id}`, { method: 'DELETE' });
    assert.strictEqual(delRes.status, 200);

    // 7.7 404 on deleted
    const getDeletedRes = await fetch(`${baseUrl}/${created.id}`);
    assert.strictEqual(getDeletedRes.status, 404);

    const delAgainRes = await fetch(`${baseUrl}/${created.id}`, { method: 'DELETE' });
    assert.strictEqual(delAgainRes.status, 404);

    console.log('✓ Gym profiles HTTP API endpoints and validation passed');
  } finally {
    server.close();
  }

  console.log('All SQLite & API tests passed successfully!');
})().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
