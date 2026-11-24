// server/workout-comparison.js
// Workout Session Comparison & Historical Overload Comparator.
// Pure calculation engine: no DB access, no mutations, no side effects.
// Compares two workout sessions side-by-side, computes macro deltas, matches exercises,
// pairs sets, evaluates progressive overload, and generates Thai summaries.

const { calculateEstimated1RM } = require('./estimate');
const { isWarmupSet } = require('./set-classification');

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

function computePct(diff, target) {
  if (!Number.isFinite(target) || target <= 0) {
    return diff > 0 ? 100.0 : 0.0;
  }
  return round1((diff / target) * 100);
}

function formatSessionHeader(session) {
  if (!session) return null;
  const dur = (session.durationSec !== undefined && session.durationSec !== null)
    ? Number(session.durationSec)
    : (session.duration_sec !== undefined && session.duration_sec !== null ? Number(session.duration_sec) : null);

  const rpe = (session.sessionRpe !== undefined && session.sessionRpe !== null)
    ? Number(session.sessionRpe)
    : (session.session_rpe !== undefined && session.session_rpe !== null ? Number(session.session_rpe) : null);

  const load = (session.sessionLoadAu !== undefined && session.sessionLoadAu !== null)
    ? Number(session.sessionLoadAu)
    : (session.session_load_au !== undefined && session.session_load_au !== null ? Number(session.session_load_au) : null);

  return {
    id: session.id,
    date: session.date,
    time: session.time || '',
    dayKey: session.dayKey || session.day_key || '',
    dayTitle: session.dayTitle || session.day_title || '',
    durationSec: Number.isFinite(dur) && dur > 0 ? dur : null,
    sessionRpe: Number.isFinite(rpe) ? rpe : null,
    sessionLoadAu: Number.isFinite(load) ? load : null
  };
}

/**
 * Filter and align working sets from an exercise into logical slots.
 * Handles gaps from skipped sets (whether uncompleted with done=false or omitted from array).
 */
function extractWorkingSetsWithSlots(exercise) {
  if (!exercise || !Array.isArray(exercise.sets)) return { slots: new Map(), completedSets: [] };

  const allSets = exercise.sets;
  const nonWarmups = allSets.filter((s) => s && !isWarmupSet(s));
  const completedSets = [];
  const slots = new Map();

  const hasSetIndices = nonWarmups.length > 0 && nonWarmups.every((s) => Number.isInteger(s.setIndex));

  if (hasSetIndices) {
    const minSetIdx = Math.min(...nonWarmups.map((s) => s.setIndex));
    const maxSetIdx = Math.max(...nonWarmups.map((s) => s.setIndex));

    const bySetIndex = new Map();
    for (const s of nonWarmups) {
      bySetIndex.set(s.setIndex, s);
    }

    for (let setIdx = minSetIdx; setIdx <= maxSetIdx; setIdx++) {
      const slot = setIdx - minSetIdx;
      const s = bySetIndex.get(setIdx);

      if (s) {
        const isDone = Boolean(s.done);
        const weight = Number(s.weight);
        const reps = Number(s.actualReps !== undefined ? s.actualReps : s.reps);
        const hasValidValues = Number.isFinite(weight) && weight >= 0 && Number.isFinite(reps) && reps > 0;

        if (isDone && hasValidValues) {
          const rir = (s.rir !== null && s.rir !== undefined && s.rir !== '') ? Number(s.rir) : 0;
          const e1rm = calculateEstimated1RM(weight, reps, rir);
          const volume = round1(weight * reps);
          const setObj = {
            slot,
            setIndex: s.setIndex,
            type: s.type || 'normal',
            target: s.target || '',
            weight: round1(weight),
            reps,
            rir,
            e1rm,
            volume,
            done: true
          };
          slots.set(slot, setObj);
          completedSets.push(setObj);
        } else {
          slots.set(slot, null);
        }
      } else {
        slots.set(slot, null);
      }
    }
  } else {
    for (let slot = 0; slot < nonWarmups.length; slot++) {
      const s = nonWarmups[slot];
      const isDone = Boolean(s.done);
      const weight = Number(s.weight);
      const reps = Number(s.actualReps !== undefined ? s.actualReps : s.reps);
      const hasValidValues = Number.isFinite(weight) && weight >= 0 && Number.isFinite(reps) && reps > 0;

      if (isDone && hasValidValues) {
        const rir = (s.rir !== null && s.rir !== undefined && s.rir !== '') ? Number(s.rir) : 0;
        const e1rm = calculateEstimated1RM(weight, reps, rir);
        const volume = round1(weight * reps);
        const setObj = {
          slot,
          setIndex: s.setIndex !== undefined ? s.setIndex : slot,
          type: s.type || 'normal',
          target: s.target || '',
          weight: round1(weight),
          reps,
          rir,
          e1rm,
          volume,
          done: true
        };
        slots.set(slot, setObj);
        completedSets.push(setObj);
      } else {
        slots.set(slot, null);
      }
    }
  }

  return { slots, completedSets };
}

