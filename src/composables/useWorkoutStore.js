import { ref, reactive, watch } from 'vue';
import { workoutData, EXERCISE_CANONICAL_MAP, EXERCISE_DAY_MAP, getCanonicalExerciseId, getLinkedExerciseIds, getExerciseDay } from '../data/workouts.js';
import { defaultTodos } from '../data/defaultTodos.js';

// Safe localStorage helper for both browser and SSR / unit tests
const storage = {
  getItem(key, fallback = null) {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      try {
        const val = localStorage.getItem(key);
        return val !== null ? val : fallback;
      } catch (e) {
        return fallback;
      }
    }
    return fallback;
  },
  setItem(key, val) {
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      try { localStorage.setItem(key, val); } catch (e) {}
    }
  }
};

// Active Day restoration
function getInitialDay() {
  const saved = storage.getItem('atiwitch_active_tab') || storage.getItem('jetts_active_tab');
  if (saved && (workoutData[saved] || saved === 'rest' || saved === 'history' || saved === 'todo')) {
    return saved;
  }
  const day = new Date().getDay();
  if (day === 1) return 'mon';
  if (day === 2) return 'tue';
  if (day === 3) return 'wed';
  if (day === 4) return 'thu';
  return 'rest';
}

const currentDay = ref(getInitialDay());
const currentTab = ref(storage.getItem('atiwitch_active_global_tab') || getInitialDay());
const saveStatus = ref('saved'); // 'saved', 'saving', 'error'
const toastMessage = ref('');
let toastTimer = null;

const showExerciseImages = ref(storage.getItem('atiwitch_show_images') !== 'false');

function toggleExerciseImages() {
  showExerciseImages.value = !showExerciseImages.value;
  storage.setItem('atiwitch_show_images', String(showExerciseImages.value));
  showToast(showExerciseImages.value ? 'เปิดแสดงภาพตัวอย่างท่าฝึก' : 'ซ่อนภาพตัวอย่าง (โหมดกระชับ)');
}

function showToast(msg) {
  toastMessage.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = '';
  }, 2500);
}

// Reactive store models (supports both new and previous storage keys seamlessly)
const userState = reactive(JSON.parse(storage.getItem('atiwitch_workout_state') || storage.getItem('jetts_workout_state') || '{}'));
const lastWeights = reactive(JSON.parse(storage.getItem('atiwitch_last_weights') || storage.getItem('jetts_last_weights') || '{}'));
const workoutHistory = ref(JSON.parse(storage.getItem('atiwitch_workout_history') || storage.getItem('jetts_workout_history') || '[]'));
const userTodos = ref(JSON.parse(storage.getItem('atiwitch_gym_todos') || storage.getItem('jetts_gym_todos') || JSON.stringify(defaultTodos)));

// Auto-save triggers
let syncDebounceTimer = null;

function persistLocal() {
  storage.setItem('atiwitch_workout_state', JSON.stringify(userState));
  storage.setItem('atiwitch_last_weights', JSON.stringify(lastWeights));
  storage.setItem('atiwitch_workout_history', JSON.stringify(workoutHistory.value));
  storage.setItem('atiwitch_gym_todos', JSON.stringify(userTodos.value));
}

function triggerSave(dayKey = currentDay.value) {
  saveStatus.value = 'saving';
  persistLocal();

  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(async () => {
    try {
      const payload = {
        dayKey,
        state: userState[dayKey] || {},
        weights: lastWeights
      };
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        saveStatus.value = 'saved';
      } else {
        saveStatus.value = 'saved'; // Still saved locally
      }
    } catch (e) {
      // Offline fallback: saved locally
      saveStatus.value = 'saved';
    }
  }, 400);
}

