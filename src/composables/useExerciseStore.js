import { ref, computed } from 'vue';
import { defaultExercises } from '../data/defaultExercises.js';

const STORAGE_KEY = 'atiwitch_custom_exercises';

/**
 * Safely load custom exercises from localStorage if available.
 * Falls back to an empty array in non-browser (Node.js) environments.
 */
function loadStoredCustomExercises() {
  if (typeof localStorage !== 'undefined') {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[useExerciseStore] Failed to load custom exercises from localStorage:', err);
    }
  }
  return [];
}

/**
 * Safely persist custom exercises to localStorage if available.
 */
function persistCustomExercises(list) {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (err) {
      console.warn('[useExerciseStore] Failed to save custom exercises to localStorage:', err);
    }
  }
}

// Module-level reactive singleton state
const customExercises = ref(loadStoredCustomExercises());
const selectedMuscle = ref('');
const searchQuery = ref('');

// Combined exercises (default catalog + user custom exercises)
const exercises = computed(() => {
  return [...defaultExercises, ...customExercises.value];
});

// Reactive filtered list based on active filters (muscle group + search query)
const filteredExercises = computed(() => {
  const muscleFilter = (selectedMuscle.value || '').toLowerCase().trim();
  const query = (searchQuery.value || '').toLowerCase().trim();

  return exercises.value.filter(exercise => {
    // Muscle group filtering (skip if empty or 'all')
    if (muscleFilter && muscleFilter !== 'all') {
      if (muscleFilter === 'video_machine') {
        if (!exercise.localVideo) return false;
      } else {
        const exMuscle = (exercise.muscleGroup || '').toLowerCase().trim();
        if (exMuscle !== muscleFilter) {
          return false;
        }
      }
    }

    // Free text search matching name, muscle group, equipment, or notes
    if (query) {
      const name = (exercise.name || '').toLowerCase();
      const muscle = (exercise.muscleGroup || '').toLowerCase();
      const equipment = (exercise.equipment || '').toLowerCase();
      const notes = (exercise.notes || '').toLowerCase();
      const matches = name.includes(query) ||
                      muscle.includes(query) ||
                      equipment.includes(query) ||
                      notes.includes(query);
      if (!matches) {
        return false;
      }
    }

    return true;
  });
});

/**
 * Create a new custom exercise and persist to localStorage
 * @param {Object} data Exercise data { name, muscleGroup, equipment, notes }
 * @returns {Object} Created exercise object with unique id and isCustom: true
 */
function createCustomExercise(data = {}) {
  const id = data.id || `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newExercise = {
    ...data,
    id,
    name: data.name ? String(data.name).trim() : 'Custom Exercise',
    muscleGroup: data.muscleGroup ? String(data.muscleGroup).toLowerCase().trim() : 'other',
    equipment: data.equipment ? String(data.equipment).toLowerCase().trim() : 'other',
    isCustom: true,
    notes: data.notes ? String(data.notes).trim() : ''
  };

  customExercises.value.push(newExercise);
  persistCustomExercises(customExercises.value);
  return newExercise;
}

/**
 * Find an exercise by its unique ID
 * @param {string} id Exercise identifier
 * @returns {Object|null} Matching exercise or null
 */
function getExerciseById(id) {
  if (!id) return null;
  return exercises.value.find(e => e.id === id) || null;
}

/**
 * Composable store for exercise catalog and custom exercises
 */
export function useExerciseStore() {
  return {
    exercises,
    filteredExercises,
    selectedMuscle,
    searchQuery,
    createCustomExercise,
    getExerciseById
  };
}