/**
 * Filter completed working sets from an exercise (excludes warmups and incomplete sets).
 */
function extractWorkingSets(exercise) {
  return extractWorkingSetsWithSlots(exercise).completedSets;
}

/**
 * Compare two sets (set A = base/newer, set B = target/older).
 */
function compareSets(setA, setB, index) {
  if (setA && !setB) {
    return {
      setIndex: index,
      baseSet: { weight: setA.weight, reps: setA.reps, type: setA.type, done: true },
      targetSet: null,
      diffWeight: setA.weight,
      diffReps: setA.reps,
      status: 'progressed',
      noteTh: `+1 เซ็ตเพิ่มเติม (+${setA.weight} kg × ${setA.reps} ครั้ง)`
    };
  }

  if (!setA && setB) {
    return {
      setIndex: index,
      baseSet: null,
      targetSet: { weight: setB.weight, reps: setB.reps, type: setB.type, done: true },
      diffWeight: round1(-setB.weight),
      diffReps: -setB.reps,
      status: 'regressed',
      noteTh: '-1 เซ็ต (ไม่ได้เล่นเซ็ตนี้)'
    };
  }

  const wA = setA.weight;
  const rA = setA.reps;
  const wB = setB.weight;
  const rB = setB.reps;

  const diffWeight = round1(wA - wB);
  const diffReps = rA - rB;

  let status = 'maintained';
  let noteTh = 'ผลงานเท่าเดิม';

  if (wA > wB && rA >= rB) {
    status = 'progressed';
    noteTh = (wA > wB && rA > rB)
      ? `+${diffWeight} kg และ +${diffReps} ครั้ง`
      : (diffWeight > 0 ? `+${diffWeight} kg ที่จำนวนครั้งเดิม` : `+${diffReps} ครั้งที่น้ำหนักเดิม`);
  } else if (wA === wB && rA > rB) {
    status = 'progressed';
    noteTh = `+${diffReps} ครั้งที่น้ำหนักเดิม`;
  } else if (wA === wB && rA === rB) {
    status = 'maintained';
    noteTh = 'ผลงานเท่าเดิม';
  } else if (wA <= wB && rA <= rB) {
    status = 'regressed';
    noteTh = (wA < wB && rA < rB)
      ? `${diffWeight} kg และ ${diffReps} ครั้ง`
      : (wA < wB ? `${diffWeight} kg ที่จำนวนครั้งเดิม` : `${diffReps} ครั้งที่น้ำหนักเดิม`);
  } else if (wA > wB && rA < rB) {
    // Weight increased but reps decreased: evaluate e1RM & volume
    const eA = setA.e1rm;
    const eB = setB.e1rm;
    if (eA > eB && (wA * rA) >= (wB * rB) * 0.95) {
      status = 'progressed';
      noteTh = `+${diffWeight} kg (ลดลง ${Math.abs(diffReps)} ครั้ง, e1RM สูงขึ้น)`;
    } else if (eA < eB) {
      status = 'regressed';
      noteTh = `${diffReps} ครั้ง แม้น้ำหนักเพิ่มขึ้น +${diffWeight} kg`;
    } else {
      status = 'maintained';
      noteTh = `+${diffWeight} kg แต่ลดลง ${Math.abs(diffReps)} ครั้ง (e1RM เท่าเดิม)`;
    }
  } else if (wA < wB && rA > rB) {
    // Weight decreased but reps increased: evaluate e1RM
    const eA = setA.e1rm;
    const eB = setB.e1rm;
    if (eA < eB) {
      status = 'regressed';
      noteTh = `${diffWeight} kg แม้เพิ่มขึ้น +${diffReps} ครั้ง`;
    } else if (eA > eB) {
      status = 'progressed';
      noteTh = `+${diffReps} ครั้ง (ลดน้ำหนัก ${Math.abs(diffWeight)} kg, e1RM สูงขึ้น)`;
    } else {
      status = 'maintained';
      noteTh = `ลดน้ำหนัก ${Math.abs(diffWeight)} kg แต่เพิ่มขึ้น +${diffReps} ครั้ง`;
    }
  }

  return {
    setIndex: index,
    baseSet: { weight: wA, reps: rA, type: setA.type, done: true },
    targetSet: { weight: wB, reps: rB, type: setB.type, done: true },
    diffWeight,
    diffReps,
    status,
    noteTh
  };
}