// Initial Sync with SQLite backend
async function fetchServerState() {
  try {
    const [stateRes, historyRes] = await Promise.all([
      fetch('/api/state').then(r => r.ok ? r.json() : null),
      fetch('/api/history').then(r => r.ok ? r.json() : null)
    ]);

    if (stateRes) {
      if (stateRes.drafts) {
        for (const [k, v] of Object.entries(stateRes.drafts)) {
          if (!userState[k] || Object.keys(userState[k]).length === 0) {
            userState[k] = v;
          }
        }
      }
      if (stateRes.lastWeights) {
        for (const [k, v] of Object.entries(stateRes.lastWeights)) {
          lastWeights[k] = { ...(lastWeights[k] || {}), ...v };
        }
      }
      if (stateRes.todos && stateRes.todos.length > 0) {
        userTodos.value = stateRes.todos;
      }
      healCrossDayExerciseRecords();
      persistLocal();
    }

    if (historyRes && Array.isArray(historyRes)) {
      workoutHistory.value = historyRes;
      storage.setItem('jetts_workout_history', JSON.stringify(historyRes));
    }
  } catch (err) {
    console.log('Running in local/offline mode (SQLite server unreachable)');
  }
}

// Cross-Day Exercise Sync Helpers
/**
 * Propagate a recorded weight/reps to all linked exercises across different workout days
 * (e.g. Seated Leg Press on Monday <-> Bonus Leg Press on Tue/Wed/Thu,
 *  Shoulder Press Machine on Thursday <-> Bonus Shoulder Press on Mon/Tue/Wed)
 */
function syncLinkedExerciseRecords(sourceExId, setIdx, weightVal, repsVal) {
  const linkedIds = getLinkedExerciseIds(sourceExId);
  const nowIso = new Date().toISOString();

  linkedIds.forEach(targetId => {
    if (!lastWeights[targetId]) lastWeights[targetId] = {};
    const targetObj = lastWeights[targetId];

    if (setIdx === 0) {
      // Warmup set links to warmup set (wt_0, reps_0)
      if (weightVal !== undefined && weightVal !== '') targetObj.wt_0 = weightVal;
      if (repsVal !== undefined && repsVal !== '') targetObj.reps_0 = repsVal;
    } else {
      // Working / Touchup set
      if (weightVal !== undefined && weightVal !== '') {
        if (setIdx === 1) targetObj.wt_1 = weightVal;

        // If target is a main lift (e.g. m1, t1, w2, th1), propagate working weight across all working sets (1, 2, 3)
        if (['m1', 't1', 'w2', 'th1'].includes(targetId)) {
          if (setIdx === 1) {
            targetObj.wt_1 = weightVal;
            targetObj.wt_2 = weightVal;
            targetObj.wt_3 = weightVal;
          } else {
            targetObj[`wt_${setIdx}`] = weightVal;
          }
        } else {
          // Bonus lift: only set 1 is working set
          if (setIdx === 1) targetObj.wt_1 = weightVal;
        }
      }

      if (repsVal !== undefined && repsVal !== '') {
        if (setIdx === 1) targetObj.reps_1 = repsVal;

        if (['m1', 't1', 'w2', 'th1'].includes(targetId)) {
          if (setIdx === 1) {
            targetObj.reps_1 = repsVal;
            targetObj.reps_2 = repsVal;
            targetObj.reps_3 = repsVal;
          } else {
            targetObj[`reps_${setIdx}`] = repsVal;
          }
        } else {
          // Bonus lift: only set 1 is working set
          if (setIdx === 1) targetObj.reps_1 = repsVal;
        }
      }
    }
    targetObj.updatedAt = nowIso;

    // SYNC ACTIVE DRAFTS (userState) across all days for peer exercises
    const targetDay = getExerciseDay(targetId);
    if (targetDay && targetId !== sourceExId) {
      if (!userState[targetDay]) userState[targetDay] = {};
      if (!userState[targetDay][targetId]) userState[targetDay][targetId] = {};
      const tState = userState[targetDay][targetId];

      if (setIdx === 0) {
        if (weightVal !== undefined && weightVal !== '') tState.wt_0 = weightVal;
        if (repsVal !== undefined && repsVal !== '') tState.reps_0 = repsVal;
      } else {
        if (['m1', 't1', 'w2', 'th1'].includes(targetId)) {
          if (setIdx === 1) {
            if (weightVal !== undefined && weightVal !== '') {
              tState.wt_1 = weightVal;
              tState.wt_2 = weightVal;
              tState.wt_3 = weightVal;
            }
            if (repsVal !== undefined && repsVal !== '') {
              tState.reps_1 = repsVal;
              tState.reps_2 = repsVal;
              tState.reps_3 = repsVal;
            }
          } else {
            if (weightVal !== undefined && weightVal !== '') tState[`wt_${setIdx}`] = weightVal;
            if (repsVal !== undefined && repsVal !== '') tState[`reps_${setIdx}`] = repsVal;
          }
        } else {
          // Bonus exercise (reads set 1)
          if (setIdx === 1) {
            if (weightVal !== undefined && weightVal !== '') tState.wt_1 = weightVal;
            if (repsVal !== undefined && repsVal !== '') tState.reps_1 = repsVal;
          }
        }
      }
    }
  });
}

