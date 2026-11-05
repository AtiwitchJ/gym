import { ref, computed } from 'vue';
import { useTimer } from './useTimer.js';
import { useWeightAdvisor, isWarmupType } from './useWeightAdvisor.js';
import { useExerciseStore } from './useExerciseStore.js';
import { useWorkoutStore } from './useWorkoutStore.js';

const STORAGE_KEY_DRAFT = 'active_session_draft';
const STORAGE_KEY_HISTORY = 'global_session_history';

/**
 * Safely read JSON from localStorage
 */
function safeGetStorage(key) {
  if (typeof localStorage !== 'undefined') {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.warn(`[useActiveSessionStore] Failed reading ${key}:`, e);
    }
  }
  return null;
}

/**
 * Safely persist JSON to localStorage
 */
function safeSetStorage(key, value) {
  if (typeof localStorage !== 'undefined') {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {
      console.warn(`[useActiveSessionStore] Failed saving ${key}:`, e);
    }
  }
}

// Module-level reactive singleton state
const savedDraft = safeGetStorage(STORAGE_KEY_DRAFT);
const savedHistory = safeGetStorage(STORAGE_KEY_HISTORY) || [];

const isWorkoutActive = ref(Boolean(savedDraft && savedDraft.exercises));
const activeSession = ref(savedDraft || null);
const sessionDurationSec = ref(0);
const sessionHistory = ref(Array.isArray(savedHistory) ? savedHistory : []);

let durationInterval = null;

function startDurationTicker() {
  stopDurationTicker();
  if (!activeSession.value) return;

  const startTime = activeSession.value.startTime || Date.now();
  sessionDurationSec.value = Math.max(0, Math.floor((Date.now() - startTime) / 1000));

  durationInterval = setInterval(() => {
    if (activeSession.value && activeSession.value.startTime) {
      sessionDurationSec.value = Math.max(0, Math.floor((Date.now() - activeSession.value.startTime) / 1000));
    }
  }, 1000);

  if (durationInterval && typeof durationInterval.unref === 'function') {
    durationInterval.unref();
  }
}

function stopDurationTicker() {
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
}

// If recovered from draft on load, start ticker
if (isWorkoutActive.value) {
  startDurationTicker();
}

/**
 * Persist current active session draft to storage
 */
function persistDraft() {
  if (isWorkoutActive.value && activeSession.value) {
    safeSetStorage(STORAGE_KEY_DRAFT, activeSession.value);
  } else {
    safeSetStorage(STORAGE_KEY_DRAFT, null);
  }
}

/**
 * Calculate total working volume for completed sets (excluding warmup sets)
 */
export function calculateTotalWorkingVolume(exercises = []) {
  if (!Array.isArray(exercises)) return 0;
  let total = 0;
  for (const ex of exercises) {
    if (!Array.isArray(ex.sets)) continue;
    for (const set of ex.sets) {
      if (set && set.completed && !isWarmupType(set.type)) {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps, 10) || 0;
        total += weight * reps;
      }
    }
  }
  return Math.round(total * 10) / 10;
}

/**
 * Count total completed sets across all exercises
 */
