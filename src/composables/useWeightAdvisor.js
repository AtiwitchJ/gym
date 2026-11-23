/**
 * Progressive Overload Weight Advisor
 * Rule:
 *  - Target Range for working sets: 6–8 reps
 *  - If reps > 8: Increase weight by +2 kg (แรงเหลือ ควรเพิ่มน้ำหนัก)
 *  - If reps < 6: Decrease weight by -2 kg (หนักเกินไป ควรลดน้ำหนัก)
 *  - If 6 <= reps <= 8: Optimal sweet spot, maintain weight (กำลังดี โฟกัสฟอร์มและคงน้ำหนักเดิม)
 * Approved rule (owner, 2026-11-20), used by both the per-set and the next-session advice:
 *  - Keep the same weight until every working set reaches the TOP of its target range
 *    with RIR 1 or 2+. Only then add +2 kg next session.
 *  - RIR 0 ("ล้ม") holds the weight. A missing RIR holds the weight.
 *  - A set below the top of its range holds the weight.
 *  - Sets that were skipped or not done do not count.
 *  - Reps below the minimum still give -2 kg.
 */
import { normalizeRir } from './useRir.js';

export function isWarmupType(type) {
  if (!type) return false;
  const t = String(type).toLowerCase().trim();
  return t === 'warm' || t === 'warmup' || t === 'วอร์ม';
}

export function isDropType(type) {
  if (!type) return false;
  const t = String(type).toLowerCase().trim();
  return t === 'drop' || t === 'dropset' || t === 'ดรอป' || t === 'ดรอปเซ็ต' || t === 'd';
}

export function parseRepTarget(repStr) {
  if (!repStr) return { min: 6, max: 8 };
  // Strip parenthetical notes first, e.g. "(40-50%)" or "(ท้าทาย)" so numbers inside them don't interfere with the target rep range
  const clean = String(repStr).replace(/\([^)]*\)/g, '').trim();
  const match = clean.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (match) {
    return {
      min: parseInt(match[1], 10),
      max: parseInt(match[2], 10)
    };
  }
  const single = clean.match(/\d+/);
  if (single) {
    const val = parseInt(single[0], 10);
    return { min: val, max: val };
  }
  return { min: 6, max: 8 };
}

/** A working set has reached the top of its target range with a usable RIR (1 or 2+). RIR 0 and missing RIR do not count. */
export function setReachedTop(reps, maxTarget, rir) {
  const r = normalizeRir(rir);
  return Number(reps) >= maxTarget && (r === 1 || r === 2);
}