/**
 * Intelligent cross-day last record resolver.
 * Finds the latest weights and reps recorded for an exercise either directly,
 * via linked exercises on other days (e.g. bonus vs main), or from recent history,
 * with deterministic timestamp comparison ensuring the newest session always wins!
 */
function getExerciseLastRecord(exId) {
  if (!exId) return {};

  const linked = getLinkedExerciseIds(exId);
  const canonId = getCanonicalExerciseId(exId);
  const candidates = [];

  // 1. Gather all candidates from workoutHistory (authoritative completed workouts)
  if (Array.isArray(workoutHistory.value)) {
    for (const session of workoutHistory.value) {
      if (!session || !Array.isArray(session.exercises)) continue;
      for (const ex of session.exercises) {
        if (linked.includes(ex.id) || (ex.canonicalId && ex.canonicalId === canonId)) {
          const sObj = {};
          if (Array.isArray(ex.sets)) {
            ex.sets.forEach((s, idx) => {
              if (s.weight !== undefined && s.weight !== null && s.weight !== '') {
                sObj[`wt_${idx}`] = s.weight;
              }
              if (s.actualReps !== undefined && s.actualReps !== null && s.actualReps !== '') {
                sObj[`reps_${idx}`] = s.actualReps;
              }
            });
          }
          if (Object.keys(sObj).length > 0) {
            const timePart = session.time ? (session.time.length === 5 ? `${session.time}:00` : session.time) : '12:00:00';
            const dateStr = session.date ? `${session.date}T${timePart}.000Z` : '1970-01-01T00:00:00.000Z';
            candidates.push({
              sourceId: ex.id,
              data: sObj,
              updatedAt: dateStr,
              isDirect: ex.id === exId
            });
            break;
          }
        }
      }
    }
  }

  // 2. Gather candidates from lastWeights
  for (const lId of linked) {
    const obj = lastWeights[lId];
    if (obj && (obj.wt_0 !== undefined || obj.wt_1 !== undefined || obj.wt_2 !== undefined || obj.wt_3 !== undefined)) {
      candidates.push({
        sourceId: lId,
        data: obj,
        updatedAt: obj.updatedAt || '1970-01-01',
        isDirect: lId === exId
      });
    }
  }

  if (candidates.length === 0) {
    return lastWeights[exId] || {};
  }

  // Sort candidates by updatedAt descending; if same timestamp, prefer direct exercise
  candidates.sort((a, b) => {
    if (b.updatedAt !== a.updatedAt) {
      return String(b.updatedAt).localeCompare(String(a.updatedAt));
    }
    return (b.isDirect ? 1 : 0) - (a.isDirect ? 1 : 0);
  });

  const winnerData = candidates[0].data;
  const winner = { ...winnerData, _linkedSourceId: candidates[0].sourceId };

  // Harmonize working weights across sets 1, 2, 3 so main lifts and bonus lifts seamlessly share values
  const workWt = winner.wt_1 !== undefined && winner.wt_1 !== ''
    ? winner.wt_1
    : (winner.wt_2 !== undefined && winner.wt_2 !== '' ? winner.wt_2 : (winner.wt_3 !== undefined && winner.wt_3 !== '' ? winner.wt_3 : undefined));

  const workReps = winner.reps_1 !== undefined && winner.reps_1 !== ''
    ? winner.reps_1
    : (winner.reps_2 !== undefined && winner.reps_2 !== '' ? winner.reps_2 : (winner.reps_3 !== undefined && winner.reps_3 !== '' ? winner.reps_3 : undefined));

  if (workWt !== undefined) {
    if (winner.wt_1 === undefined || winner.wt_1 === '') winner.wt_1 = workWt;
    if (winner.wt_2 === undefined || winner.wt_2 === '') winner.wt_2 = workWt;
    if (winner.wt_3 === undefined || winner.wt_3 === '') winner.wt_3 = workWt;
  }

  if (workReps !== undefined) {
    if (winner.reps_1 === undefined || winner.reps_1 === '') winner.reps_1 = workReps;
    if (winner.reps_2 === undefined || winner.reps_2 === '') winner.reps_2 = workReps;
    if (winner.reps_3 === undefined || winner.reps_3 === '') winner.reps_3 = workReps;
  }

  return winner;
}