function countCompletedSets(exercises = []) {
  if (!Array.isArray(exercises)) return 0;
  let count = 0;
  for (const ex of exercises) {
    if (!Array.isArray(ex.sets)) continue;
    for (const set of ex.sets) {
      if (set && set.completed) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Find last performance of an exercise in workout history
 */
function findExercisePastPerformance(exerciseId, historyList = []) {
  if (!exerciseId || !Array.isArray(historyList)) return null;

  for (const session of historyList) {
    if (!session || !Array.isArray(session.exercises)) continue;
    const matchedEx = session.exercises.find(e => e.exerciseId === exerciseId);
    if (matchedEx && Array.isArray(matchedEx.sets) && matchedEx.sets.length > 0) {
      return matchedEx.sets;
    }
  }
  return null;
}

/**
 * Compute weight advice for an exercise given history
 */
function getSuggestedWeightAdvice(exerciseId, historyList) {
  const pastSets = findExercisePastPerformance(exerciseId, historyList);
  if (!pastSets) return null;

  const { getExerciseOverallAdvice } = useWeightAdvisor();
  return getExerciseOverallAdvice(pastSets);
}

/**
 * Start a live workout session from a routine definition
 * @param {Object} routine Routine object with { id, title, exercises }
 * @param {Object} options Optional configuration { history }
 */
function startSessionFromRoutine(routine = {}, options = {}) {
  const now = Date.now();
  const historyList = options.history || sessionHistory.value;
  const exerciseStore = useExerciseStore();

  const routineExercises = Array.isArray(routine.exercises) ? routine.exercises : [];

  const preparedExercises = routineExercises.map(item => {
    const exMeta = exerciseStore.getExerciseById(item.exerciseId);
    const advice = getSuggestedWeightAdvice(item.exerciseId, historyList);

    const preparedSets = (Array.isArray(item.sets) ? item.sets : []).map(set => {
      const isWarm = isWarmupType(set.type);
      let suggestedWeight = undefined;

      if (!isWarm && advice && advice.suggestedWeight !== undefined) {
        suggestedWeight = advice.suggestedWeight;
      } else if (isWarm && advice && advice.warmAdvice && advice.warmAdvice.suggestedWeight !== undefined) {
        suggestedWeight = advice.warmAdvice.suggestedWeight;
      }

      const defaultWeight = set.targetWeight !== undefined
        ? set.targetWeight
        : (suggestedWeight !== undefined ? suggestedWeight : 0);

      const defaultReps = set.targetReps !== undefined
        ? set.targetReps
        : (isWarm ? 15 : 8);

      return {
        type: set.type || 'working',
        targetWeight: defaultWeight,
        targetReps: defaultReps,
        weight: defaultWeight,
        reps: defaultReps,
        suggestedWeight,
        completed: false,
        completedAt: null
      };
    });

    return {
      exerciseId: item.exerciseId,
      name: exMeta?.name || item.name || item.exerciseId,
      muscleGroup: exMeta?.muscleGroup || item.muscleGroup || 'other',
      equipment: exMeta?.equipment || item.equipment || 'other',
      restSec: item.restSec !== undefined ? item.restSec : 90,
      sets: preparedSets
    };
  });

  activeSession.value = {
    id: `session_${now}_${Math.random().toString(36).slice(2, 7)}`,
    routineId: routine.id || null,
    title: routine.title ? String(routine.title).trim() : 'Workout Session',
    subtitle: routine.subtitle ? String(routine.subtitle).trim() : '',
    startTime: now,
    startedAt: new Date(now).toISOString(),
    exercises: preparedExercises
  };

  isWorkoutActive.value = true;
  persistDraft();
  startDurationTicker();
}

/**
 * Start a blank workout session
 */
function startEmptySession(options = {}) {
  const now = Date.now();
  activeSession.value = {
    id: `session_${now}_${Math.random().toString(36).slice(2, 7)}`,
    routineId: null,
    title: options.title ? String(options.title).trim() : 'Quick Workout',
    subtitle: options.subtitle || '',
    startTime: now,
    startedAt: new Date(now).toISOString(),
    exercises: []
  };

  isWorkoutActive.value = true;
  persistDraft();
  startDurationTicker();
}

/**
 * Add an exercise to active session
 */
function addExerciseToActiveSession(exerciseId, customSets = null) {
  if (!isWorkoutActive.value || !activeSession.value) return null;

  const exerciseStore = useExerciseStore();
  const exMeta = exerciseStore.getExerciseById(exerciseId);
  const advice = getSuggestedWeightAdvice(exerciseId, sessionHistory.value);

  let sets = customSets;
  if (!Array.isArray(sets) || sets.length === 0) {
    const suggestedWorkWeight = (advice && advice.suggestedWeight !== undefined) ? advice.suggestedWeight : 0;
    sets = [
      {
        type: 'warmup',
        targetReps: 15,
        targetWeight: 0,
        weight: 0,
        reps: 15,
        completed: false,
        completedAt: null
      },
      {
        type: 'working',
        targetReps: 8,
        targetWeight: suggestedWorkWeight,
        weight: suggestedWorkWeight,
        reps: 8,
        suggestedWeight: advice?.suggestedWeight,
        completed: false,
        completedAt: null
      },
      {
        type: 'working',
        targetReps: 8,
        targetWeight: suggestedWorkWeight,
        weight: suggestedWorkWeight,
        reps: 8,
        suggestedWeight: advice?.suggestedWeight,
        completed: false,
        completedAt: null
      }
    ];
  }

  const newExercise = {
    exerciseId,
    name: exMeta?.name || exerciseId,
    muscleGroup: exMeta?.muscleGroup || 'other',
    equipment: exMeta?.equipment || 'other',
    restSec: 90,
    sets
  };

  activeSession.value.exercises.push(newExercise);
  persistDraft();
  return newExercise;
}

/**
 * Remove an exercise from active session by index
 */
function removeExerciseFromActiveSession(index) {
  if (!isWorkoutActive.value || !activeSession.value) return false;
  if (index >= 0 && index < activeSession.value.exercises.length) {
    activeSession.value.exercises.splice(index, 1);
    persistDraft();
    return true;
  }
  return false;
}

/**
 * Add a new set to an exercise in the active session
 */
function addSet(exerciseIndex, setData = null) {
  if (!isWorkoutActive.value || !activeSession.value) return null;
  const ex = activeSession.value.exercises[exerciseIndex];
  if (!ex) return null;

  const lastSet = ex.sets[ex.sets.length - 1];
  const newSet = setData || {
    type: lastSet ? lastSet.type : 'working',
    targetReps: lastSet ? lastSet.targetReps : 8,
    targetWeight: lastSet ? lastSet.targetWeight : 0,
    weight: lastSet ? lastSet.weight : 0,
    reps: lastSet ? lastSet.reps : 8,
    completed: false,
    completedAt: null
  };

  ex.sets.push(newSet);
  persistDraft();
  return newSet;
}

/**
 * Remove a set from an exercise
 */
function removeSet(exerciseIndex, setIndex) {
  if (!isWorkoutActive.value || !activeSession.value) return false;
  const ex = activeSession.value.exercises[exerciseIndex];
  if (!ex || !Array.isArray(ex.sets)) return false;

  if (setIndex >= 0 && setIndex < ex.sets.length) {
    ex.sets.splice(setIndex, 1);
    persistDraft();
    return true;
  }
  return false;
}

/**
 * Update a specific set's metric (weight, reps, rpe, type, etc.)
 */
function updateSetMetric(exerciseIndex, setIndex, field, value) {
  if (!isWorkoutActive.value || !activeSession.value) return false;
  const ex = activeSession.value.exercises[exerciseIndex];
  if (!ex || !ex.sets || !ex.sets[setIndex]) return false;

  ex.sets[setIndex][field] = value;
  persistDraft();
  return true;
}

/**
 * Toggle completion status of a set. Automatically triggers rest timer when marked complete.
 */
function toggleSetComplete(exerciseIndex, setIndex) {
  if (!isWorkoutActive.value || !activeSession.value) return false;
  const ex = activeSession.value.exercises[exerciseIndex];
  if (!ex || !ex.sets || !ex.sets[setIndex]) return false;

  const targetSet = ex.sets[setIndex];
  const nextCompletedState = !targetSet.completed;
  targetSet.completed = nextCompletedState;
  targetSet.completedAt = nextCompletedState ? new Date().toISOString() : null;

  if (nextCompletedState) {
    const timer = useTimer();
    const restSeconds = typeof ex.restSec === 'number' && ex.restSec > 0 ? ex.restSec : 90;
    timer.setTimerDuration(restSeconds);
    timer.startTimer();
  }

  persistDraft();
  return targetSet.completed;
}

function countTotalSets(exercises = []) {
  if (!Array.isArray(exercises)) return 0;
  let count = 0;
  for (const ex of exercises) {
    if (!Array.isArray(ex.sets)) continue;
    count += ex.sets.length;
  }
  return count;
}

/**
 * Finish the active workout session, persist to history, and clear active draft
 */
function finishSession() {
  if (!isWorkoutActive.value || !activeSession.value) return null;

  const now = Date.now();
  const finishedIso = new Date(now).toISOString();
  const completedCount = countCompletedSets(activeSession.value.exercises);
  const totalCount = countTotalSets(activeSession.value.exercises);

  const summary = {
    ...activeSession.value,
    finishedAt: finishedIso,
    completedAt: finishedIso,
    endTime: now,
    durationSec: sessionDurationSec.value,
    totalVolumeKg: calculateTotalWorkingVolume(activeSession.value.exercises),
    totalSetsCompleted: completedCount,
    completedSetsCount: completedCount,
    totalSetsCount: totalCount
  };

  sessionHistory.value.unshift(summary);
  safeSetStorage(STORAGE_KEY_HISTORY, sessionHistory.value);

  // Clear active workout state
  discardSession();

  // Cross-sync session to unified workout history & SQLite backend
  try {
    const { recordSessionToHistory, lastWeights } = useWorkoutStore();
    const dateObj = new Date(now);
    const dateStr = dateObj.toISOString().split('T')[0];
    const timeStr = dateObj.toTimeString().split(' ')[0].substring(0, 5);

    const sessionExercises = (summary.exercises || []).map(ex => {
      const exId = ex.exerciseId || ex.id || 'ex';
      return {
        id: exId,
        name: ex.name || 'แบบฝึก',
        category: ex.targetMuscle || 'เวทเทรนนิ่ง',
        sets: (ex.sets || []).map((s, sIdx) => ({
          setIndex: sIdx + 1,
          type: s.type === 'warmup' ? 'วอร์ม' : 'เล่นจริง',
          target: s.targetReps || s.reps || 8,
          weight: (s.weight !== undefined && s.weight !== '') ? Number(s.weight) : 0,
          actualReps: (s.reps !== undefined && s.reps !== '') ? Number(s.reps) : (s.targetReps || 0),
          done: Boolean(s.completed)
        }))
      };
    });

    const unifiedSession = {
      id: summary.id || `${dateStr}_runner_${now}`,
      date: dateStr,
      time: timeStr,
      dayKey: summary.dayKey || summary.routineId || 'active_run',
      dayTitle: summary.title || 'Live Workout Session',
      totalSetsDone: completedCount,
      durationSec: summary.durationSec || 0,
      totalVolumeKg: summary.totalVolumeKg || 0,
      exercises: sessionExercises
    };

    // Update in-memory lastWeights for progressive overload advisor
    for (const ex of sessionExercises) {
      if (!lastWeights[ex.id]) lastWeights[ex.id] = {};
      for (const s of ex.sets) {
        if (s.done && (s.weight > 0 || s.actualReps > 0)) {
          lastWeights[ex.id][`wt_${s.setIndex - 1}`] = s.weight;
          lastWeights[ex.id][`reps_${s.setIndex - 1}`] = s.actualReps;
        }
      }
    }

    recordSessionToHistory(unifiedSession);
  } catch (err) {
    // Non-blocking in headless or testing environments
  }

  return summary;
}

/**
 * Discard the current active session without recording to history
 */
function discardSession() {
  stopDurationTicker();
  activeSession.value = null;
  isWorkoutActive.value = false;
  sessionDurationSec.value = 0;
  safeSetStorage(STORAGE_KEY_DRAFT, null);
}

/**
 * Composable store for active workout tracking
 */
export function useActiveSessionStore() {
  return {
    isWorkoutActive,
    activeSession,
    sessionDurationSec,
    sessionHistory,
    startSessionFromRoutine,
    startEmptySession,
    addExerciseToActiveSession,
    removeExerciseFromActiveSession,
    addSet,
    removeSet,
    updateSetMetric,
    toggleSetComplete,
    finishSession,
    discardSession,
    calculateTotalWorkingVolume
  };
}