/**
 * Determine exercise progression status.
 */
function evaluateExerciseStatus(volumeDelta, bestE1rmDelta, setComparisons) {
  const pCount = setComparisons.filter((s) => s.status === 'progressed').length;
  const rCount = setComparisons.filter((s) => s.status === 'regressed').length;
  const mCount = setComparisons.filter((s) => s.status === 'maintained').length;

  if (pCount > rCount && (volumeDelta.diff >= 0 || bestE1rmDelta.diff >= 0)) {
    return { status: 'progressed', statusLabelTh: 'ก้าวหน้า' };
  }
  if (rCount > pCount && (volumeDelta.diff <= 0 || bestE1rmDelta.diff <= 0)) {
    return { status: 'regressed', statusLabelTh: 'ลดลง' };
  }
  if (volumeDelta.diff > 0 && bestE1rmDelta.diff >= 0) {
    return { status: 'progressed', statusLabelTh: 'ก้าวหน้า' };
  }
  if (volumeDelta.diff < 0 && bestE1rmDelta.diff <= 0) {
    return { status: 'regressed', statusLabelTh: 'ลดลง' };
  }
  return { status: 'maintained', statusLabelTh: 'คงที่' };
}

function getExerciseKey(ex) {
  return ex.canonicalId || ex.id || ex.exerciseId || '';
}

/**
 * Compare two workout sessions (Base = A / latest, Target = B / previous).
 */