/**
 * Run a healing sync across all linked exercise groups
 * so existing data from historical sessions immediately lights up Tuesday, Wednesday, and Thursday!
 */
function healCrossDayExerciseRecords() {
  const processed = new Set();
  for (const [exId, canon] of Object.entries(EXERCISE_CANONICAL_MAP)) {
    if (processed.has(canon)) continue;
    processed.add(canon);

    const linked = getLinkedExerciseIds(exId);
    const candidates = [];

    // 1. Check workoutHistory first (authoritative historical sessions)
    if (Array.isArray(workoutHistory.value)) {
      for (const session of workoutHistory.value) {
        if (!session || !Array.isArray(session.exercises)) continue;
        for (const ex of session.exercises) {
          if (linked.includes(ex.id) || (ex.canonicalId && ex.canonicalId === canon)) {
            const sObj = {};
            if (Array.isArray(ex.sets)) {
              ex.sets.forEach((s, idx) => {
                if (s.weight !== undefined && s.weight !== null && s.weight !== '') {
                  sObj[`wt_${idx}`] = s.weight;
                }
                if (s.actualReps !== undefined && s.actualReps !== null && s.actualReps !== '') {
                  sObj[`reps_${idx}`] = s.actualReps;
                }
              });
            }
            if (Object.keys(sObj).length > 0) {
              const timePart = session.time ? (session.time.length === 5 ? `${session.time}:00` : session.time) : '12:00:00';
              const dateStr = session.date ? `${session.date}T${timePart}.000Z` : '1970-01-01T00:00:00.000Z';
              candidates.push({
                id: ex.id,
                rec: sObj,
                updatedAt: dateStr
              });
              break;
            }
          }
        }
      }
    }

    // 2. Check lastWeights for all linked IDs
    for (const lId of linked) {
      const rec = lastWeights[lId];
      if (rec && (rec.wt_0 !== undefined || rec.wt_1 !== undefined || rec.wt_2 !== undefined)) {
        candidates.push({
          id: lId,
          rec,
          updatedAt: rec.updatedAt || '1970-01-01'
        });
      }
    }

    if (candidates.length === 0) continue;

    // Pick newest candidate by timestamp
    candidates.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const bestRecord = candidates[0].rec;
    const bestDate = candidates[0].updatedAt;

    const wt0 = bestRecord.wt_0;
    const r0 = bestRecord.reps_0;
    const wt1 = bestRecord.wt_1 !== undefined && bestRecord.wt_1 !== ''
      ? bestRecord.wt_1
      : (bestRecord.wt_2 !== undefined && bestRecord.wt_2 !== '' ? bestRecord.wt_2 : bestRecord.wt_3);
    const r1 = bestRecord.reps_1 !== undefined && bestRecord.reps_1 !== ''
      ? bestRecord.reps_1
      : (bestRecord.reps_2 !== undefined && bestRecord.reps_2 !== '' ? bestRecord.reps_2 : bestRecord.reps_3);

    linked.forEach(lId => {
      if (!lastWeights[lId]) lastWeights[lId] = {};
      if (wt0 !== undefined && wt0 !== '') lastWeights[lId].wt_0 = wt0;
      if (r0 !== undefined && r0 !== '') lastWeights[lId].reps_0 = r0;
      if (wt1 !== undefined && wt1 !== '') {
        lastWeights[lId].wt_1 = wt1;
        if (['th1', 't1', 'w2', 'm1'].includes(lId)) {
          lastWeights[lId].wt_2 = wt1;
          lastWeights[lId].wt_3 = wt1;
        }
      }
      if (r1 !== undefined && r1 !== '') {
        lastWeights[lId].reps_1 = r1;
        if (['th1', 't1', 'w2', 'm1'].includes(lId)) {
          lastWeights[lId].reps_2 = r1;
          lastWeights[lId].reps_3 = r1;
        }
      }
      lastWeights[lId].updatedAt = bestDate;

      // Update draft state for linked exercise across all days
      const targetDay = getExerciseDay(lId);
      if (targetDay) {
        if (!userState[targetDay]) userState[targetDay] = {};
        if (!userState[targetDay][lId]) userState[targetDay][lId] = {};
        const tState = userState[targetDay][lId];
        if (wt0 !== undefined && wt0 !== '') tState.wt_0 = wt0;
        if (r0 !== undefined && r0 !== '') tState.reps_0 = r0;
        if (wt1 !== undefined && wt1 !== '') {
          tState.wt_1 = wt1;
          if (['th1', 't1', 'w2', 'm1'].includes(lId)) {
            tState.wt_2 = wt1;
            tState.wt_3 = wt1;
          }
        }
        if (r1 !== undefined && r1 !== '') {
          tState.reps_1 = r1;
          if (['th1', 't1', 'w2', 'm1'].includes(lId)) {
            tState.reps_2 = r1;
            tState.reps_3 = r1;
          }
        }
      }
    });
  }
}

