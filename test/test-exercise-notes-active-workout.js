import assert from 'node:assert';
import {
  getNote,
  hasNote,
  formatSummaryPill,
  saveNote,
  fetchNote,
  clearNote,
  notesMap,
  notesRevision,
  readAllNotesFromStorage,
  writeAllNotesToStorage,
  EXERCISE_NOTES_STORAGE_KEY
} from '../src/composables/useExerciseNotes.js';

console.log('====================================================');
console.log('🧪 QA Unit Tests: Exercise Notes in Active Workout');
console.log('====================================================\n');

// Mock localStorage for Node test runner
const memoryStore = new Map();
const mockStorage = {
  getItem: (key) => memoryStore.get(key) || null,
  setItem: (key, val) => memoryStore.set(key, String(val)),
  removeItem: (key) => memoryStore.delete(key),
  clear: () => memoryStore.clear()
};

// Polyfill global localStorage
Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  configurable: true,
  writable: true
});

// 1. Initial Empty State & Retrieval
console.log('▶ [1] Empty state & note retrieval...');
const emptyNote = getNote('bench_press_unknown', mockStorage);
assert.strictEqual(emptyNote.exerciseId, 'bench_press_unknown');
assert.strictEqual(emptyNote.pinSetting, '');
assert.strictEqual(hasNote('bench_press_unknown'), false);
assert.strictEqual(formatSummaryPill('bench_press_unknown'), '');
console.log('✓ Non-existent exercise safely returns empty note without error.');

// 2. Saving Note Online & Summary Formatting
console.log('\n▶ [2] Saving note online with mock fetch...');
const mockFetchOnline = async (url, options) => {
  assert.ok(url.includes('/api/exercises/barbell_bench_press/note'));
  assert.strictEqual(options.method, 'PUT');
  const body = JSON.parse(options.body);
  return {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      exerciseId: 'barbell_bench_press',
      note: {
        pinSetting: body.pinSetting,
        formCues: body.formCues,
        generalNote: body.generalNote,
        updatedAt: '2026-11-24T10:00:00.000Z'
      }
    })
  };
};

const saveRes = await saveNote('barbell_bench_press', {
  pinSetting: 'เบาะระดับ 3',
  formCues: 'บีบสะบักกดลงล่าง',
  generalNote: 'หายใจออกตอนดัน'
}, mockFetchOnline);

assert.strictEqual(saveRes.ok, true);
assert.strictEqual(saveRes.offline, false, 'Online save must flag offline: false');
assert.strictEqual(hasNote('barbell_bench_press'), true);
const summaryPill = formatSummaryPill('barbell_bench_press');
assert.strictEqual(summaryPill, 'เบาะระดับ 3 · บีบสะบักกดลงล่าง · หายใจออกตอนดัน');
console.log('✓ Online save succeeded, offline: false flagged, summary pill formatted correctly.');

// 3. Offline Resilience: Saving Note Offline Without Data Loss
console.log('\n▶ [3] Offline Resilience: Saving note when network is down...');
const mockFetchOffline = async () => {
  throw new Error('Failed to fetch (offline)');
};

const offlineSaveRes = await saveNote('cable_crossover', {
  pinSetting: 'พินเคเบิลบนสุด เบอร์ 12',
  formCues: 'โน้มตัวไปข้างหน้าเล็กน้อย',
  generalNote: 'บีบกล้ามเนื้ออกค้างไว้ 1 วินาที'
}, mockFetchOffline);

assert.strictEqual(offlineSaveRes.ok, true, 'Save must succeed optimistically even when offline');
assert.strictEqual(offlineSaveRes.offline, true, 'Must clearly flag offline: true, never falsely claim synced');
assert.ok(offlineSaveRes.warning && offlineSaveRes.warning.includes('ออฟไลน์'));

// Verify note is persisted in localStorage
const stored = readAllNotesFromStorage(mockStorage);
assert.ok(stored.cable_crossover, 'Offline note must be saved to storage');
assert.strictEqual(stored.cable_crossover.pinSetting, 'พินเคเบิลบนสุด เบอร์ 12');
assert.strictEqual(hasNote('cable_crossover'), true);
console.log('✓ Offline save preserved in storage, marked as offline: true without false sync claim.');

// 4. Fetch Conflict Resolution: Protecting Local Offline Notes from Being Overwritten
console.log('\n▶ [4] Conflict Resolution: Ensuring stale/empty server data does not overwrite local offline note...');
// Server returns empty/stale note for cable_crossover
const mockFetchEmptyServer = async (url) => {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      exerciseId: 'cable_crossover',
      pinSetting: '',
      formCues: '',
      generalNote: '',
      updatedAt: null
    })
  };
};

const freshFetch = await fetchNote('cable_crossover', mockFetchEmptyServer);
assert.strictEqual(freshFetch.pinSetting, 'พินเคเบิลบนสุด เบอร์ 12', 'Local offline note must NOT be overwritten by empty server response');
assert.strictEqual(hasNote('cable_crossover'), true);
console.log('✓ Offline note successfully protected against stale server overwrite.');

// 5. Exercise Substitution & Per-Exercise Mapping
console.log('\n▶ [5] Exercise Substitution & Per-Exercise Mapping...');
const exerciseA = { exerciseId: 'barbell_bench_press', name: 'Barbell Bench Press' };
const exerciseB = { exerciseId: 'dumbbell_bench_press', name: 'Flat Dumbbell Bench Press' };

assert.strictEqual(hasNote(exerciseA.exerciseId), true);
assert.strictEqual(formatSummaryPill(exerciseA.exerciseId), 'เบาะระดับ 3 · บีบสะบักกดลงล่าง · หายใจออกตอนดัน');

assert.strictEqual(hasNote(exerciseB.exerciseId), false);
assert.strictEqual(formatSummaryPill(exerciseB.exerciseId), '');

// Save note for Exercise B
await saveNote(exerciseB.exerciseId, {
  pinSetting: 'ดัมเบล 22.5 kg ต่อข้าง',
  formCues: 'ศอกทำมุม 45 องศา'
}, mockFetchOnline);

assert.strictEqual(hasNote(exerciseB.exerciseId), true);
assert.strictEqual(formatSummaryPill(exerciseB.exerciseId), 'ดัมเบล 22.5 kg ต่อข้าง · ศอกทำมุม 45 องศา');

// Exercise A's note is completely separate and unmodified
assert.strictEqual(formatSummaryPill(exerciseA.exerciseId), 'เบาะระดับ 3 · บีบสะบักกดลงล่าง · หายใจออกตอนดัน');
console.log('✓ Separate exercise notes maintained independently per exerciseId.');

// 6. Clearing Note
console.log('\n▶ [6] Clearing note...');
const clearRes = await clearNote('cable_crossover', mockFetchOnline);
assert.strictEqual(clearRes.ok, true);
assert.strictEqual(hasNote('cable_crossover'), false);
assert.strictEqual(formatSummaryPill('cable_crossover'), '');
console.log('✓ Clearing note successfully removes content.');

console.log('\n====================================================');
console.log('🎉 ALL EXERCISE NOTES UNIT TESTS PASSED (100%)');
console.log('====================================================');
