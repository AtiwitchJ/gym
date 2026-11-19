import { ref } from 'vue';
import { defaultRoutines } from '../data/defaultRoutines.js';
import { useExerciseStore } from './useExerciseStore.js';

const STORAGE_KEY = 'atiwitch_workout_routines';

/**
 * Safely load stored routines from localStorage if available.
 * Falls back to default routines in non-browser (Node.js) or first-launch environments.
 */
function loadStoredRoutines() {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          defaultRoutines.forEach(dr => {
            if (!parsed.some(r => r.id === dr.id)) {
              parsed.push(JSON.parse(JSON.stringify(dr)));
            }
          });
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[useRoutineStore] Failed to load routines from localStorage:', err);
    }
  }
  return JSON.parse(JSON.stringify(defaultRoutines));
}

/**
 * Safely persist routines array to localStorage if available.
 */
function persistRoutines(list) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('[useRoutineStore] Failed to save routines to localStorage:', err);
    }
  }
}

// Module-level reactive singleton state
const routines = ref(loadStoredRoutines());
const activeRoutine = ref(null);

/**
 * Find a routine by its unique identifier
 * @param {string} id Routine identifier
 * @returns {Object|null} Matching routine or null
 */
function getRoutineById(id) {
  if (!id) return null;
  const match = routines.value.find(r => r.id === id);
  if (match) return match;
  if (id === 'atiwitch_prog_a' || id === 'program_a') {
    return routines.value.find(r => r.id === 'atiwitch_prog_a' || r.id === 'atiwitch_ab_program_a') || null;
  }
  if (id === 'atiwitch_prog_b' || id === 'program_b') {
    return routines.value.find(r => r.id === 'atiwitch_prog_b' || r.id === 'atiwitch_ab_program_b') || null;
  }
  return null;
}

/**
 * Create and persist a new workout routine template
 * @param {Object} routineData Routine definition { id, title, subtitle, exercises }
 * @returns {Object} Created routine object
 */
function createRoutine(routineData = {}) {
  const id = routineData.id || `routine_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const exercises = Array.isArray(routineData.exercises)
    ? routineData.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        sets: Array.isArray(ex.sets)
          ? ex.sets.map(s => ({
              type: s.type || 'working',
              targetReps: s.targetReps ?? 8,
              targetWeight: s.targetWeight !== undefined ? s.targetWeight : 0
            }))
          : []
      }))
    : [];

  const newRoutine = {
    ...routineData,
    id,
    title: routineData.title ? String(routineData.title).trim() : 'New Routine',
    subtitle: routineData.subtitle ? String(routineData.subtitle).trim() : '',
    exercises
  };

  routines.value.push(newRoutine);
  persistRoutines(routines.value);
  return newRoutine;
}

/**
 * Update an existing routine by ID
 * @param {string} id Routine identifier
 * @param {Object} patch Partial or full routine fields to update
 * @returns {Object|null} Updated routine or null if not found
 */
function updateRoutine(id, patch = {}) {
  if (!id) return null;
  const index = routines.value.findIndex(r => r.id === id);
  if (index === -1) return null;

  const current = routines.value[index];
  const updated = {
    ...current,
    ...patch,
    id // Preserve existing ID
  };

  routines.value[index] = updated;

  if (activeRoutine.value && activeRoutine.value.id === id) {
    activeRoutine.value = updated;
  }

  persistRoutines(routines.value);
  return updated;
}

/**
 * Delete a routine by ID
 * @param {string} id Routine identifier
 * @returns {boolean} True if deleted, false if not found
 */
function deleteRoutine(id) {
  if (!id) return false;
  const index = routines.value.findIndex(r => r.id === id);
  if (index === -1) return false;

  routines.value.splice(index, 1);

  if (activeRoutine.value && activeRoutine.value.id === id) {
    activeRoutine.value = null;
  }

  persistRoutines(routines.value);
  return true;
}

/**
 * Return a fresh cloned copy of the 4-day default routines.
 * @param {boolean|Object} [options=false] If true or { replace: true }, also resets store state.
 * @returns {Array} Deep copy of default routines
 */
function cloneDefaultRoutines(options = false) {
  const replace = typeof options === 'boolean'
    ? options
    : Boolean(options && (options.replace || options.reset));

  const cloned = JSON.parse(JSON.stringify(defaultRoutines));

  if (replace) {
    routines.value = cloned;
    persistRoutines(routines.value);
  }

  return cloned;
}

/**
 * Reset store routines to default Atiwitch 4-Day protocol
 */
function resetToDefaults() {
  return cloneDefaultRoutines(true);
}

/**
 * Set active routine by object or ID
 * @param {Object|string|null} routineOrId
 */
function setActiveRoutine(routineOrId) {
  if (!routineOrId) {
    activeRoutine.value = null;
    return;
  }
  if (typeof routineOrId === 'string') {
    activeRoutine.value = getRoutineById(routineOrId);
  } else {
    activeRoutine.value = routineOrId;
  }
}

/**
 * Retrieve a routine enriched with full exercise details from useExerciseStore
 * @param {Object|string} routineOrId
 * @returns {Array} List of exercises with resolved exercise metadata
 */
function getRoutineExercisesWithDetails(routineOrId) {
  const routine = typeof routineOrId === 'string' ? getRoutineById(routineOrId) : routineOrId;
  if (!routine || !Array.isArray(routine.exercises)) return [];

  const exerciseStore = useExerciseStore();
  return routine.exercises.map(ex => ({
    ...ex,
    exercise: exerciseStore.getExerciseById(ex.exerciseId)
  }));
}

/**
 * Composable store for routine templates and customization
 */
export function useRoutineStore() {
  return {
    routines,
    activeRoutine,
    createRoutine,
    updateRoutine,
    deleteRoutine,
    cloneDefaultRoutines,
    resetToDefaults,
    getRoutineById,
    setActiveRoutine,
    getRoutineExercisesWithDetails
  };
}