// Initial heal pass on store startup
healCrossDayExerciseRecords();

// Actions
function switchDay(dayKey) {
  currentDay.value = dayKey;
  currentTab.value = dayKey;
  storage.setItem('atiwitch_active_tab', dayKey);
  storage.setItem('atiwitch_active_global_tab', dayKey);
}

function switchTab(tabKey) {
  currentTab.value = tabKey;
  if (['mon', 'tue', 'wed', 'thu', 'rest', 'todo', 'history'].includes(tabKey)) {
    currentDay.value = tabKey;
    storage.setItem('atiwitch_active_tab', tabKey);
  }
  storage.setItem('atiwitch_active_global_tab', tabKey);
}

function updateWeight(day, exId, setIdx, val) {
  if (!userState[day]) userState[day] = {};
  if (!userState[day][exId]) userState[day][exId] = {};
  userState[day][exId][`wt_${setIdx}`] = val;

  if (val !== '' && val !== undefined) {
    if (!lastWeights[exId]) lastWeights[exId] = {};
    lastWeights[exId][`wt_${setIdx}`] = val;
    lastWeights[exId].updatedAt = new Date().toISOString().split('T')[0];

    // Sync across linked exercises on other days (e.g. bonus vs main)
    syncLinkedExerciseRecords(exId, setIdx, val, undefined);
  }

  triggerSave(day);
}

function updateReps(day, exId, setIdx, val) {
  if (!userState[day]) userState[day] = {};
  if (!userState[day][exId]) userState[day][exId] = {};
  userState[day][exId][`reps_${setIdx}`] = val;

  if (val !== '' && val !== undefined) {
    if (!lastWeights[exId]) lastWeights[exId] = {};
    lastWeights[exId][`reps_${setIdx}`] = val;
    lastWeights[exId].updatedAt = new Date().toISOString().split('T')[0];

    // Sync across linked exercises on other days (e.g. bonus vs main)
    syncLinkedExerciseRecords(exId, setIdx, undefined, val);
  }

  triggerSave(day);
}

