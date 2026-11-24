import { ref, computed } from 'vue';
import { defaultExercises } from '../data/defaultExercises.js';
import { useWorkoutStore } from './useWorkoutStore.js';
import { getCanonicalExerciseId } from '../data/workouts.js';

export const EQUIPMENT_OPTIONS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'dumbbell', label: 'ดัมเบล (Dumbbell)' },
  { key: 'cable', label: 'เคเบิล (Cable)' },
  { key: 'machine', label: 'แมชชีน (Machine)' },
  { key: 'smith_machine', label: 'สมิธแมชชีน (Smith)' },
  { key: 'barbell', label: 'บาร์เบล (Barbell)' },
  { key: 'bodyweight', label: 'บอดี้เวท (Bodyweight)' }
];

export const ACTIVE_SUBSTITUTIONS_STORAGE_KEY = 'gym_active_substitutions_v1';

/**
 * Calculate biomechanical weight conversion ratio between equipment types
 */
export function calculateWeightRatio(fromEquipment = '', toEquipment = '') {
  const from = String(fromEquipment || '').toLowerCase();
  const to = String(toEquipment || '').toLowerCase();
  if (from === to) return 1.0;

  if (from === 'barbell') {
    if (to === 'dumbbell') return 0.40;
    if (to === 'machine') return 0.95;
    if (to === 'smith_machine') return 0.90;
    if (to === 'cable') return 0.35;
    if (to === 'bodyweight') return 0.70;
  }
  if (from === 'dumbbell') {
    if (to === 'barbell') return 2.50;
    if (to === 'machine') return 2.35;
    if (to === 'smith_machine') return 2.25;
    if (to === 'cable') return 0.85;
    if (to === 'bodyweight') return 1.75;
  }
  if (from === 'machine' || from === 'smith_machine') {
    if (to === 'barbell') return 1.05;
    if (to === 'dumbbell') return 0.42;
    if (to === 'machine' || to === 'smith_machine') return 1.0;
    if (to === 'cable') return 0.38;
    if (to === 'bodyweight') return 0.75;
  }
  if (from === 'cable') {
    if (to === 'barbell') return 2.85;
    if (to === 'dumbbell') return 1.15;
    if (to === 'machine' || to === 'smith_machine') return 2.60;
    if (to === 'bodyweight') return 2.0;
  }
  return 1.0;
}

/**
 * Convert weight safely rounded to the nearest 0.5 kg
 */
export function convertWeight(weight, weightRatio = 1.0) {
  const num = Number(weight);
  if (!Number.isFinite(num) || num <= 0) return 0;
  const ratio = Number(weightRatio) > 0 ? Number(weightRatio) : 1.0;
  const converted = num * ratio;
  return Math.round(converted * 2) / 2;
}

/**
 * Format weight advice string
 */
export function formatWeightAdvice(sourceWeight, weightRatio = 1.0, targetEquipment = '') {
  const src = Number(sourceWeight);
  if (!Number.isFinite(src) || src <= 0) {
    if (targetEquipment === 'dumbbell') {
      return `แนะนำใช้น้ำหนักประมาณ ${Math.round(weightRatio * 100)}% ต่อน้ำหนักแต่ละข้าง`;
    }
    return `อัตราส่วนน้ำหนัก ~${Math.round(weightRatio * 100)}%`;
  }
  const converted = convertWeight(src, weightRatio);
  if (targetEquipment === 'dumbbell') {
    return `~${converted} กก./ข้าง (แปลงจาก ${src} กก.)`;
  }
  return `~${converted} กก. (แปลงจาก ${src} กก.)`;
}

/**
 * Infer muscleGroup and equipment from an exercise object or ID
 */
export function inferExerciseMeta(exercise) {
  if (!exercise) return { muscleGroup: 'chest', equipment: 'barbell' };

  const id = String(exercise.exerciseId || exercise.id || '');
  const name = String(exercise.name || '').toLowerCase();
  const muscleText = String(exercise.mainMuscle || exercise.muscleGroup || '').toLowerCase();

  // Check defaultExercises catalog first
  const match = defaultExercises.find(e => e.id === id || e.name.toLowerCase() === name);
  if (match) {
    return {
      muscleGroup: match.muscleGroup || 'chest',
      equipment: match.equipment || 'barbell'
    };
  }

  // Infer equipment
  let equipment = 'barbell';
  if (name.includes('dumbbell') || name.includes('db') || exercise.isDumbbell) {
    equipment = 'dumbbell';
  } else if (name.includes('machine') || name.includes('seated') || name.includes('press machine')) {
    equipment = 'machine';
  } else if (name.includes('cable') || name.includes('pulldown') || name.includes('pushdown')) {
    equipment = 'cable';
  } else if (name.includes('smith')) {
    equipment = 'smith_machine';
  } else if (name.includes('bodyweight') || name.includes('pull-up') || name.includes('dip') || name.includes('crunch')) {
    equipment = 'bodyweight';
  }

  // Infer muscleGroup
  let muscleGroup = 'chest';
  if (muscleText.includes('ขา') || muscleText.includes('quad') || muscleText.includes('glute') || muscleText.includes('hamstring') || id.startsWith('m')) {
    muscleGroup = 'legs';
  } else if (muscleText.includes('หลัง') || muscleText.includes('lat') || muscleText.includes('back') || id.startsWith('w')) {
    muscleGroup = 'back';
  } else if (muscleText.includes('ไหล่') || muscleText.includes('shoulder') || muscleText.includes('delt') || id.startsWith('th')) {
    muscleGroup = 'shoulders';
  } else if (muscleText.includes('แขน') || muscleText.includes('bicep') || muscleText.includes('tricep')) {
    muscleGroup = 'arms';
  } else if (muscleText.includes('ท้อง') || muscleText.includes('abs') || muscleText.includes('core')) {
    muscleGroup = 'core';
  }

  return { muscleGroup, equipment };
}

