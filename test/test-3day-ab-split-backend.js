import assert from 'node:assert';
import repo from '../server/db.js';
import app from '../server/server.js';
import http from 'node:http';

console.log('Testing 3-Day A/B Alternating Split Backend & Canonical Mapping...');

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
  // -------------------------------------------------------------
  // 1. Verify CANONICAL_MAP covers all 9 required movements and variants
  // -------------------------------------------------------------
  const movementChecks = [
    { id: 'chest_press', expected: 'chest_press' },
    { id: 't1', expected: 'chest_press' },
    { id: 'b_m_chest', expected: 'chest_press' },
    { id: 'pa_chest_press', expected: 'chest_press' },
    { id: 'pb_chest_press', expected: 'chest_press' },
    { id: 'program_a_chest_press', expected: 'chest_press' },
    { id: 'program_b_chest_press', expected: 'chest_press' },

    { id: 'lat_pulldown', expected: 'lat_pulldown' },
    { id: 'w2', expected: 'lat_pulldown' },
    { id: 'b_m_back', expected: 'lat_pulldown' },
    { id: 'pa_lat_pulldown', expected: 'lat_pulldown' },
    { id: 'pb_lat_pulldown', expected: 'lat_pulldown' },

    { id: 'seated_leg_press', expected: 'seated_leg_press' },
    { id: 'm1', expected: 'seated_leg_press' },
    { id: 'b_t_leg', expected: 'seated_leg_press' },
    { id: 'pa_leg_press', expected: 'seated_leg_press' },
    { id: 'pb_leg_press', expected: 'seated_leg_press' },

    { id: 'shoulder_press', expected: 'shoulder_press' },
    { id: 'th1', expected: 'shoulder_press' },
    { id: 'b_m_shoulder', expected: 'shoulder_press' },
    { id: 'pa_shoulder_press', expected: 'shoulder_press' },
    { id: 'pb_shoulder_press', expected: 'shoulder_press' },

    { id: 'incline_chest', expected: 'incline_chest' },
    { id: 't2', expected: 'incline_chest' },
    { id: 'incline_smith_press', expected: 'incline_chest' },
    { id: 'pa_incline_chest', expected: 'incline_chest' },
    { id: 'pb_incline_chest', expected: 'incline_chest' },

    { id: 'row_back', expected: 'row_back' },
    { id: 'w1', expected: 'row_back' },
    { id: 'seated_cable_row', expected: 'row_back' },
    { id: 'pa_row_back', expected: 'row_back' },
    { id: 'pb_row_back', expected: 'row_back' },

    { id: 'chest_fly', expected: 'chest_fly' },
    { id: 't3', expected: 'chest_fly' },
    { id: 'pec_fly_machine', expected: 'chest_fly' },
    { id: 'pa_chest_fly', expected: 'chest_fly' },
    { id: 'pb_chest_fly', expected: 'chest_fly' },

    { id: 'hip_thrust', expected: 'hip_thrust' },
    { id: 'm2', expected: 'hip_thrust' },
    { id: 'smith_hip_thrust', expected: 'hip_thrust' },
    { id: 'pa_hip_thrust', expected: 'hip_thrust' },
    { id: 'pb_hip_thrust', expected: 'hip_thrust' },

    { id: 'leg_extension', expected: 'leg_extension' },
    { id: 'm3', expected: 'leg_extension' },
    { id: 'leg_extension_machine', expected: 'leg_extension' },
    { id: 'pa_leg_extension', expected: 'leg_extension' },
    { id: 'pb_leg_extension', expected: 'leg_extension' }
  ];

  for (const check of movementChecks) {
    const actual = repo.getCanonicalExerciseId(check.id);
    assert.strictEqual(actual, check.expected, `ID '${check.id}' should map to canonical '${check.expected}'`);
  }
  console.log('✓ All 9 movement patterns and Program A/B variants correctly resolve to canonical IDs');

  // -------------------------------------------------------------
  // 2. Test daily_draft_state with dayKey: 'fri', 'program_a', 'program_b'
  // -------------------------------------------------------------
  repo.saveDraft('fri', { fri_ex1: { wt_0: 45, reps_0: 15 } });
  repo.saveDraft('program_a', { pa_chest_press: { wt_0: 40, reps_0: 12 } });
  repo.saveDraft('program_b', { pb_lat_pulldown: { wt_0: 55, reps_0: 10 } });

  const allDrafts = repo.getAllDrafts();
  assert(allDrafts.fri && allDrafts.fri.fri_ex1, "Draft for 'fri' must exist and persist");
  assert.strictEqual(allDrafts.fri.fri_ex1.wt_0, 45);

  assert(allDrafts.program_a && allDrafts.program_a.pa_chest_press, "Draft for 'program_a' must exist and persist");
  assert.strictEqual(allDrafts.program_a.pa_chest_press.wt_0, 40);

  assert(allDrafts.program_b && allDrafts.program_b.pb_lat_pulldown, "Draft for 'program_b' must exist and persist");
  assert.strictEqual(allDrafts.program_b.pb_lat_pulldown.wt_0, 55);

  // Clear draft tests
  repo.clearDraft('fri');
  const draftsAfterFriClear = repo.getAllDrafts();
  assert(!draftsAfterFriClear.fri, "Draft for 'fri' should be cleared cleanly");
  assert(draftsAfterFriClear.program_a, "Draft for 'program_a' remains untouched");

  repo.clearDraft('program_a');
  repo.clearDraft('program_b');
  console.log("✓ daily_draft_state supports 'fri', 'program_a', 'program_b' seamlessly");

  // -------------------------------------------------------------
  // 3. Test workout_sessions with dayKey: 'fri', 'program_a', 'program_b'
  // -------------------------------------------------------------
  const sessionFri = {
    id: 'test_session_fri_1',
    date: '2026-11-20',
    time: '18:00',
    dayKey: 'fri',
    dayTitle: 'Friday Alternating Session',
    totalSetsDone: 2,
    exercises: [
      {
        id: 'pa_incline_chest',
        name: 'Incline Chest Press',
        category: 'ท่าหลัก',
        sets: [
          { setIndex: 1, type: 'warm', target: '15 reps', weight: 30, actualReps: 15, done: true },
          { setIndex: 2, type: 'work', target: '6-8 reps', weight: 65, actualReps: 8, done: true }
        ]
      }
    ]
  };

  const sessionProgA = {
    id: 'test_session_proga_1',
    date: '2026-11-23',
    time: '17:30',
    dayKey: 'program_a',
    dayTitle: 'Program A: Full Body / Push Focus',
    totalSetsDone: 2,
    exercises: [
      {
        id: 'pa_chest_press',
        name: 'Chest Press Machine',
        category: 'ท่าหลัก',
        sets: [
          { setIndex: 1, type: 'warm', target: '15 reps', weight: 35, actualReps: 15, done: true },
          { setIndex: 2, type: 'work', target: '6-8 reps', weight: 75, actualReps: 8, done: true }
        ]
      }
    ]
  };

  const sessionProgB = {
    id: 'test_session_progb_1',
    date: '2026-11-25',
    time: '17:30',
    dayKey: 'program_b',
    dayTitle: 'Program B: Full Body / Pull Focus',
    totalSetsDone: 2,
    exercises: [
      {
        id: 'pb_row_back',
        name: 'Seated Row Machine',
        category: 'ท่าหลัก',
        sets: [
          { setIndex: 1, type: 'warm', target: '15 reps', weight: 40, actualReps: 15, done: true },
          { setIndex: 2, type: 'work', target: '6-8 reps', weight: 70, actualReps: 8, done: true }
        ]
      }
    ]
  };

  repo.saveSession(sessionFri);
  repo.saveSession(sessionProgA);
  repo.saveSession(sessionProgB);

  const history = repo.getHistory();
  const savedFri = history.find(s => s.id === 'test_session_fri_1');
  assert(savedFri, 'Friday session should be retrieved from history');
  assert.strictEqual(savedFri.dayKey, 'fri');
  assert.strictEqual(savedFri.exercises[0].canonicalId, 'incline_chest');

  const savedA = history.find(s => s.id === 'test_session_proga_1');
  assert(savedA, 'Program A session should be retrieved from history');
  assert.strictEqual(savedA.dayKey, 'program_a');
  assert.strictEqual(savedA.exercises[0].canonicalId, 'chest_press');

  const savedB = history.find(s => s.id === 'test_session_progb_1');
  assert(savedB, 'Program B session should be retrieved from history');
  assert.strictEqual(savedB.dayKey, 'program_b');
  assert.strictEqual(savedB.exercises[0].canonicalId, 'row_back');

  console.log("✓ workout_sessions supports 'fri', 'program_a', 'program_b' with correct canonical_id mapping");

  // -------------------------------------------------------------
  // 4. Test Cross-Day & Program A <-> Program B Synchronization in SQLite
  // -------------------------------------------------------------
  // pa_chest_press (75kg x 8 reps) saved above should have automatically propagated to pb_chest_press and t1
  const pbChestWeights = repo.getLastWeights('pb_chest_press');
  assert(pbChestWeights, 'pb_chest_press must have synced records');
  assert.strictEqual(pbChestWeights.wt_0, 35, 'pb_chest_press warm weight synced from Program A (35kg)');
  assert.strictEqual(pbChestWeights.wt_1, 75, 'pb_chest_press work weight synced from Program A (75kg)');

  const t1Weights = repo.getLastWeights('t1');
  assert.strictEqual(t1Weights.wt_1, 75, '4-day t1 chest press must also sync from Program A (75kg)');

  // Query unified exercise history via canonical ID 'chest_press'
  const canonChestHistory = repo.getExerciseHistory('chest_press');
  assert(canonChestHistory.some(s => s.sessionId === 'test_session_proga_1'), 'Canonical chest history should include Program A session');

  console.log('✓ Cross-program bidirectional sync operates correctly between Program A, Program B, and 4-Day');

  // -------------------------------------------------------------
  // 5. Test REST Endpoints via Express (/api/state and /api/reset-day)
  // -------------------------------------------------------------
  const stateRes = await request(app, 'POST', '/api/state', {
    dayKey: 'program_a',
    state: {
      pa_hip_thrust: { wt_1: '95', reps_1: '8', set_1: true }
    }
  });
  assert.strictEqual(stateRes.status, 200);

  const htWeights = repo.getLastWeights('pa_hip_thrust');
  assert.strictEqual(htWeights.wt_1, 95);

  const resetRes = await request(app, 'POST', '/api/reset-day', { dayKey: 'program_a' });
  assert.strictEqual(resetRes.status, 200);

  // Clean up test sessions
  repo.deleteSession('test_session_fri_1');
  repo.deleteSession('test_session_proga_1');
  repo.deleteSession('test_session_progb_1');
  repo.db.prepare("DELETE FROM exercise_last_weights WHERE exercise_id IN ('pa_incline_chest', 'pa_chest_press', 'pb_chest_press', 'pb_row_back', 'pa_hip_thrust')").run();

  console.log('🎉 All 3-Day A/B Alternating Split Backend tests passed successfully!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
