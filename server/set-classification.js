// server/set-classification.js
// Set Classification & Set Tagging Engine (SPEC §4.3)
// Pure functions for normalizing and classifying workout set types:
// Normal, Warmup, Drop Set, and Failure.

const SET_TYPES = {
  NORMAL: 'normal',
  WARMUP: 'warmup',
  DROP: 'drop',
  FAILURE: 'failure'
};

const WARMUP_ALIASES = new Set(['warm', 'warmup', 'วอร์ม', 'w']);
const DROP_ALIASES = new Set(['drop', 'dropset', 'ดรอป', 'ดรอปเซ็ต', 'd']);
const FAILURE_ALIASES = new Set(['failure', 'fail', 'ล้มเหลว', 'amrap', 'f']);

function normalizeSetType(rawType) {
  if (!rawType || typeof rawType !== 'string') return SET_TYPES.NORMAL;
  const t = rawType.trim().toLowerCase();
  if (WARMUP_ALIASES.has(t)) return SET_TYPES.WARMUP;
  if (DROP_ALIASES.has(t)) return SET_TYPES.DROP;
  if (FAILURE_ALIASES.has(t)) return SET_TYPES.FAILURE;
  return SET_TYPES.NORMAL;
}

function isWorkingSet(set) {
  if (!set) return false;
  const t = normalizeSetType(set.type);
  return t === SET_TYPES.NORMAL || t === SET_TYPES.DROP || t === SET_TYPES.FAILURE;
}

function isWarmupSet(set) {
  if (!set) return false;
  return normalizeSetType(set.type) === SET_TYPES.WARMUP;
}

function isDropSet(set) {
  if (!set) return false;
  return normalizeSetType(set.type) === SET_TYPES.DROP;
}

function isFailureSet(set) {
  if (!set) return false;
  return normalizeSetType(set.type) === SET_TYPES.FAILURE;
}

/**
 * Aggregates set type breakdown stats for an exercise.
 * Supports:
 *   buildSetTypeStats(repo, exerciseId)
 *   buildSetTypeStats(history, exerciseId)
 *   buildSetTypeStats(exerciseId, history)
 */
function buildSetTypeStats(arg1, arg2) {
  let exerciseId = '';
  let rawHistory = [];

  if (arg1 && typeof arg1 === 'object' && typeof arg1.getExerciseHistory === 'function') {
    exerciseId = String(arg2 || '').trim();
    rawHistory = exerciseId ? arg1.getExerciseHistory(exerciseId) : [];
  } else if (typeof arg1 === 'string' && Array.isArray(arg2)) {
    exerciseId = arg1.trim();
    rawHistory = arg2;
  } else {
    exerciseId = String(arg2 || '').trim();
    rawHistory = Array.isArray(arg1) ? arg1 : [];
  }

  let totalWorkingSets = 0;
  let totalWarmupSets = 0;
  let totalDropSets = 0;
  let totalFailureSets = 0;

  let workingVolumeKg = 0;
  let warmupVolumeKg = 0;

  let bestDropSetWeight = null;
  let bestFailureSetWeight = null;

  const sessions = Array.isArray(rawHistory) ? rawHistory : [];

  for (const session of sessions) {
    const sets = Array.isArray(session && session.sets) ? session.sets : [];
    for (const set of sets) {
      if (!set) continue;
      // Skip sets explicitly marked as not done
      if (set.done !== undefined && !set.done) continue;

      const type = normalizeSetType(set.type);
      const weight = Number(set.weight);
      const reps = Number(set.actualReps !== undefined && set.actualReps !== null
        ? set.actualReps
        : (set.actual_reps !== undefined && set.actual_reps !== null ? set.actual_reps : set.reps));

      const hasWeight = Number.isFinite(weight) && weight > 0;
      const hasReps = Number.isFinite(reps) && reps > 0;
      const setVolume = (hasWeight && hasReps) ? Math.round(weight * reps * 10) / 10 : 0;

      if (type === SET_TYPES.WARMUP) {
        totalWarmupSets += 1;
        warmupVolumeKg += setVolume;
      } else if (type === SET_TYPES.DROP) {
        totalDropSets += 1;
        workingVolumeKg += setVolume;
        if (hasWeight) {
          if (bestDropSetWeight === null || weight > bestDropSetWeight) {
            bestDropSetWeight = weight;
          }
        }
      } else if (type === SET_TYPES.FAILURE) {
        totalFailureSets += 1;
        workingVolumeKg += setVolume;
        if (hasWeight) {
          if (bestFailureSetWeight === null || weight > bestFailureSetWeight) {
            bestFailureSetWeight = weight;
          }
        }
      } else {
        // Normal working set
        totalWorkingSets += 1;
        workingVolumeKg += setVolume;
      }
    }
  }

  const totalSets = totalWorkingSets + totalWarmupSets + totalDropSets + totalFailureSets;

  const normalPercent = totalSets > 0 ? Math.round((totalWorkingSets / totalSets) * 1000) / 10 : 0;
  const warmupPercent = totalSets > 0 ? Math.round((totalWarmupSets / totalSets) * 1000) / 10 : 0;
  const dropPercent = totalSets > 0 ? Math.round((totalDropSets / totalSets) * 1000) / 10 : 0;
  const failurePercent = totalSets > 0 ? Math.round((totalFailureSets / totalSets) * 1000) / 10 : 0;

  return {
    exerciseId,
    summary: {
      totalWorkingSets,
      totalWarmupSets,
      totalDropSets,
      totalFailureSets,
      workingVolumeKg: Math.round(workingVolumeKg * 10) / 10,
      warmupVolumeKg: Math.round(warmupVolumeKg * 10) / 10,
      bestDropSetWeight,
      bestFailureSetWeight
    },
    distribution: {
      normalPercent,
      warmupPercent,
      dropPercent,
      failurePercent
    }
  };
}

module.exports = {
  SET_TYPES,
  normalizeSetType,
  isWorkingSet,
  isWarmupSet,
  isDropSet,
  isFailureSet,
  buildSetTypeStats
};