export function calculateWeightAdvice({ weight, reps, type = 'work', targetReps = null, rir = null }) {
  const numWeight = parseFloat(weight) || 0;
  const numReps = parseInt(reps, 10);

  if (isNaN(numReps) || numReps <= 0) {
    return null;
  }

  // Warmup sets (Target: 15–20 reps. If >= 20 reps, recommend +2 kg warmup weight; if < 12 reps, recommend -2 kg)
  if (isWarmupType(type)) {
    if (numReps >= 20) {
      const suggestedWeight = Math.round((numWeight + 2) * 10) / 10;
      return {
        type: 'warm',
        status: 'increase',
        delta: 2,
        currentWeight: numWeight,
        suggestedWeight,
        reps: numReps,
        badgeText: '+2 kg วอร์ม',
        badgeClass: 'bg-flame text-white border-plate shadow-[1px_1px_0px_#1e2220]',
        reasonText: `วอร์ม ${numReps} ครั้ง (>= 20) — เพิ่ม +2 กก.`,
        shortText: '+2 กก. วอร์ม',
        actionLabel: `${suggestedWeight} กก.`
      };
    }

    if (numReps < 12) {
      const suggestedWeight = Math.max(0, Math.round((numWeight - 2) * 10) / 10);
      return {
        type: 'warm',
        status: 'decrease',
        delta: -2,
        currentWeight: numWeight,
        suggestedWeight,
        reps: numReps,
        badgeText: '-2 kg วอร์ม',
        badgeClass: 'bg-amber-500 text-white border-plate shadow-[1px_1px_0px_#1e2220]',
        reasonText: `วอร์ม ${numReps} ครั้ง (< 12) — ลด -2 กก.`,
        shortText: '-2 กก. วอร์ม',
        actionLabel: `${suggestedWeight} กก.`
      };
    }

    return {
      type: 'warm',
      status: 'optimal',
      delta: 0,
      currentWeight: numWeight,
      suggestedWeight: numWeight,
      reps: numReps,
      badgeText: 'วอร์มพอดี ✓',
      badgeClass: 'bg-sky-bg text-sky-text border-sky/40',
      reasonText: `วอร์ม ${numReps} ครั้ง (15–20) — พอดี`,
      shortText: 'วอร์มพอดี',
      actionLabel: `${numWeight} กก.`
    };
  }

  // Drop sets (Drop sets are intended for metabolic stress/fatigue, do not penalize with -2 kg advice)
  if (isDropType(type)) {
    return {
      type: 'drop',
      status: 'optimal',
      delta: 0,
      currentWeight: numWeight,
      suggestedWeight: numWeight,
      reps: numReps,
      badgeText: 'ดรอปเซ็ต',
      badgeClass: 'bg-purple-100 text-purple-900 border-2 border-purple-600 shadow-[1px_1px_0px_#7c3aed]',
      reasonText: `ดรอปเซ็ต ${numReps} ครั้ง — ยกต่อทันที ไม่ลดน้ำหนักเซ็ตหลัก`,
      shortText: 'ดรอปเซ็ต',
      actionLabel: `${numWeight} กก.`
    };
  }

  // Working sets (respect custom target range if provided e.g. 12-15 for calves, or 6-8 default)
  const target = parseRepTarget(targetReps);
  const minTarget = target.min || 6;
  const maxTarget = target.max || 8;

  if (numReps < minTarget) {
    const suggestedWeight = Math.max(0, Math.round((numWeight - 2) * 10) / 10);
    return {
      type: 'work',
      status: 'decrease',
      delta: -2,
      currentWeight: numWeight,
      suggestedWeight,
      reps: numReps,
      badgeText: '-2 kg',
      badgeClass: 'bg-amber-500 text-white border-plate shadow-[1px_1px_0px_#1e2220]',
      reasonText: `เล่นจริง ${numReps} ครั้ง (< ${minTarget}) — ลด -2 กก.`,
      shortText: '-2 กก.',
      actionLabel: `${suggestedWeight} กก.`
    };
  }

  // Top of the range with RIR 1 or 2+: +2 kg.
  if (setReachedTop(numReps, maxTarget, rir)) {
    const suggestedWeight = Math.round((numWeight + 2) * 10) / 10;
    return {
      type: 'work',
      status: 'increase',
      delta: 2,
      currentWeight: numWeight,
      suggestedWeight,
      reps: numReps,
      badgeText: '+2 kg',
      badgeClass: 'bg-flame text-white border-plate shadow-[1px_1px_0px_#1e2220]',
      reasonText: `เล่นจริง ${numReps} ครั้ง (ถึงบนสุด ${maxTarget}) — เพิ่ม +2 กก.`,
      shortText: '+2 กก.',
      actionLabel: `${suggestedWeight} กก.`
    };
  }

  // Hold the weight. RIR 0 and a missing RIR at the top are named so the user knows why.
  const holdAt = (badgeText, reasonText) => ({
    type: 'work',
    status: 'optimal',
    delta: 0,
    currentWeight: numWeight,
    suggestedWeight: numWeight,
    reps: numReps,
    badgeText,
    badgeClass: 'bg-emerald text-white border-plate shadow-[1px_1px_0px_#059669]',
    reasonText,
    shortText: badgeText,
    actionLabel: `${numWeight} กก.`
  });
  if (normalizeRir(rir) === 0) {
    return holdAt('คงเดิม (ล้ม)', `เล่นจริง ${numReps} ครั้ง แต่ล้ม (RIR 0) — คงน้ำหนักเดิม`);
  }
  if (numReps >= maxTarget) {
    return holdAt('คงเดิม (ยังไม่มี RIR)', `เล่นจริง ${numReps} ครั้ง ยังไม่ได้เลือก RIR — คงน้ำหนักเดิม`);
  }

  // Below the top of the range (minTarget <= numReps < maxTarget)
  return {
    type: 'work',
    status: 'optimal',
    delta: 0,
    currentWeight: numWeight,
    suggestedWeight: numWeight,
    reps: numReps,
    badgeText: 'พอดี ✓',
    badgeClass: 'bg-emerald text-white border-plate shadow-[1px_1px_0px_#059669]',
    reasonText: `เล่นจริง ${numReps} ครั้ง (${minTarget}–${maxTarget}) — พอดี`,
    shortText: 'พอดี',
    actionLabel: `${numWeight} กก.`
  };
}

/**
 * Computes overall next-session recommendation for an exercise
 * based on its working sets and warm-up sets history.
 */
