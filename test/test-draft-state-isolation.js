import assert from 'node:assert';
import repo from '../server/db.js';
import app from '../server/server.js';
import http from 'node:http';

console.log('Testing Draft State Isolation & Last Weights Protection...');

// Helper to invoke Express app via HTTP in tests
function request(app, method, path, body = null) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const data = body ? JSON.stringify(body) : null;
      const headers = { 'Content-Type': 'application/json' };
      if (data) headers['Content-Length'] = Buffer.byteLength(data);

      const req = http.request({
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers
      }, (res) => {
        let resBody = '';
        res.on('data', chunk => resBody += chunk);
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(resBody) });
          } catch (e) {
            resolve({ status: res.statusCode, body: resBody });
          }
        });
      });
      req.on('error', (err) => {
        server.close();
        reject(err);
      });
      if (data) req.write(data);
      req.end();
    });
  });
}

async function runTests() {
  // Setup: Clean test exercise records
  repo.db.prepare("DELETE FROM exercise_last_weights WHERE exercise_id IN ('test_bench_ex', 'test_bench_canon')").run();
  repo.db.prepare("DELETE FROM workout_sessions WHERE id IN ('session_historical_1')").run();
  repo.clearDraft('mon');

  // Baseline 1: Create true historical session
  const historicalSession = {
    id: 'session_historical_1',
    date: '2026-11-01',
    time: '10:00',
    dayKey: 'mon',
    dayTitle: 'Historical Bench Session',
    totalSetsDone: 2,
    exercises: [
      {
        id: 'test_bench_ex',
        name: 'Test Bench Press',
        category: 'ท่าหลัก',
        sets: [
          { setIndex: 1, type: 'warm', target: '15 reps', weight: 50, actualReps: 15, done: true },
          { setIndex: 2, type: 'work', target: '6-8 reps', weight: 80, actualReps: 8, done: true },
          { setIndex: 3, type: 'work', target: '6-8 reps', weight: 80, actualReps: 0, done: false } // undone set
        ]
      }
    ]
  };

  const histRes = await request(app, 'POST', '/api/history', historicalSession);
  assert.strictEqual(histRes.status, 200, 'POST /api/history should return 200');

  // Verify baseline last weights:
  // Set 0 (warmup) -> 50kg, 15 reps
  // Set 1 (work 1) -> 80kg, 8 reps
  // Set 2 (work 2, undone) -> must NOT be in last weights!
  const baselineWeights = repo.getLastWeights('test_bench_ex');
  assert.strictEqual(baselineWeights.wt_0, 50, 'Baseline warmup weight should be 50kg');
  assert.strictEqual(baselineWeights.reps_0, 15, 'Baseline warmup reps should be 15');
  assert.strictEqual(baselineWeights.wt_1, 80, 'Baseline set 1 weight should be 80kg');
  assert.strictEqual(baselineWeights.reps_1, 8, 'Baseline set 1 reps should be 8');
  assert.strictEqual(baselineWeights.wt_2, undefined, 'Undone set 2 must NOT be in last weights');
  console.log('✓ Baseline history session and last weights established accurately');

  // TEST 1: Draft typing in-progress must NOT modify exercise_last_weights
  // User types 999kg in draft without completing the set (set_1 is false or undefined)
  const draftTypingPayload = {
    dayKey: 'mon',
    state: {
      test_bench_ex: {
        wt_1: '999',
        reps_1: '1',
        set_1: false // not completed!
      }
    },
    weights: {
      test_bench_ex: {
        wt_1: 999,
        reps_1: 1
      }
    }
  };

  const draftRes = await request(app, 'POST', '/api/state', draftTypingPayload);
  assert.strictEqual(draftRes.status, 200, 'POST /api/state should succeed');

  // 1a. Verify daily_draft_state stores draft
  const drafts = repo.getAllDrafts();
  assert(drafts.mon && drafts.mon.test_bench_ex, 'Draft state must be saved in daily_draft_state');
  assert.strictEqual(drafts.mon.test_bench_ex.wt_1, '999', 'Draft state should hold in-progress draft value');

  // 1b. Verify exercise_last_weights was PROTECTED and NOT overwritten!
  const weightsAfterDraft = repo.getLastWeights('test_bench_ex');
  assert.strictEqual(
    weightsAfterDraft.wt_1,
    80,
    'exercise_last_weights MUST NOT be overwritten by in-progress draft (must stay 80kg, NOT 999kg)'
  );
  assert.strictEqual(
    weightsAfterDraft.reps_1,
    8,
    'exercise_last_weights reps MUST NOT be overwritten by in-progress draft (must stay 8 reps, NOT 1)'
  );
  console.log('✓ In-progress draft typing strictly isolated from exercise_last_weights');

  // TEST 2: Completed set in draft (set_1: true) DOES update exercise_last_weights
  const completedSetPayload = {
    dayKey: 'mon',
    state: {
      test_bench_ex: {
        wt_1: '85',
        reps_1: '7',
        set_1: true // completed!
      }
    }
  };

  const completedRes = await request(app, 'POST', '/api/state', completedSetPayload);
  assert.strictEqual(completedRes.status, 200);

  const weightsAfterCompletedSet = repo.getLastWeights('test_bench_ex');
  assert.strictEqual(weightsAfterCompletedSet.wt_1, 85, 'Completed set 1 should update last weight to 85kg');
  assert.strictEqual(weightsAfterCompletedSet.reps_1, 7, 'Completed set 1 should update last reps to 7');
  console.log('✓ Completed set in draft (set_1: true) correctly updates exercise_last_weights');

  // TEST 3: reset-day clears draft and heals/preserves history
  // User resets day draft -> daily_draft_state cleared -> exercise_last_weights restored from true history (80kg x 8)
  const resetRes = await request(app, 'POST', '/api/reset-day', { dayKey: 'mon' });
  assert.strictEqual(resetRes.status, 200, 'POST /api/reset-day should return 200');

  // 3a. daily_draft_state for 'mon' must be cleared
  const draftsAfterReset = repo.getAllDrafts();
  assert(!draftsAfterReset.mon, 'daily_draft_state for mon must be completely cleared');

  // 3b. exercise_last_weights restored to true saved history (80kg x 8)
  const weightsAfterReset = repo.getLastWeights('test_bench_ex');
  assert.strictEqual(
    weightsAfterReset.wt_1,
    80,
    'reset-day must restore last weight back to true saved history (80kg)'
  );
  assert.strictEqual(
    weightsAfterReset.reps_1,
    8,
    'reset-day must restore last reps back to true saved history (8 reps)'
  );
  console.log('✓ reset-day cleanly clears draft and restores true historical records and stats');

  // Clean up
  repo.db.prepare("DELETE FROM exercise_last_weights WHERE exercise_id IN ('test_bench_ex')").run();
  repo.db.prepare("DELETE FROM workout_sessions WHERE id IN ('session_historical_1')").run();

  console.log('🎉 All Draft State Isolation & Last Weights Protection tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
