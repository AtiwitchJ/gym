/**
 * Progressive Overload Weight Advisor
 * Rule:
 *  - Target Range for working sets: 6–8 reps
 *  - If reps > 8: Increase weight by +2 kg (แรงเหลือ ควรเพิ่มน้ำหนัก)
 *  - If reps < 6: Decrease weight by -2 kg (หนักเกินไป ควรลดน้ำหนัก)
 *  - If 6 <= reps <= 8: Optimal sweet spot, maintain weight (กำลังดี โฟกัสฟอร์มและคงน้ำหนักเดิม)
 */

export function isWarmupType(type) {
  if (!type) return false;
  const t = String(type).toLowerCase().trim();
  return t === 'warm' || t === 'warmup' || t === 'วอร์ม';
}

export function calculateWeightAdvice({ weight, reps, type = 'work' }) {
  const numWeight = parseFloat(weight) || 0;
  const numReps = parseInt(reps, 10);

  if (isNaN(numReps) || numReps <= 0) {
    return null;
  }

  // Warmup sets (Target: 15–20 reps. If > 20 reps, recommend +2 kg warmup weight; if < 12 reps, recommend -2 kg)
  if (isWarmupType(type)) {
    if (numReps > 20) {
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
        reasonText: `วอร์ม ${numReps} ครั้ง (> 20) — เพิ่ม +2 กก.`,
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
      badgeClass: 'bg-sky-bg text-sky border-sky/40',
      reasonText: `วอร์ม ${numReps} ครั้ง (15–20) — พอดี`,
      shortText: 'วอร์มพอดี',
      actionLabel: `${numWeight} กก.`
    };
  }

  // Working sets
  if (numReps > 8) {
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
      reasonText: `เล่นจริง ${numReps} ครั้ง (> 8) — เพิ่ม +2 กก.`,
      shortText: '+2 กก.',
      actionLabel: `${suggestedWeight} กก.`
    };
  }

  if (numReps < 6) {
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
      reasonText: `เล่นจริง ${numReps} ครั้ง (< 6) — ลด -2 กก.`,
      shortText: '-2 กก.',
      actionLabel: `${suggestedWeight} กก.`
    };
  }

  // 6 - 8 reps
  return {
    type: 'work',
    status: 'optimal',
    delta: 0,
    currentWeight: numWeight,
    suggestedWeight: numWeight,
    reps: numReps,
    badgeText: 'พอดี ✓',
    badgeClass: 'bg-emerald text-white border-plate shadow-[1px_1px_0px_#059669]',
    reasonText: `เล่นจริง ${numReps} ครั้ง (6–8) — พอดี`,
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
  const workSets = sets.filter(s => !isWarmupType(s.type) && s.reps && Number(s.reps) > 0);

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

    workSets.forEach(s => {
      const r = Number(s.reps);
      const w = Number(s.weight) || 0;
      if (w > 0) lastWorkWeight = w;
      if (r < 6) decreaseCount++;
    });

    const isTouch = workSets.some(s => s.type === 'touchup' || s.type === 'touch');
    const setLabel = isTouch ? 'เซ็ตเล่นเสริม' : 'เซ็ตเล่นจริง';

    // Rule:
    // If < 6 reps (majority failed to reach 6 reps): decrease by -2 kg
    // If >= 6 reps (achieved 6-8 sweet spot or > 8): for NEXT WEEK, progressive overload +2 kg!
    if (decreaseCount >= workSets.length / 2) {
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
        reason: `ยกไม่ถึง 6 ครั้ง แนะนำลดน้ำหนักลง`,
        actionLabel: `${suggested} กก.`
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
        reason: `เล่นได้ตามเป้าหมาย (6–8 ครั้งขึ้นไป) แนะนำเพิ่มน้ำหนักสัปดาห์หน้า`,
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

export function useWeightAdvisor() {
  return {
    isWarmupType,
    calculateWeightAdvice,
    getExerciseOverallAdvice
  };
}