export function getExerciseOverallAdvice(sets = []) {
  if (!sets || sets.length === 0) return null;

  // 1. Separate warm-up sets and working/touchup sets
  const warmSets = sets.filter(s => isWarmupType(s.type) && s.reps && Number(s.reps) > 0);
  // Skipped or not-done sets do not count toward the advice.
  const workSets = sets.filter(s => !isWarmupType(s.type) && s.reps && Number(s.reps) > 0 && s.done !== false && s.skipped !== true);

  let warmAdvice = null;
  if (warmSets.length > 0) {
    const lastWarm = warmSets[warmSets.length - 1];
    const warmReps = Number(lastWarm.reps);
    const warmWeight = Number(lastWarm.weight) || 0;

    if (warmReps >= 20) {
      const suggested = Math.round((warmWeight + 2) * 10) / 10;
      warmAdvice = {
        type: 'warm',
        status: 'increase',
        delta: 2,
        baseWeight: warmWeight,
        suggestedWeight: suggested,
        badgeText: '+2 kg',
        badgeClass: 'bg-flame text-white border-plate shadow-[0.5px_0.5px_0px_#1e2220]',
        headline: `รอบหน้าวอร์ม: +2 กก. (${suggested} กก.)`,
        reason: `วอร์มได้ ${warmReps} ครั้ง (>= 20) แนะนำเพิ่มน้ำหนักวอร์มสัปดาห์หน้า`,
        actionLabel: `${suggested} กก.`
      };
    } else if (warmReps < 12) {
      const suggested = Math.max(0, Math.round((warmWeight - 2) * 10) / 10);
      warmAdvice = {
        type: 'warm',
        status: 'decrease',
        delta: -2,
        baseWeight: warmWeight,
        suggestedWeight: suggested,
        badgeText: '-2 kg',
        badgeClass: 'bg-amber-500 text-white border-plate shadow-[0.5px_0.5px_0px_#1e2220]',
        headline: `รอบหน้าวอร์ม: -2 กก. (${suggested} กก.)`,
        reason: `วอร์มได้ ${warmReps} ครั้ง (< 12) แนะนำลดน้ำหนักวอร์มลง`,
        actionLabel: `${suggested} กก.`
      };
    } else {
      warmAdvice = {
        type: 'warm',
        status: 'optimal',
        delta: 0,
        baseWeight: warmWeight,
        suggestedWeight: warmWeight,
        badgeText: '0 kg',
        badgeClass: 'bg-emerald text-white border-plate shadow-[0.5px_0.5px_0px_#059669]',
        headline: `รอบหน้าวอร์ม: คงเดิม (${warmWeight} กก.)`,
        reason: `วอร์มได้ ${warmReps} ครั้ง (12–19) กำลังพอดี`,
        actionLabel: `${warmWeight} กก.`
      };
    }
  }

  let workAdvice = null;
  if (workSets.length > 0) {
    let decreaseCount = 0;
    let lastWorkWeight = 0;

    // Filter out drop sets for overload evaluation so drops don't pull down the recommendation
    const standardWorkSets = workSets.filter(s => !isDropType(s.type));
    const evalSets = standardWorkSets.length > 0 ? standardWorkSets : workSets;

    const workWithTarget = evalSets.find(s => s.targetReps) || evalSets[0];
    const target = parseRepTarget(workWithTarget?.targetReps);
    const minTarget = target.min || 6;
    const maxTarget = target.max || 8;

    evalSets.forEach(s => {
      const r = Number(s.reps);
      const w = Number(s.weight) || 0;
      if (w > 0) lastWorkWeight = w;
      const sTarget = parseRepTarget(s.targetReps);
      const sMin = sTarget.min || minTarget;
      if (r < sMin) decreaseCount++;
    });

    const isTouch = workSets.some(s => s.type === 'touchup' || s.type === 'touch');
    const setLabel = isTouch ? 'เซ็ตเล่นเสริม' : 'เซ็ตเล่นจริง';

    // Rule (approved): +2 kg next session only when EVERY working set reached the top of its target
    // range with RIR 1 or 2+. A majority below the minimum gives -2 kg. Anything else holds the weight
    // (RIR 0 and a missing RIR hold). Skipped or unfinished sets are not in workSets.
    const allReachedTop = evalSets.every((s) => {
      const sMax = parseRepTarget(s.targetReps).max || maxTarget;
      return setReachedTop(s.reps, sMax, s.rir);
    });
    const anyFailed = evalSets.some((s) => normalizeRir(s.rir) === 0);
    const anyMissingAtTop = evalSets.some((s) => {
      const sMax = parseRepTarget(s.targetReps).max || maxTarget;
      return normalizeRir(s.rir) === null && Number(s.reps) >= sMax;
    });

    if (decreaseCount >= evalSets.length / 2) {
      const suggested = Math.max(0, Math.round((lastWorkWeight - 2) * 10) / 10);
      workAdvice = {
        type: isTouch ? 'touch' : 'work',
        status: 'decrease',
        delta: -2,
        baseWeight: lastWorkWeight,
        suggestedWeight: suggested,
        badgeText: '-2 kg',
        badgeClass: 'bg-amber-500 text-white border-plate shadow-[0.5px_0.5px_0px_#1e2220]',
        headline: `รอบหน้า: -2 กก. (${suggested} กก.)`,
        reason: `ยกไม่ถึง ${minTarget} ครั้ง แนะนำลดน้ำหนักลง`,
        actionLabel: `${suggested} กก.`
      };
    } else if (!allReachedTop) {
      const reason = anyFailed
        ? 'มีเซ็ตที่ล้ม (RIR 0) แนะนำคงน้ำหนักเดิม'
        : anyMissingAtTop
          ? 'เซ็ตที่ถึงบนสุดของเป้ายังไม่ได้เลือก RIR แนะนำคงน้ำหนักเดิม'
          : `ยังไม่ถึงบนสุดของเป้า (${maxTarget}) ทุกเซ็ต แนะนำคงน้ำหนักเดิม`;
      workAdvice = {
        type: isTouch ? 'touch' : 'work',
        status: 'optimal',
        delta: 0,
        baseWeight: lastWorkWeight,
        suggestedWeight: lastWorkWeight,
        badgeText: '0 kg',
        badgeClass: 'bg-emerald text-white border-plate shadow-[0.5px_0.5px_0px_#059669]',
        headline: `รอบหน้า: คงเดิม (${lastWorkWeight} กก.)`,
        reason,
        actionLabel: `${lastWorkWeight} กก.`
      };
    } else {
      const suggested = Math.round((lastWorkWeight + 2) * 10) / 10;
      workAdvice = {
        type: isTouch ? 'touch' : 'work',
        status: 'increase',
        delta: 2,
        baseWeight: lastWorkWeight,
        suggestedWeight: suggested,
        badgeText: '+2 kg',
        badgeClass: 'bg-flame text-white border-plate shadow-[0.5px_0.5px_0px_#1e2220]',
        headline: `รอบหน้า: +2 กก. (${suggested} กก.)`,
        reason: `เล่นได้ตามเป้าหมาย (${minTarget}–${maxTarget} ครั้งขึ้นไป) แนะนำเพิ่มน้ำหนักสัปดาห์หน้า`,
        actionLabel: `${suggested} กก.`
      };
    }
  }

  if (!workAdvice && !warmAdvice) return null;

  const primary = workAdvice || warmAdvice;

  return {
    ...primary,
    workAdvice,
    warmAdvice,
    hasWarmAdvice: !!(warmAdvice && warmAdvice.delta !== 0),
    hasWorkAdvice: !!(workAdvice && workAdvice.delta !== 0)
  };
}

