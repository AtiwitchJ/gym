import { ref, computed } from 'vue';
import { useTimer } from './useTimer.js';
import { useWeightAdvisor, isWarmupType, isDropType } from './useWeightAdvisor.js';
import { useExerciseStore } from './useExerciseStore.js';
import { useWorkoutStore } from './useWorkoutStore.js';
import { collectSessionPrs } from './usePersonalRecords.js';
import { buildWarmupSets, DEFAULT_WARMUP_PLAN, isWarmSetType } from './warmupCalc.js';

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
 * Check if an exercise in the active session already has warmup sets
 */
export function hasWarmupSets(exercise) {
  if (!exercise || !Array.isArray(exercise.sets)) return false;
  return exercise.sets.some(s => isWarmSetType(s?.type) || Boolean(s?.isWarm) || Boolean(s?._generatedWarmup));
}

/**
 * Get the reference working weight from an exercise's working sets
 */
export function getExerciseWorkingWeight(exercise) {
  if (!exercise || !Array.isArray(exercise.sets)) return 0;
  for (const s of exercise.sets) {
    if (!isWarmSetType(s?.type) && !s?.isWarm) {
      const rawVal = s.weight !== undefined && s.weight !== null && s.weight !== ''
        ? s.weight
        : (s.targetWeight !== undefined && s.targetWeight !== null && s.targetWeight !== '' ? s.targetWeight : null);
      const num = parseFloat(rawVal);
      if (Number.isFinite(num) && num > 0) return num;
    }
  }
  return 0;
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
      if (set && set.completed && !isWarmupType(set.type) && !isWarmSetType(set.type) && !set.isWarm) {
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
 * Clone a historical workout session into a fresh active session format.
 * Resets all set completion states, clears timestamps, and generates a new session id.
 * Handles legacy, empty, and partial data safely.
 *
 * @param {Object} historySession Historical session from SQLite or sessionHistory
 * @returns {Object} Fresh active session definition ready for execution
 */
export function cloneSessionToActive(historySession = {}) {
  const now = Date.now();
  const exerciseStore = useExerciseStore();
  const rawExercises = Array.isArray(historySession?.exercises) ? historySession.exercises : [];

  const clonedExercises = rawExercises.map((item, exIdx) => {
    const exId = item.exerciseId || item.id || item.canonicalId || item.canonical_id || `ex_${exIdx + 1}`;
    const exMeta = exerciseStore.getExerciseById(exId);

    const rawSets = Array.isArray(item.sets) ? item.sets : [];
    const clonedSets = rawSets.map((s) => {
      const isWarm = isWarmupType(s.type);
      const isDrop = isDropType(s.type);
      let setType = 'working';
      if (isWarm) setType = 'warmup';
      else if (isDrop) setType = 'dropset';
      else if (s.type === 'failure' || s.type === 'fail' || s.type === 'ล้มเหลว') setType = 'failure';
      else if (s.type) {
        const t = String(s.type).toLowerCase().trim();
        if (t === 'warm' || t === 'warmup' || t === 'วอร์ม') setType = 'warmup';
        else if (t === 'drop' || t === 'dropset' || t === 'ดรอป' || t === 'ดรอปเซ็ต' || t === 'd') setType = 'dropset';
        else if (t === 'failure') setType = 'failure';
      }

      // Weight resolution
      // Use available weight when there is no explicit targetWeight: s.targetWeight ?? s.weight ?? 0
      let targetWeightVal = 0;
      if (s.targetWeight !== undefined && s.targetWeight !== null && s.targetWeight !== '') {
        const parsedTW = parseFloat(s.targetWeight);
        targetWeightVal = isNaN(parsedTW) ? 0 : parsedTW;
      } else if (s.weight !== undefined && s.weight !== null && s.weight !== '') {
        const parsedW = parseFloat(s.weight);
        targetWeightVal = isNaN(parsedW) ? 0 : parsedW;
      }

      let weightVal = targetWeightVal;
      if (s.weight !== undefined && s.weight !== null && s.weight !== '') {
        const parsedW = parseFloat(s.weight);
        weightVal = isNaN(parsedW) ? targetWeightVal : parsedW;
      }

      // Target & Reps resolution:
      // 1. Preserve the historical target (target or targetReps) first as the new session's target
      let targetVal = undefined;
      if (s.target !== undefined && s.target !== null && String(s.target).trim() !== '') {
        targetVal = s.target;
      } else if (s.targetReps !== undefined && s.targetReps !== null && String(s.targetReps).trim() !== '') {
        targetVal = s.targetReps;
      } else if (s.target_reps !== undefined && s.target_reps !== null && String(s.target_reps).trim() !== '') {
        targetVal = s.target_reps;
      }

      // 2. Fallback to actualReps only when target is missing/empty
      if (targetVal === undefined) {
        if (s.actualReps !== undefined && s.actualReps !== null && String(s.actualReps).trim() !== '') {
          const parsedR = parseInt(s.actualReps, 10);
          targetVal = (!isNaN(parsedR) && parsedR > 0) ? parsedR : s.actualReps;
        } else if (s.actual_reps !== undefined && s.actual_reps !== null && String(s.actual_reps).trim() !== '') {
          const parsedR = parseInt(s.actual_reps, 10);
          targetVal = (!isNaN(parsedR) && parsedR > 0) ? parsedR : s.actual_reps;
        } else if (s.reps !== undefined && s.reps !== null && String(s.reps).trim() !== '') {
          const parsedR = parseInt(s.reps, 10);
          targetVal = (!isNaN(parsedR) && parsedR > 0) ? parsedR : s.reps;
        }
      }

      // If still missing/empty, default based on set type
      if (targetVal === undefined) {
        targetVal = isWarm ? 15 : 8;
      }

      // Reps value for active runner execution (numeric default for steppers/keypad)
      let repsVal = isWarm ? 15 : 8;
      if (typeof targetVal === 'number') {
        repsVal = targetVal;
      } else if (typeof targetVal === 'string') {
        const digits = targetVal.match(/\d+/g);
        if (digits && digits.length > 0) {
          repsVal = parseInt(digits[digits.length - 1], 10) || (isWarm ? 15 : 8);
        }
      }

      return {
        type: setType,
        target: targetVal,
        targetReps: targetVal,
        targetWeight: targetWeightVal,
        weight: weightVal,
        reps: repsVal,
        completed: false, // Reset completion
        completedAt: null, // Reset timestamp
        rir: null,
        rirPlus: false
      };
    });

    return {
      exerciseId: exId,
      name: item.name || item.exerciseName || item.exercise_name || exMeta?.name || exId,
      muscleGroup: exMeta?.muscleGroup || item.muscleGroup || item.category || 'other',
      equipment: exMeta?.equipment || item.equipment || 'other',
      restSec: item.restSec !== undefined ? Number(item.restSec) : (exMeta?.restSec || 90),
      sets: clonedSets
    };
  });

  const title = historySession?.dayTitle || historySession?.title || 'Workout Session';
  const subtitle = historySession?.date ? `เล่นซ้ำจากรอบวันที่ ${historySession.date}` : 'เล่นซ้ำจากประวัติ';

  return {
    id: `session_${now}_${Math.random().toString(36).slice(2, 7)}`,
    routineId: historySession?.dayKey || historySession?.routineId || null,
    title: String(title).trim(),
    subtitle: String(subtitle).trim(),
    startTime: now,
    startedAt: new Date(now).toISOString(),
    exercises: clonedExercises
  };
}

/**
 * Start a live workout session by cloning a historical session.
 * Protects ongoing active session drafts from being silently overwritten.
 *
 * @param {Object} historySession Session to replay
 * @param {Object} options Configuration { force: boolean, confirm: function }
 * @returns {Object} Result { started: boolean, reason?: string, session?: Object }
 */
function startSessionFromHistory(historySession = {}, options = {}) {
  if (!historySession) {
    return { started: false, reason: 'invalid_session' };
  }

  // Guard active session if running and has exercises
  const hasRunningWorkout = isWorkoutActive.value && activeSession.value && Array.isArray(activeSession.value.exercises);
  if (hasRunningWorkout && !options.force) {
    const confirmFn = typeof options.confirm === 'function'
      ? options.confirm
      : (typeof window !== 'undefined' && typeof window.confirm === 'function'
          ? window.confirm
          : null);

    if (confirmFn) {
      const allowed = confirmFn('มีรอบการฝึกซ้อมที่กำลังเล่นอยู่ (Active Workout) การเริ่มเล่นซ้ำจะแทนที่รอบปัจจุบัน คุณต้องการดำเนินการต่อหรือไม่?');
      if (!allowed) {
        return { started: false, reason: 'cancelled_by_user' };
      }
    } else {
      // Without confirmation capability and force=false, refuse overwrite
      return { started: false, reason: 'active_workout_in_progress' };
    }
  }

  const cloned = cloneSessionToActive(historySession);
  activeSession.value = cloned;
  isWorkoutActive.value = true;
  persistDraft();
  startDurationTicker();

  return { started: true, session: cloned };
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

  const actualExId = typeof exerciseId === 'string' ? exerciseId : (exerciseId?.exerciseId || exerciseId?.id);
  const actualCustomSets = customSets || (typeof exerciseId === 'object' && Array.isArray(exerciseId?.sets) ? exerciseId.sets : null);

  const exerciseStore = useExerciseStore();
  const exMeta = exerciseStore.getExerciseById(actualExId);
  const advice = getSuggestedWeightAdvice(actualExId, sessionHistory.value);

  let sets = actualCustomSets;
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
    exerciseId: actualExId,
    name: exMeta?.name || (typeof exerciseId === 'object' ? exerciseId?.name : null) || actualExId,
    muscleGroup: exMeta?.muscleGroup || (typeof exerciseId === 'object' ? exerciseId?.muscleGroup : null) || 'other',
    equipment: exMeta?.equipment || (typeof exerciseId === 'object' ? exerciseId?.equipment : null) || 'other',
    restSec: (typeof exerciseId === 'object' && typeof exerciseId?.restSec === 'number') ? exerciseId.restSec : 90,
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
 * Move an exercise to a new position in the active session.
 * Preserves all exercise properties, set data, completion status, and RIR.
 * Persists the updated draft to storage immediately.
 *
 * @param {number} fromIndex Current index of the exercise
 * @param {number} toIndex Target index for the exercise
 * @returns {boolean} True if successfully moved, false otherwise
 */
export function moveExercise(fromIndex, toIndex) {
  if (!isWorkoutActive.value || !activeSession.value) return false;
  const exercises = activeSession.value.exercises;
  if (!Array.isArray(exercises) || exercises.length <= 1) return false;

  const from = Number(fromIndex);
  const to = Number(toIndex);

  // Boundary protection: strictly validate integer indices within bounds
  if (!Number.isInteger(from) || !Number.isInteger(to)) return false;
  if (from < 0 || from >= exercises.length) return false;
  if (to < 0 || to >= exercises.length) return false;
  if (from === to) return false;

  const [movedEx] = exercises.splice(from, 1);
  exercises.splice(to, 0, movedEx);

  persistDraft();
  return true;
}

/**
 * Move an exercise up by 1 position (towards the start)
 * @param {number} index Current index of the exercise
 * @returns {boolean}
 */
export function moveExerciseUp(index) {
  return moveExercise(index, index - 1);
}

/**
 * Move an exercise down by 1 position (towards the end)
 * @param {number} index Current index of the exercise
 * @returns {boolean}
 */
export function moveExerciseDown(index) {
  return moveExercise(index, index + 1);
}

/**
 * Substitute an exercise in the active workout session.
 *
 * CRITICAL BUSINESS & DATA INTEGRITY RULES:
 * 1. Completed sets MUST NEVER have their exerciseId altered, preserving accurate historical records.
 * 2. If the original exercise has completed sets AND uncompleted sets:
 *    - The completed sets remain with the original exercise at the current index.
 *    - The uncompleted sets are moved into a new exercise card for the substitute and inserted at index + 1.
 * 3. If ALL sets of the original exercise are completed:
 *    - Substitution is refused to prevent history corruption.
 * 4. Automatic weight conversion without user confirmation is strictly avoided:
 *    - Uses user-specified customWeight if provided in options/substituteData.
 *    - Otherwise retains current set weight as-is.
 * 5. Updates draft immediately via persistDraft().
 *
 * @param {number} exerciseIndex Index of the exercise in activeSession.exercises
 * @param {Object} substituteData Substitute exercise definition (id, name, equipment, etc.)
 * @param {Object} options Configuration { customWeight?: number }
 * @returns {Object} { success: boolean, mode: 'replaced'|'split', reason?: string, exercise?: Object, newExercise?: Object }
 */
export function substituteExercise(exerciseIndex, substituteData, options = {}) {
  if (!isWorkoutActive.value || !activeSession.value) {
    return { success: false, reason: 'no_active_workout' };
  }
  const exercises = activeSession.value.exercises;
  if (!Array.isArray(exercises)) {
    return { success: false, reason: 'no_exercises' };
  }

  const idx = Number(exerciseIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= exercises.length) {
    return { success: false, reason: 'invalid_index' };
  }

  const originalExercise = exercises[idx];
  if (!originalExercise || !substituteData) {
    return { success: false, reason: 'missing_data' };
  }

  const subId = substituteData.id || substituteData.exerciseId;
  if (!subId) {
    return { success: false, reason: 'missing_substitute_id' };
  }
  if (subId === originalExercise.exerciseId) {
    return { success: false, reason: 'same_exercise' };
  }

  const exerciseStore = useExerciseStore();
  const exMeta = exerciseStore.getExerciseById(subId);

  const completedSets = (originalExercise.sets || []).filter(s => Boolean(s.completed));
  const uncompletedSets = (originalExercise.sets || []).filter(s => !s.completed);

  // Guard: If all sets are completed, prevent replacement to protect history
  if (uncompletedSets.length === 0 && completedSets.length > 0) {
    return {
      success: false,
      reason: 'all_sets_completed',
      message: 'ท่านี้ทำครบทุกเซ็ตแล้ว ไม่สามารถสลับท่าได้'
    };
  }

  // Determine weight: explicit user weight if given, otherwise keep existing set weight without unverified calculation
  const getWeightForSet = (s) => {
    if (options.customWeight !== undefined && options.customWeight !== null && options.customWeight !== '') {
      return Number(options.customWeight);
    }
    if (substituteData.targetWeight !== undefined && substituteData.targetWeight !== null && substituteData.targetWeight !== '') {
      return Number(substituteData.targetWeight);
    }
    return (s && s.weight !== undefined && s.weight !== '') ? Number(s.weight) : 0;
  };

  // If SOME sets are completed, split the exercise
  if (completedSets.length > 0) {
    // 1. Keep original exercise with completed sets ONLY
    originalExercise.sets = completedSets;

    // 2. Build new exercise with remaining uncompleted sets
    const newSets = uncompletedSets.map((s) => {
      const targetWt = getWeightForSet(s);
      return {
        type: s.type || 'working',
        targetReps: s.targetReps || s.reps || 8,
        targetWeight: targetWt,
        weight: targetWt,
        reps: s.reps || 8,
        suggestedWeight: (options.customWeight !== undefined && options.customWeight !== null && options.customWeight !== '')
          ? Number(options.customWeight)
          : (s.suggestedWeight || targetWt),
        completed: false,
        completedAt: null,
        rir: s.rir !== undefined ? s.rir : null,
        rirPlus: Boolean(s.rirPlus)
      };
    });

    const newExercise = {
      exerciseId: subId,
      name: substituteData.name || exMeta?.name || subId,
      muscleGroup: substituteData.muscleGroup || exMeta?.muscleGroup || originalExercise.muscleGroup || 'other',
      equipment: substituteData.equipment || exMeta?.equipment || 'other',
      restSec: typeof substituteData.restSec === 'number' && substituteData.restSec > 0
        ? substituteData.restSec
        : (originalExercise.restSec || 90),
      canonicalId: exMeta?.canonicalId || undefined,
      sets: newSets
    };

    // Insert new exercise right after original exercise
    exercises.splice(idx + 1, 0, newExercise);

    persistDraft();
    return {
      success: true,
      mode: 'split',
      originalExercise,
      newExercise,
      splitIndex: idx + 1
    };
  }

  // If NO sets are completed, replace in-place
  originalExercise.exerciseId = subId;
  originalExercise.name = substituteData.name || exMeta?.name || subId;
  originalExercise.muscleGroup = substituteData.muscleGroup || exMeta?.muscleGroup || originalExercise.muscleGroup;
  originalExercise.equipment = substituteData.equipment || exMeta?.equipment || originalExercise.equipment;
  if (typeof substituteData.restSec === 'number' && substituteData.restSec > 0) {
    originalExercise.restSec = substituteData.restSec;
  }
  originalExercise.canonicalId = exMeta?.canonicalId || undefined;

  for (const s of (originalExercise.sets || [])) {
    const targetWt = getWeightForSet(s);
    s.weight = targetWt;
    s.targetWeight = targetWt;
    if (options.customWeight !== undefined && options.customWeight !== null && options.customWeight !== '') {
      s.suggestedWeight = Number(options.customWeight);
    }
  }

  persistDraft();
  return {
    success: true,
    mode: 'replaced',
    exercise: originalExercise
  };
}

/**
 * Insert calculated warmup sets to an exercise in the active workout session.
 * - Extracts working weight from the first working set (or existing working sets).
 * - Guards against zero/invalid weight (returns safe error).
 * - Guards against duplicate insertion (if warmup sets already exist).
 * - Prepends warmup sets before working sets without mutating or overwriting them.
 * - Persists draft immediately.
 */
export function insertWarmupSetsToActiveExercise(exerciseIndex, plan = DEFAULT_WARMUP_PLAN) {
  if (!isWorkoutActive.value || !activeSession.value) {
    return { success: false, reason: 'no_active_session', message: 'ไม่มีรอบฝึกที่กำลังใช้งานอยู่' };
  }
  const exercises = activeSession.value.exercises;
  if (!Array.isArray(exercises) || exerciseIndex < 0 || exerciseIndex >= exercises.length) {
    return { success: false, reason: 'invalid_index', message: 'ไม่พบข้อมูลท่าฝึก' };
  }
  const ex = exercises[exerciseIndex];
  if (!ex || !Array.isArray(ex.sets)) {
    return { success: false, reason: 'invalid_exercise', message: 'ไม่พบรายการเซ็ตของท่าฝึก' };
  }

  // Duplicate protection: check if warmup sets already exist
  if (hasWarmupSets(ex)) {
    return { success: false, reason: 'already_exists', message: 'เพิ่มเซ็ตวอร์มไว้แล้ว — ไม่เพิ่มซ้ำ' };
  }

  // Working weight reference
  const refWeight = getExerciseWorkingWeight(ex);
  if (!refWeight || refWeight <= 0) {
    return { success: false, reason: 'invalid_weight', message: 'กรุณาระบุน้ำหนักเซ็ตจริงก่อนเพิ่มเซ็ตวอร์ม' };
  }

  // Generate warmup sets using warmupCalc engine
  const built = buildWarmupSets(refWeight, plan);
  if (!built || built.length === 0) {
    return { success: false, reason: 'no_sets_generated', message: 'ไม่สามารถคำนวณเซ็ตวอร์มได้จากน้ำหนักนี้' };
  }

  // Find insert index (immediately before first working set)
  let insertAt = ex.sets.findIndex(s => !isWarmSetType(s?.type) && !s?.isWarm);
  if (insertAt < 0) insertAt = 0;

  // Build active workout set objects
  const warmupSets = built.map(step => ({
    type: 'warmup',
    targetWeight: step.weight,
    targetReps: step.reps,
    weight: step.weight,
    reps: step.reps,
    percent: step.percent,
    isWarm: true,
    _generatedWarmup: true,
    completed: false,
    completedAt: null
  }));

  // Prepend warmup sets at insertAt without touching or overwriting working sets
  ex.sets.splice(insertAt, 0, ...warmupSets);

  // Persist draft immediately
  persistDraft();

  return {
    success: true,
    count: warmupSets.length,
    sets: warmupSets,
    referenceWeight: refWeight,
    message: `เพิ่มเซ็ตวอร์ม ${warmupSets.length} เซ็ต (${warmupSets.map(s => `${s.weight}×${s.reps}`).join(' · ')}) เรียบร้อย`
  };
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
    target: lastSet ? (lastSet.target ?? lastSet.targetReps ?? 8) : 8,
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
  const sessionPrs = collectSessionPrs(activeSession.value);

  const summary = {
    ...activeSession.value,
    finishedAt: finishedIso,
    completedAt: finishedIso,
    endTime: now,
    durationSec: sessionDurationSec.value,
    totalVolumeKg: calculateTotalWorkingVolume(activeSession.value.exercises),
    totalSetsCompleted: completedCount,
    completedSetsCount: completedCount,
    totalSetsCount: totalCount,
    prs: sessionPrs
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
        category: ex.category || ex.muscleGroup || ex.targetMuscle || 'เวทเทรนนิ่ง',
        canonicalId: ex.canonicalId || undefined,
        sets: (ex.sets || []).map((s, sIdx) => ({
          setIndex: sIdx + 1,
          type: s.type === 'warmup' ? 'วอร์ม' : 'เล่นจริง',
          target: (s.target !== undefined && s.target !== null && s.target !== '') ? s.target : (s.targetReps || s.reps || 8),
          weight: (s.weight !== undefined && s.weight !== '') ? Number(s.weight) : 0,
          actualReps: (s.reps !== undefined && s.reps !== '') ? Number(s.reps) : (s.targetReps || 0),
          done: Boolean(s.completed),
          rir: (s.rir !== undefined && s.rir !== null && s.rir !== '') ? Number(s.rir) : null,
          rirPlus: Boolean(s.rirPlus)
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
    startSessionFromHistory,
    cloneSessionToActive,
    addExerciseToActiveSession,
    removeExerciseFromActiveSession,
    moveExercise,
    moveExerciseUp,
    moveExerciseDown,
    substituteExercise,
    insertWarmupSetsToActiveExercise,
    hasWarmupSets,
    getExerciseWorkingWeight,
    addSet,
    removeSet,
    updateSetMetric,
    toggleSetComplete,
    finishSession,
    discardSession,
    calculateTotalWorkingVolume,
    persistDraft
  };
}
