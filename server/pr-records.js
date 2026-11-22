// Exercise PR Records Timeline & Set Records engine (SPEC §3).
// Pure logic: calculates all-time PRs, set records by reps, and milestone timeline.
// Uses existing tables (workout_sessions, session_exercises, session_sets). No new tables.

const { calculateEstimated1RM } = require('./estimate');
const { isWarmupSet } = require('./exercise-stats');

/**
 * Filter and extract completed working sets from history sessions.
 */
function extractWorkingSets(history) {
  const sessions = Array.isArray(history) ? history : [];
  // Sort chronologically ascending for timeline progression (oldest -> newest)
  const sortedSessions = [...sessions].sort((a, b) => {
    const d = (a.date || '').localeCompare(b.date || '');
    if (d !== 0) return d;
    return (a.time || '').localeCompare(b.time || '');
  });

  return sortedSessions;
}

/**
 * Build PR records payload for a given exercise.
 * Supports both signatures:
 *   buildPrRecords(repo, exerciseId)
 *   buildPrRecords(exerciseId, history)
 */
function buildPrRecords(arg1, arg2) {
  let exerciseId = '';
  let rawHistory = [];

  if (arg1 && typeof arg1 === 'object' && typeof arg1.getExerciseHistory === 'function') {
    exerciseId = String(arg2 || '').trim();
    rawHistory = exerciseId ? arg1.getExerciseHistory(exerciseId) : [];
  } else {
    exerciseId = String(arg1 || '').trim();
    rawHistory = Array.isArray(arg2) ? arg2 : [];
  }

  const chronological = extractWorkingSets(rawHistory);

  let curHeaviest = null;
  let curBestE1rm = null;
  let curBestVolume = null;
  let curMostReps = null;

  const timeline = [];
  const setRecordMap = new Map();

  for (const session of chronological) {
    const sId = String(session.sessionId || session.id || '');
    const sDate = String(session.date || '');
    const sets = Array.isArray(session.sets) ? session.sets : [];

    let sessMaxWeight = 0;
    let sessMaxE1rm = 0;
    let sessMaxVolume = 0;
    let sessMaxReps = 0;

    for (const set of sets) {
      if (!set || !set.done || isWarmupSet(set)) continue;

      const weight = Number(set.weight);
      const reps = Number(set.actualReps !== undefined && set.actualReps !== null
        ? set.actualReps
        : (set.actual_reps !== undefined && set.actual_reps !== null ? set.actual_reps : set.reps));

      const hasWeight = Number.isFinite(weight) && weight > 0;
      const hasReps = Number.isInteger(reps) && reps > 0;

      if (hasWeight) {
        if (weight > sessMaxWeight) sessMaxWeight = weight;
      }

      if (hasReps) {
        if (reps > sessMaxReps) sessMaxReps = reps;
      }

      if (hasWeight && hasReps) {
        const rir = (set.rir !== null && set.rir !== undefined && set.rir !== '') ? Number(set.rir) : 0;
        const e1rm = calculateEstimated1RM(weight, reps, rir);
        if (e1rm > sessMaxE1rm) sessMaxE1rm = e1rm;

        const vol = Math.round(weight * reps * 10) / 10;
        if (vol > sessMaxVolume) sessMaxVolume = vol;

        // Track set records (max weight per rep count)
        if (!setRecordMap.has(reps)) {
          setRecordMap.set(reps, { reps, weight, date: sDate });
        } else {
          const prev = setRecordMap.get(reps);
          if (weight > prev.weight) {
            setRecordMap.set(reps, { reps, weight, date: sDate });
          }
        }
      }
    }

    // Process PR milestones for this session
    // 1. Heaviest Weight
    if (sessMaxWeight > 0) {
      if (curHeaviest === null) {
        timeline.push({
          date: sDate,
          type: 'heaviestWeight',
          value: sessMaxWeight,
          previousValue: null,
          sessionId: sId
        });
        curHeaviest = { value: sessMaxWeight, date: sDate, sessionId: sId };
      } else if (sessMaxWeight > curHeaviest.value) {
        timeline.push({
          date: sDate,
          type: 'heaviestWeight',
          value: sessMaxWeight,
          previousValue: curHeaviest.value,
          sessionId: sId
        });
        curHeaviest = { value: sessMaxWeight, date: sDate, sessionId: sId };
      }
    }

    // 2. Best e1RM
    if (sessMaxE1rm > 0) {
      if (curBestE1rm === null) {
        timeline.push({
          date: sDate,
          type: 'bestE1rm',
          value: sessMaxE1rm,
          previousValue: null,
          sessionId: sId
        });
        curBestE1rm = { value: sessMaxE1rm, date: sDate, sessionId: sId };
      } else if (sessMaxE1rm > curBestE1rm.value) {
        timeline.push({
          date: sDate,
          type: 'bestE1rm',
          value: sessMaxE1rm,
          previousValue: curBestE1rm.value,
          sessionId: sId
        });
        curBestE1rm = { value: sessMaxE1rm, date: sDate, sessionId: sId };
      }
    }

    // 3. Best Set Volume
    if (sessMaxVolume > 0) {
      if (curBestVolume === null) {
        timeline.push({
          date: sDate,
          type: 'bestSetVolume',
          value: sessMaxVolume,
          previousValue: null,
          sessionId: sId
        });
        curBestVolume = { value: sessMaxVolume, date: sDate, sessionId: sId };
      } else if (sessMaxVolume > curBestVolume.value) {
        timeline.push({
          date: sDate,
          type: 'bestSetVolume',
          value: sessMaxVolume,
          previousValue: curBestVolume.value,
          sessionId: sId
        });
        curBestVolume = { value: sessMaxVolume, date: sDate, sessionId: sId };
      }
    }

    // 4. Most Reps
    if (sessMaxReps > 0) {
      if (curMostReps === null) {
        timeline.push({
          date: sDate,
          type: 'mostReps',
          value: sessMaxReps,
          previousValue: null,
          sessionId: sId
        });
        curMostReps = { value: sessMaxReps, date: sDate, sessionId: sId };
      } else if (sessMaxReps > curMostReps.value) {
        timeline.push({
          date: sDate,
          type: 'mostReps',
          value: sessMaxReps,
          previousValue: curMostReps.value,
          sessionId: sId
        });
        curMostReps = { value: sessMaxReps, date: sDate, sessionId: sId };
      }
    }
  }

  const records = {};
  if (curHeaviest) records.heaviestWeight = curHeaviest;
  if (curBestE1rm) records.bestE1rm = curBestE1rm;
  if (curBestVolume) records.bestSetVolume = curBestVolume;
  if (curMostReps) records.mostReps = curMostReps;

  const setRecords = Array.from(setRecordMap.values()).sort((a, b) => a.reps - b.reps);

  // Sort timeline newest first (date DESC)
  timeline.sort((a, b) => {
    const d = (b.date || '').localeCompare(a.date || '');
    if (d !== 0) return d;
    return 0;
  });

  return {
    exerciseId,
    records,
    setRecords,
    timeline
  };
}

module.exports = {
  buildPrRecords,
  extractWorkingSets
};