function compareWorkoutSessions(baseSession, targetSession) {
  const baseHeader = formatSessionHeader(baseSession);

  if (!targetSession) {
    return {
      success: true,
      hasComparison: false,
      baseSession: baseHeader,
      targetSession: null,
      summary: null,
      messageTh: 'นี่เป็นการฝึกซ้อมครั้งแรกของโปรแกรมนี้ ยังไม่มีรอบก่อนหน้าให้เปรียบเทียบ',
      exercises: [],
      newExercises: [],
      droppedExercises: []
    };
  }

  const targetHeader = formatSessionHeader(targetSession);

  const baseExercises = Array.isArray(baseSession.exercises) ? baseSession.exercises : [];
  const targetExercises = Array.isArray(targetSession.exercises) ? targetSession.exercises : [];

  const baseMap = new Map();
  for (const ex of baseExercises) {
    const k = getExerciseKey(ex);
    if (k && !baseMap.has(k)) baseMap.set(k, ex);
  }

  const targetMap = new Map();
  for (const ex of targetExercises) {
    const k = getExerciseKey(ex);
    if (k && !targetMap.has(k)) targetMap.set(k, ex);
  }

  const comparedExercises = [];
  const newExercises = [];
  const droppedExercises = [];

  let sumBaseVolume = 0;
  let sumTargetVolume = 0;
  let sumBaseReps = 0;
  let sumTargetReps = 0;
  let sumBaseWorkingSets = 0;
  let sumTargetWorkingSets = 0;

  // Process Base Exercises (Matched or New)
  for (const [key, exA] of baseMap.entries()) {
    const { slots: slotsA, completedSets: workingSetsA } = extractWorkingSetsWithSlots(exA);
    const volA = round1(workingSetsA.reduce((sum, s) => sum + s.volume, 0));
    const repsA = workingSetsA.reduce((sum, s) => sum + s.reps, 0);

    sumBaseVolume += volA;
    sumBaseReps += repsA;
    sumBaseWorkingSets += workingSetsA.length;

    if (targetMap.has(key)) {
      const exB = targetMap.get(key);
      const { slots: slotsB, completedSets: workingSetsB } = extractWorkingSetsWithSlots(exB);
      const volB = round1(workingSetsB.reduce((sum, s) => sum + s.volume, 0));
      const repsB = workingSetsB.reduce((sum, s) => sum + s.reps, 0);

      const diffVol = round1(volA - volB);
      const pctVol = computePct(diffVol, volB);

      const bestE1rmA = workingSetsA.length ? round1(Math.max(...workingSetsA.map((s) => s.e1rm))) : 0;
      const bestE1rmB = workingSetsB.length ? round1(Math.max(...workingSetsB.map((s) => s.e1rm))) : 0;
      const diffE1rm = round1(bestE1rmA - bestE1rmB);
      const pctE1rm = computePct(diffE1rm, bestE1rmB);

      const maxSlotA = slotsA.size ? Math.max(...slotsA.keys()) : -1;
      const maxSlotB = slotsB.size ? Math.max(...slotsB.keys()) : -1;
      const maxSlot = Math.max(maxSlotA, maxSlotB);

      const setComparisons = [];
      for (let slot = 0; slot <= maxSlot; slot++) {
        const sA = slotsA.get(slot) || null;
        const sB = slotsB.get(slot) || null;
        if (!sA && !sB) continue;
        const setIdx = sA ? sA.setIndex : (sB ? sB.setIndex : slot);
        setComparisons.push(compareSets(sA, sB, setIdx));
      }

      const volumeDelta = { base: volA, target: volB, diff: diffVol, pct: pctVol };
      const bestE1rmDelta = { base: bestE1rmA, target: bestE1rmB, diff: diffE1rm, pct: pctE1rm };
      const { status, statusLabelTh } = evaluateExerciseStatus(volumeDelta, bestE1rmDelta, setComparisons);

      comparedExercises.push({
        exerciseId: exA.id || exA.exerciseId,
        canonicalId: exA.canonicalId || key,
        name: exA.name || exA.exerciseName || key,
        category: exA.category || '',
        status,
        statusLabelTh,
        volumeDelta,
        bestE1rmDelta,
        setComparisons
      });
    } else {
      newExercises.push({
        exerciseId: exA.id || exA.exerciseId,
        canonicalId: exA.canonicalId || key,
        name: exA.name || exA.exerciseName || key,
        category: exA.category || '',
        workingSetsCount: workingSetsA.length,
        totalVolumeKg: volA
      });
    }
  }

  // Process Target Exercises for Dropped ones
  for (const [key, exB] of targetMap.entries()) {
    const workingSetsB = extractWorkingSets(exB);
    const volB = round1(workingSetsB.reduce((sum, s) => sum + s.volume, 0));
    const repsB = workingSetsB.reduce((sum, s) => sum + s.reps, 0);

    sumTargetVolume += volB;
    sumTargetReps += repsB;
    sumTargetWorkingSets += workingSetsB.length;

    if (!baseMap.has(key)) {
      droppedExercises.push({
        exerciseId: exB.id || exB.exerciseId,
        canonicalId: exB.canonicalId || key,
        name: exB.name || exB.exerciseName || key,
        category: exB.category || '',
        workingSetsCount: workingSetsB.length,
        totalVolumeKg: volB
      });
    }
  }

  // Macro Deltas
  sumBaseVolume = round1(sumBaseVolume);
  sumTargetVolume = round1(sumTargetVolume);
  const diffVolume = round1(sumBaseVolume - sumTargetVolume);
  const pctVolume = computePct(diffVolume, sumTargetVolume);

  const diffReps = sumBaseReps - sumTargetReps;
  const pctReps = computePct(diffReps, sumTargetReps);

  const baseSetsDone = sumBaseWorkingSets;
  const targetSetsDone = sumTargetWorkingSets;
  const diffSets = baseSetsDone - targetSetsDone;
  const pctSets = computePct(diffSets, targetSetsDone);

  // Duration & Density
  const durA = baseHeader.durationSec;
  const durB = targetHeader.durationSec;
  let durationDelta = { base: durA, target: durB, diff: null, pct: null };
  let densityDelta = { base: null, target: null, diff: null, pct: null };

  if (Number.isFinite(durA) && durA > 0 && Number.isFinite(durB) && durB > 0) {
    const diffDur = durA - durB;
    const pctDur = computePct(diffDur, durB);
    durationDelta = { base: durA, target: durB, diff: diffDur, pct: pctDur };

    const densA = round1(sumBaseVolume / (durA / 60));
    const densB = round1(sumTargetVolume / (durB / 60));
    const diffDens = round1(densA - densB);
    const pctDens = computePct(diffDens, densB);
    densityDelta = { base: densA, target: densB, diff: diffDens, pct: pctDens };
  } else if (Number.isFinite(durA) && durA > 0) {
    densityDelta.base = round1(sumBaseVolume / (durA / 60));
  } else if (Number.isFinite(durB) && durB > 0) {
    densityDelta.target = round1(sumTargetVolume / (durB / 60));
  }

  // Session Load AU
  const loadA = baseHeader.sessionLoadAu;
  const loadB = targetHeader.sessionLoadAu;
  let sessionLoadDelta = { base: loadA, target: loadB, diff: null, pct: null };
  if (Number.isFinite(loadA) && Number.isFinite(loadB)) {
    const diffLoad = round1(loadA - loadB);
    const pctLoad = computePct(diffLoad, loadB);
    sessionLoadDelta = { base: loadA, target: loadB, diff: diffLoad, pct: pctLoad };
  }

  // Exercise counts
  const progressedCount = comparedExercises.filter((e) => e.status === 'progressed').length;
  const maintainedCount = comparedExercises.filter((e) => e.status === 'maintained').length;
  const regressedCount = comparedExercises.filter((e) => e.status === 'regressed').length;
  const totalMatched = comparedExercises.length;

  const exerciseCounts = {
    total: totalMatched,
    progressed: progressedCount,
    maintained: maintainedCount,
    regressed: regressedCount,
    newAdded: newExercises.length,
    dropped: droppedExercises.length
  };

  // Progressive Overload Verdict Score
  let verdictScore = 50;
  if (totalMatched > 0) {
    verdictScore = Math.round(((progressedCount * 1.0 + maintainedCount * 0.5) / totalMatched) * 100);
  } else if (newExercises.length > 0 && droppedExercises.length === 0) {
    verdictScore = 80;
  }

  let verdict = 'maintained';
  let verdictLabelTh = 'รักษามาตรฐานได้ดี';

  if (verdictScore >= 70) {
    verdict = 'overload';
    verdictLabelTh = 'ก้าวหน้าขึ้นอย่างยอดเยี่ยม';
  } else if (verdictScore < 40) {
    verdict = 'regressed';
    verdictLabelTh = 'ลดลงจากรอบก่อน';
  }

  // Natural Thai summary text
  let summaryTextTh = '';
  if (totalMatched > 0) {
    const volStr = `${diffVolume >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} ${diffVolume >= 0 ? '+' : ''}${diffVolume.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg (${diffVolume >= 0 ? '+' : ''}${pctVolume}%)`;
    summaryTextTh = `คุณทำ Progressive Overload สำเร็จใน ${progressedCount} จาก ${totalMatched} ท่าฝึก โวลุ่มรวม${volStr}`;
    if (densityDelta.diff !== null && Number.isFinite(densityDelta.diff)) {
      const densStr = `และฝึกได้หนาแน่น${densityDelta.diff >= 0 ? 'ขึ้น' : 'ลดลง'} ${densityDelta.diff >= 0 ? '+' : ''}${densityDelta.diff.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} kg/นาที`;
      summaryTextTh += ` ${densStr}`;
    }
  } else {
    summaryTextTh = 'เปรียบเทียบเซสชันสำเร็จ (ไม่พบท่าฝึกที่ตรงกันโดยตรง)';
  }

  return {
    success: true,
    hasComparison: true,
    baseSession: baseHeader,
    targetSession: targetHeader,
    summary: {
      verdict,
      verdictLabelTh,
      verdictScore,
      summaryTextTh,
      macroDelta: {
        totalVolumeKg: { base: sumBaseVolume, target: sumTargetVolume, diff: diffVolume, pct: pctVolume },
        totalReps: { base: sumBaseReps, target: sumTargetReps, diff: diffReps, pct: pctReps },
        totalSetsDone: { base: baseSetsDone, target: targetSetsDone, diff: diffSets, pct: pctSets },
        durationSec: durationDelta,
        densityKgPerMin: densityDelta,
        sessionLoadAu: sessionLoadDelta
      },
      exerciseCounts
    },
    exercises: comparedExercises,
    newExercises,
    droppedExercises
  };
}