function applyPrevRecord(day, exId, setIdx, prevWt, prevReps) {
  if (prevWt !== undefined && prevWt !== '') {
    updateWeight(day, exId, setIdx, prevWt);
  }
  if (prevReps !== undefined && prevReps !== '') {
    updateReps(day, exId, setIdx, prevReps);
  }
  showToast(`ใส่สถิติ ${prevWt || 0} กก. (${prevReps || 0} ครั้ง) แล้ว`);
}

function applyPrevWeight(day, exId, setIdx, prevWt) {
  updateWeight(day, exId, setIdx, prevWt);
  showToast(`ใส่น้ำหนัก ${prevWt} กก.`);
}

function toggleSetDone(day, exId, setIdx) {
  if (!userState[day]) userState[day] = {};
  if (!userState[day][exId]) userState[day][exId] = {};

  const current = !!userState[day][exId][`set_${setIdx}`];
  userState[day][exId][`set_${setIdx}`] = !current;
  triggerSave(day);
  return !current; // returns true if now checked
}

async function resetDayData(day = currentDay.value) {
  if (userState[day]) {
    delete userState[day];
    persistLocal();
    try {
      await fetch('/api/reset-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayKey: day })
      });
    } catch (e) {}
    showToast('ล้างการติ๊กของวันนี้เรียบร้อย');
  }
}

async function finishAndSaveWorkout() {
  const dayData = workoutData[currentDay.value];
  if (!dayData) return;

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
  const dayState = userState[currentDay.value] || {};

  let totalSetsDone = 0;
  const sessionExercises = [];

  // Standard exercises
  for (const ex of dayData.exercises) {
    const exState = dayState[ex.id] || {};
    const sets = ex.sets.map((set, sIdx) => {
      const isDone = !!exState[`set_${sIdx}`];
      if (isDone) totalSetsDone++;
      const wt = (exState[`wt_${sIdx}`] !== undefined && exState[`wt_${sIdx}`] !== '')
        ? exState[`wt_${sIdx}`]
        : (lastWeights[ex.id] && lastWeights[ex.id][`wt_${sIdx}`]) || '';

      const reps = (exState[`reps_${sIdx}`] !== undefined && exState[`reps_${sIdx}`] !== '')
        ? exState[`reps_${sIdx}`]
        : (lastWeights[ex.id] && lastWeights[ex.id][`reps_${sIdx}`]) || '';

      if (wt !== '') {
        if (!lastWeights[ex.id]) lastWeights[ex.id] = {};
        lastWeights[ex.id][`wt_${sIdx}`] = wt;
        syncLinkedExerciseRecords(ex.id, sIdx, wt, undefined);
      }
      if (reps !== '') {
        if (!lastWeights[ex.id]) lastWeights[ex.id] = {};
        lastWeights[ex.id][`reps_${sIdx}`] = reps;
        syncLinkedExerciseRecords(ex.id, sIdx, undefined, reps);
      }

      return {
        setIndex: sIdx + 1,
        type: set.type === 'warm' ? 'วอร์ม' : 'เล่นจริง',
        target: set.reps,
        weight: wt,
        actualReps: reps,
        done: isDone
      };
    });

    sessionExercises.push({
      id: ex.id,
      name: ex.name,
      category: ex.isMain ? 'ท่าหลัก' : 'ท่าเสริม',
      sets
    });
  }

  // Bonus exercises
  if (dayData.bonusExercises) {
    for (const bEx of dayData.bonusExercises) {
      const bState = dayState[bEx.id] || {};
      const sets = bEx.sets.map((set, sIdx) => {
        const isDone = !!bState[`set_${sIdx}`];
        if (isDone) totalSetsDone++;
        const wt = (bState[`wt_${sIdx}`] !== undefined && bState[`wt_${sIdx}`] !== '')
          ? bState[`wt_${sIdx}`]
          : (lastWeights[bEx.id] && lastWeights[bEx.id][`wt_${sIdx}`]) || '';

        const reps = (bState[`reps_${sIdx}`] !== undefined && bState[`reps_${sIdx}`] !== '')
          ? bState[`reps_${sIdx}`]
          : (lastWeights[bEx.id] && lastWeights[bEx.id][`reps_${sIdx}`]) || '';

        if (wt !== '') {
          if (!lastWeights[bEx.id]) lastWeights[bEx.id] = {};
          lastWeights[bEx.id][`wt_${sIdx}`] = wt;
          syncLinkedExerciseRecords(bEx.id, sIdx, wt, undefined);
        }
        if (reps !== '') {
          if (!lastWeights[bEx.id]) lastWeights[bEx.id] = {};
          lastWeights[bEx.id][`reps_${sIdx}`] = reps;
          syncLinkedExerciseRecords(bEx.id, sIdx, undefined, reps);
        }

        return {
          setIndex: sIdx + 1,
          type: set.type === 'warm' ? 'วอร์ม' : 'ซ้อมเสริม',
          target: set.reps,
          weight: wt,
          actualReps: reps,
          done: isDone
        };
      });

      sessionExercises.push({
        id: bEx.id,
        name: bEx.name,
        category: 'ซ้อมเสริม',
        sets
      });
    }
  }

  const session = {
    id: `${dateStr}_${currentDay.value}_${Date.now()}`,
    date: dateStr,
    time: timeStr,
    dayKey: currentDay.value,
    dayTitle: dayData.title,
    totalSetsDone,
    exercises: sessionExercises
  };

  await recordSessionToHistory(session);

  // Sync latest weights and draft state to SQLite backend
  if (typeof fetch === 'function') {
    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayKey: currentDay.value,
          state: userState[currentDay.value] || {},
          weights: lastWeights
        })
      });
    } catch (e) {}
  }

  showToast(`บันทึกประวัติสำเร็จ (${totalSetsDone} เซ็ต)`);
}