/**
 * Fallback local substitute generation for offline resilience
 */
export function getLocalFallbackSubstitutes(exercise, equipmentFilter = 'all') {
  if (!exercise) return [];
  const meta = inferExerciseMeta(exercise);
  const sourceId = String(exercise.exerciseId || exercise.id || '');

  let candidates = defaultExercises.filter(e => {
    if (e.id === sourceId) return false;
    return e.muscleGroup === meta.muscleGroup;
  });

  if (equipmentFilter && equipmentFilter !== 'all') {
    candidates = candidates.filter(e => e.equipment === equipmentFilter);
  }

  return candidates.map(c => {
    const ratio = calculateWeightRatio(meta.equipment, c.equipment);
    let matchScore = 90;
    if (c.equipment === meta.equipment) matchScore = 95;
    else if (c.equipment === 'dumbbell' || c.equipment === 'machine') matchScore = 92;

    let explanation = `แนะนำใช้น้ำหนักประมาณ ${Math.round(ratio * 100)}% ของท่าเดิม`;
    if (c.equipment === 'dumbbell') {
      explanation = `แนะนำใช้น้ำหนักประมาณ ${Math.round(ratio * 100)}% ของบาร์เบลต่อข้าง`;
    }

    return {
      id: c.id,
      name: c.name,
      muscleGroup: c.muscleGroup,
      equipment: c.equipment,
      isCustom: Boolean(c.isCustom),
      matchScore,
      matchReason: c.notes || `กล้ามเนื้อ${c.muscleGroup}กลุ่มเดียวกัน อุปกรณ์ ${c.equipment}`,
      weightRatio: ratio,
      ratioExplanation: explanation,
      isUserFavorite: false
    };
  });
}

// Global reactive state
const currentSubstitutes = ref([]);
const loading = ref(false);
const error = ref('');
const selectedEquipmentFilter = ref('all');