/**
 * Automatically locate the prior comparison session for a given session ID.
 * Priority:
 *   1. Prior session with matching day_key.
 *   2. Closest prior session chronologically.
 */
function findLatestPair(history, sessionId) {
  const list = Array.isArray(history) ? history : [];
  const baseSession = list.find((s) => s && s.id === sessionId);
  if (!baseSession) {
    return { baseSession: null, targetSession: null };
  }

  const baseIdx = list.indexOf(baseSession);
  const baseDate = baseSession.date || '';
  const baseTime = baseSession.time || '';
  const baseDayKey = baseSession.dayKey || baseSession.day_key || '';

  // Candidates that are chronologically older than baseSession
  const priorCandidates = list.filter((s, idx) => {
    if (!s || s.id === baseSession.id) return false;
    if (baseDate && s.date) {
      if (s.date < baseDate) return true;
      if (s.date === baseDate && s.time && baseTime && s.time < baseTime) return true;
      if (s.date === baseDate && (!s.time || !baseTime) && idx > baseIdx) return true;
      return false;
    }
    return idx > baseIdx;
  });

  if (priorCandidates.length === 0) {
    return { baseSession, targetSession: null };
  }

  // 1. Same day_key
  const sameDayKey = priorCandidates.find((s) => {
    const k = s.dayKey || s.day_key;
    return k && baseDayKey && k === baseDayKey;
  });

  if (sameDayKey) {
    return { baseSession, targetSession: sameDayKey };
  }

  // 2. Closest prior session
  return { baseSession, targetSession: priorCandidates[0] };
}

module.exports = {
  compareWorkoutSessions,
  findLatestPair,
  formatSessionHeader,
  extractWorkingSets,
  extractWorkingSetsWithSlots,
  compareSets,
  evaluateExerciseStatus
};
