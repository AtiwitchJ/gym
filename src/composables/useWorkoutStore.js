import { ref, reactive, watch } from 'vue';
import { workoutData } from '../data/workouts';
import { defaultTodos } from '../data/defaultTodos';

// Active Day restoration
function getInitialDay() {
  const saved = localStorage.getItem('atiwitch_active_tab') || localStorage.getItem('jetts_active_tab');
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
const saveStatus = ref('saved'); // 'saved', 'saving', 'error'
const toastMessage = ref('');
let toastTimer = null;

function showToast(msg) {
  toastMessage.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = '';
  }, 2500);
}

// Reactive store models (supports both new and previous storage keys seamlessly)
const userState = reactive(JSON.parse(localStorage.getItem('atiwitch_workout_state') || localStorage.getItem('jetts_workout_state') || '{}'));
const lastWeights = reactive(JSON.parse(localStorage.getItem('atiwitch_last_weights') || localStorage.getItem('jetts_last_weights') || '{}'));
const workoutHistory = ref(JSON.parse(localStorage.getItem('atiwitch_workout_history') || localStorage.getItem('jetts_workout_history') || '[]'));
const userTodos = ref(JSON.parse(localStorage.getItem('atiwitch_gym_todos') || localStorage.getItem('jetts_gym_todos') || JSON.stringify(defaultTodos)));

// Auto-save triggers
let syncDebounceTimer = null;

function persistLocal() {
  localStorage.setItem('atiwitch_workout_state', JSON.stringify(userState));
  localStorage.setItem('atiwitch_last_weights', JSON.stringify(lastWeights));
  localStorage.setItem('atiwitch_workout_history', JSON.stringify(workoutHistory.value));
  localStorage.setItem('atiwitch_gym_todos', JSON.stringify(userTodos.value));
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
      persistLocal();
    }

    if (historyRes && Array.isArray(historyRes)) {
      workoutHistory.value = historyRes;
      localStorage.setItem('jetts_workout_history', JSON.stringify(historyRes));
    }
  } catch (err) {
    console.log('Running in local/offline mode (SQLite server unreachable)');
  }
}

// Actions
function switchDay(dayKey) {
  currentDay.value = dayKey;
  localStorage.setItem('atiwitch_active_tab', dayKey);
}

function updateWeight(day, exId, setIdx, val) {
  if (!userState[day]) userState[day] = {};
  if (!userState[day][exId]) userState[day][exId] = {};
  userState[day][exId][`wt_${setIdx}`] = val;

  if (val !== '' && val !== undefined) {
    if (!lastWeights[exId]) lastWeights[exId] = {};
    lastWeights[exId][`wt_${setIdx}`] = val;
    lastWeights[exId].updatedAt = new Date().toISOString().split('T')[0];
  }

  triggerSave(day);
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

      if (wt !== '') {
        if (!lastWeights[ex.id]) lastWeights[ex.id] = {};
        lastWeights[ex.id][`wt_${sIdx}`] = wt;
      }

      return {
        setIndex: sIdx + 1,
        type: set.type === 'warm' ? 'วอร์ม' : 'เล่นจริง',
        target: set.reps,
        weight: wt,
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

        if (wt !== '') {
          if (!lastWeights[bEx.id]) lastWeights[bEx.id] = {};
          lastWeights[bEx.id][`wt_${sIdx}`] = wt;
        }

        return {
          setIndex: sIdx + 1,
          type: set.type === 'warm' ? 'วอร์ม' : 'ซ้อมเสริม',
          target: set.reps,
          weight: wt,
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

  workoutHistory.value.unshift(session);
  persistLocal();

  try {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
  } catch (e) {}

  showToast(`บันทึกประวัติสำเร็จ (${totalSetsDone} เซ็ต)`);
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
    saveStatus,
    toastMessage,
    userState,
    lastWeights,
    workoutHistory,
    userTodos,
    switchDay,
    updateWeight,
    applyPrevWeight,
    toggleSetDone,
    resetDayData,
    finishAndSaveWorkout,
    deleteSession,
    addTodo,
    toggleTodo,
    deleteTodo,
    showToast,
    fetchServerState
  };
}