export function useExerciseSubstitutes(fetchImpl = globalThis.fetch) {
  const workoutStore = useWorkoutStore();

  /**
   * Fetch substitutes from backend API with offline fallback
   */
  async function fetchSubstitutes(exercise, equipmentFilter = 'all') {
    if (!exercise) {
      currentSubstitutes.value = [];
      return [];
    }

    const exId = typeof exercise === 'object' ? (exercise.exerciseId || exercise.id) : exercise;
    const canonId = getCanonicalExerciseId(exId) || exId;
    const lookupId = exId || canonId;

    loading.value = true;
    error.value = '';

    try {
      const queryParam = equipmentFilter && equipmentFilter !== 'all' ? `?equipment=${encodeURIComponent(equipmentFilter)}` : '';
      const res = await fetchImpl(`/api/exercises/${encodeURIComponent(lookupId)}/substitutes${queryParam}`);

      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.substitutes) && data.substitutes.length > 0) {
          currentSubstitutes.value = data.substitutes;
          return data.substitutes;
        }
      }
      // If API returns empty or not found, try fallback
      const fallback = getLocalFallbackSubstitutes(exercise, equipmentFilter);
      currentSubstitutes.value = fallback;
      return fallback;
    } catch (err) {
      // Offline fallback
      const fallback = getLocalFallbackSubstitutes(exercise, equipmentFilter);
      currentSubstitutes.value = fallback;
      return fallback;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Add favorite substitute via POST /api/exercises/:id/substitutes
   */
  async function addFavoriteSubstitute(exerciseId, substituteId, priority = 1, notes = '') {
    if (!exerciseId || !substituteId) {
      return { success: false, error: 'ข้อมูลไม่ครบถ้วน' };
    }
    try {
      const res = await fetchImpl(`/api/exercises/${encodeURIComponent(exerciseId)}/substitutes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          substituteId,
          priority: Number(priority) || 1,
          notes: String(notes || '')
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }
      const data = await res.json();

      // Update local reactive list
      const item = currentSubstitutes.value.find(s => s.id === substituteId);
      if (item) {
        item.isUserFavorite = true;
      }
      return data;
    } catch (err) {
      // Local optimistic update
      const item = currentSubstitutes.value.find(s => s.id === substituteId);
      if (item) {
        item.isUserFavorite = true;
      }
      return { success: true, offline: true };
    }
  }

  /**
   * Delete favorite substitute via DELETE /api/exercises/:id/substitutes/:substituteId
   */
  async function removeFavoriteSubstitute(exerciseId, substituteId) {
    if (!exerciseId || !substituteId) return { success: false };
    try {
      const res = await fetchImpl(`/api/exercises/${encodeURIComponent(exerciseId)}/substitutes/${encodeURIComponent(substituteId)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const item = currentSubstitutes.value.find(s => s.id === substituteId);
        if (item) {
          item.isUserFavorite = false;
        }
        return await res.json();
      }
      return { success: false };
    } catch (err) {
      const item = currentSubstitutes.value.find(s => s.id === substituteId);
      if (item) {
        item.isUserFavorite = false;
      }
      return { success: true, offline: true };
    }
  }

  /**
   * Swap exercise in the active workout routine and optionally convert set weights
   */
  function swapExerciseInWorkout({ dayKey, exerciseIndex, oldExercise, substitute, convertSets = true }) {
    if (!oldExercise || !substitute) {
      return { success: false, error: 'ไม่พบข้อมูลท่าฝึก' };
    }

    const day = dayKey || workoutStore.currentDay.value;
    const exercisesList = workoutStore.workoutData[day]?.exercises;
    if (!Array.isArray(exercisesList)) {
      return { success: false, error: 'ไม่พบตารางการซ้อมของวันนี้' };
    }

    let targetIndex = exerciseIndex;
    if (typeof targetIndex !== 'number' || targetIndex < 0 || targetIndex >= exercisesList.length) {
      targetIndex = exercisesList.findIndex(e => e.id === oldExercise.id);
    }
    if (targetIndex === -1) {
      return { success: false, error: 'ไม่พบตำแหน่งท่าฝึกในตาราง' };
    }

    const oldEx = exercisesList[targetIndex];
    const oldId = oldEx.id;
    const newId = substitute.id;
    const ratio = Number(substitute.weightRatio) > 0 ? Number(substitute.weightRatio) : 1.0;

    // Mutate exercise in place to preserve Vue component binding
    oldEx.id = newId;
    oldEx.name = substitute.name;
    if (substitute.matchReason) {
      oldEx.altName = substitute.matchReason;
    }
    if (substitute.equipment) {
      oldEx.equipment = substitute.equipment;
      oldEx.isDumbbell = substitute.equipment === 'dumbbell';
      oldEx.isBarbell = substitute.equipment === 'barbell';
    }

    // Convert sets and update active draft state
    if (convertSets && workoutStore.userState && workoutStore.userState[day]) {
      const oldDraft = workoutStore.userState[day][oldId];
      if (oldDraft && typeof oldDraft === 'object') {
        const newDraft = {};
        for (const [key, val] of Object.entries(oldDraft)) {
          if (key.startsWith('wt_') && val !== '' && val !== null && !isNaN(Number(val))) {
            const converted = convertWeight(Number(val), ratio);
            newDraft[key] = String(converted);
          } else {
            newDraft[key] = val;
          }
        }
        workoutStore.userState[day][newId] = newDraft;
        delete workoutStore.userState[day][oldId];
      }
    }

    // Convert lastWeights if present
    if (convertSets && workoutStore.lastWeights && workoutStore.lastWeights[oldId]) {
      const convertedLastWeight = convertWeight(workoutStore.lastWeights[oldId], ratio);
      workoutStore.lastWeights[newId] = convertedLastWeight;
    }

    // Persist swap mapping to localStorage
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(ACTIVE_SUBSTITUTIONS_STORAGE_KEY) || '{}';
        const map = JSON.parse(raw);
        map[`${day}:${targetIndex}`] = {
          originalId: oldId,
          substituteId: newId,
          substituteName: substitute.name,
          equipment: substitute.equipment,
          ratio,
          swappedAt: new Date().toISOString()
        };
        localStorage.setItem(ACTIVE_SUBSTITUTIONS_STORAGE_KEY, JSON.stringify(map));
      }
    } catch (e) {}

    return {
      success: true,
      updatedExercise: oldEx
    };
  }

  return {
    currentSubstitutes,
    loading,
    error,
    selectedEquipmentFilter,
    EQUIPMENT_OPTIONS,
    fetchSubstitutes,
    addFavoriteSubstitute,
    removeFavoriteSubstitute,
    swapExerciseInWorkout,
    calculateWeightRatio,
    convertWeight,
    formatWeightAdvice
  };
}