async function recordSessionToHistory(session) {
  if (!session || !session.id) return;
  if (!workoutHistory.value.some(s => s.id === session.id)) {
    workoutHistory.value.unshift(session);
  }
  persistLocal();

  if (typeof fetch === 'function') {
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session)
      });
    } catch (e) {}
  }
}

async function deleteSession(id) {
  workoutHistory.value = workoutHistory.value.filter(s => s.id !== id);
  persistLocal();
  try {
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
  } catch (e) {}
  showToast('ลบรายการประวัติแล้ว');
}

// Todos
async function addTodo(text) {
  if (!text || !text.trim()) return;
  const newTodo = {
    id: String(Date.now()),
    text: text.trim(),
    done: false
  };
  userTodos.value.push(newTodo);
  persistLocal();
  try {
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todos: userTodos.value })
    });
  } catch (e) {}
}

async function toggleTodo(id) {
  const todo = userTodos.value.find(t => t.id === id);
  if (todo) {
    todo.done = !todo.done;
    persistLocal();
    try {
      await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todos: userTodos.value })
      });
    } catch (e) {}
  }
}

async function deleteTodo(id) {
  userTodos.value = userTodos.value.filter(t => t.id !== id);
  persistLocal();
  try {
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todos: userTodos.value })
    });
  } catch (e) {}
}

export function useWorkoutStore() {
  return {
    workoutData,
    currentDay,
    currentTab,
    saveStatus,
    toastMessage,
    userState,
    lastWeights,
    workoutHistory,
    userTodos,
    switchDay,
    switchTab,
    updateWeight,
    updateReps,
    applyPrevWeight,
    applyPrevRecord,
    toggleSetDone,
    resetDayData,
    finishAndSaveWorkout,
    deleteSession,
    addTodo,
    toggleTodo,
    deleteTodo,
    getCanonicalExerciseId,
    getLinkedExerciseIds,
    getExerciseLastRecord,
    syncLinkedExerciseRecords,
    showToast,
    fetchServerState,
    recordSessionToHistory,
    persistLocal,
    showExerciseImages,
    toggleExerciseImages
  };
}
