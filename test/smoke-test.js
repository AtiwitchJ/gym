import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SMOKE_PORT = 8998;
const BASE_URL = `http://127.0.0.1:${SMOKE_PORT}`;

console.log('🚀 Running CI/CD Pre-Deploy Smoke Test...');

async function waitForServer(retries = 30, delayMs = 200) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  return false;
}

async function runSmokeTests() {
  const serverPath = path.resolve(__dirname, '../server/server.js');
  const tempDb = path.join(os.tmpdir(), `gym-smoke-test-${Date.now()}.db`);
  const realDb = path.resolve(__dirname, '../data/gym.db');
  if (fs.existsSync(realDb)) {
    fs.copyFileSync(realDb, tempDb);
  }

  const serverProc = spawn('node', [serverPath], {
    env: {
      ...process.env,
      PORT: String(SMOKE_PORT),
      NODE_ENV: 'test',
      GYM_DB_PATH: tempDb,
      GYM_FORBID_REAL_DB: '1'
    },
    stdio: 'pipe'
  });

  serverProc.stderr.on('data', (d) => {
    const msg = d.toString();
    if (!msg.includes('ExperimentalWarning')) {
      console.error(`[Server stderr]: ${msg}`);
    }
  });

  try {
    const isReady = await waitForServer();
    assert(isReady, `Server failed to start on port ${SMOKE_PORT} within timeout`);
    console.log(`✓ Server started and responsive on port ${SMOKE_PORT}`);

    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(healthRes.status, 200, 'Health check status must be 200');
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'ok', 'Health response status must be ok');
    console.log('✓ API Health Check: 200 OK');

    // 2. State endpoint
    const stateRes = await fetch(`${BASE_URL}/api/state`);
    assert.strictEqual(stateRes.status, 200, 'State status must be 200');
    const stateData = await stateRes.json();
    assert('drafts' in stateData, 'State must contain drafts');
    assert('lastWeights' in stateData, 'State must contain lastWeights');
    assert('todos' in stateData, 'State must contain todos');
    console.log('✓ API State Sync: 200 OK');

    // 3. History endpoint
    const historyRes = await fetch(`${BASE_URL}/api/history`);
    assert.strictEqual(historyRes.status, 200, 'History status must be 200');
    const historyData = await historyRes.json();
    assert(Array.isArray(historyData), 'History must return an array');
    console.log('✓ API History: 200 OK');

    // 4. Canonical Exercise History endpoint
    const canonRes = await fetch(`${BASE_URL}/api/exercises/shoulder_press/history`);
    assert.strictEqual(canonRes.status, 200, 'Canonical history status must be 200');
    const canonData = await canonRes.json();
    assert(Array.isArray(canonData), 'Canonical history must return an array');
    console.log('✓ API Canonical Exercise History: 200 OK');

    // 5. Post state update
    const saveRes = await fetch(`${BASE_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayKey: 'thu',
        state: { th1: { wt_1: '40', reps_1: '8' } },
        weights: { th1: { wt_1: 40, reps_1: 8 } }
      })
    });
    assert.strictEqual(saveRes.status, 200, 'State POST status must be 200');
    const saveJson = await saveRes.json();
    assert(saveJson.success, 'State POST must return success: true');
    console.log('✓ API State Mutation: 200 OK');

    // 6. Static Serving Check (Root or Dist)
    const rootRes = await fetch(`${BASE_URL}/`);
    assert.strictEqual(rootRes.status, 200, 'Root status must be 200');
    console.log('✓ Frontend Web Delivery: 200 OK');

    console.log('🎉 All Smoke Tests Passed! Service is healthy and ready for deployment.');
  } finally {
    serverProc.kill('SIGTERM');
    try {
      if (fs.existsSync(tempDb)) fs.unlinkSync(tempDb);
      const wal = `${tempDb}-wal`;
      if (fs.existsSync(wal)) fs.unlinkSync(wal);
      const shm = `${tempDb}-shm`;
      if (fs.existsSync(shm)) fs.unlinkSync(shm);
    } catch (_) {}
  }
}

runSmokeTests().catch((err) => {
  console.error('❌ Smoke Test Failed:', err);
  process.exit(1);
});