/**
 * Whether an advised value may fill a weight input: only while the set is still empty.
 * Advice never replaces a value the user already typed (criterion 5).
 */
export function shouldFillWeight(value) {
  return value === undefined || value === null || value === '';
}

/**
 * Next-session advice from exercise history (GET /api/exercises/:id/history, normalized by
 * useExerciseHistory.normalizeExerciseHistory). Sessions are newest first. Uses the newest
 * session with a completed set. Returns null when there is none, so callers keep the old behavior.
 */
export function historyWeightAdvice(sessions) {
  if (!Array.isArray(sessions)) return null;
  for (const session of sessions) {
    const done = (session?.sets || []).filter((s) => s && s.done && Number(s.actualReps) > 0);
    if (done.length === 0) continue;
    const advice = getExerciseOverallAdvice(done.map((s) => ({
      type: s.type,
      weight: s.weight ?? 0,
      reps: s.actualReps,
      rir: s.rir
    })));
    return advice ? { ...advice, source: 'history', sessionDate: String(session.date || '') } : null;
  }
  return null;
}

export function useWeightAdvisor() {
  return {
    isWarmupType,
    isDropType,
    parseRepTarget,
    calculateWeightAdvice,
    getExerciseOverallAdvice,
    historyWeightAdvice,
    shouldFillWeight
  };
}
