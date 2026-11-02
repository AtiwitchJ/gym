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
        badgeClass: 'bg-flame text-white border-plate shadow-[1.5px_1.5px_0px_#1e2220]',
        reasonText: `เซ็ตวอร์มยกได้ ${numReps} ครั้ง (> 20) — เบาเกินไป แนะนำเพิ่มน้ำหนักวอร์ม +2 กก. เป็น ${suggestedWeight} กก.`,
        shortText: '+2 กก. วอร์ม (เบาไป)',
        actionLabel: `ปรับวอร์มเป็น ${suggestedWeight} กก.`
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
        badgeClass: 'bg-amber-500 text-white border-plate shadow-[1.5px_1.5px_0px_#1e2220]',
        reasonText: `เซ็ตวอร์มยกได้ ${numReps} ครั้ง (< 12) — หนักเกินไปสำหรับวอร์มข้อต่อ แนะนำลดน้ำหนักวอร์มลง -2 กก. เป็น ${suggestedWeight} กก.`,
        shortText: '-2 กก. วอร์ม (หนักไป)',
        actionLabel: `ปรับวอร์มเป็น ${suggestedWeight} กก.`
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
      reasonText: `เซ็ตวอร์มยกได้ ${numReps} ครั้ง (ช่วง 15–20) — น้ำหนักวอร์มกำลังพอดีสำหรับการเตรียมข้อต่อ`,
      shortText: 'วอร์มพอดี (15–20)',
      actionLabel: `คงวอร์ม ${numWeight} กก.`
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
      badgeClass: 'bg-flame text-white border-plate shadow-[1.5px_1.5px_0px_#1e2220]',
      reasonText: `ยกได้ ${numReps} ครั้ง (> 8) — แรงยังเหลือ แนะนำเพิ่มน้ำหนัก +2 กก. เป็น ${suggestedWeight} กก.`,
      shortText: '+2 กก. (แรงเหลือ)',
      actionLabel: `ปรับเป็น ${suggestedWeight} กก.`
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
      badgeClass: 'bg-amber-500 text-white border-plate shadow-[1.5px_1.5px_0px_#1e2220]',
      reasonText: `ยกได้ ${numReps} ครั้ง (< 6) — หนักเกินไป แนะนำลดน้ำหนัก -2 กก. เป็น ${suggestedWeight} กก.`,
      shortText: '-2 กก. (หนักไป)',
      actionLabel: `ปรับเป็น ${suggestedWeight} กก.`
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
    badgeClass: 'bg-emerald text-white border-plate shadow-[1.5px_1.5px_0px_#059669]',
    reasonText: `ยกได้ ${numReps} ครั้ง (อยู่ในช่วง 6–8) — น้ำหนักเหมาะสมมาก โฟกัสคุมจังหวะและคงน้ำหนักนี้ไว้`,
    shortText: 'กำลังดี (6–8)',
    actionLabel: `คงที่ ${numWeight} กก.`
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
    warmAdvice = calculateWeightAdvice({
      weight: lastWarm.weight,
      reps: lastWarm.reps,
      type: 'warm'
    });
  }

  let workAdvice = null;
  if (workSets.length > 0) {
    let increaseCount = 0;
    let decreaseCount = 0;
    let optimalCount = 0;
    let lastWorkWeight = 0;

    workSets.forEach(s => {
      const advice = calculateWeightAdvice({ weight: s.weight, reps: s.reps, type: s.type || 'work' });
      if (advice && advice.type !== 'warm') {
        if (advice.delta > 0) increaseCount++;
        else if (advice.delta < 0) decreaseCount++;
        else optimalCount++;
        lastWorkWeight = advice.currentWeight;
      }
    });

    const isTouch = workSets.some(s => s.type === 'touchup' || s.type === 'touch');
    const setLabel = isTouch ? 'เซ็ตเล่นเสริม' : 'เซ็ตเล่นจริง';

    if (increaseCount >= workSets.length / 2) {
      const suggested = Math.round((lastWorkWeight + 2) * 10) / 10;
      workAdvice = {
        type: isTouch ? 'touch' : 'work',
        status: 'increase',
        delta: 2,
        baseWeight: lastWorkWeight,
        suggestedWeight: suggested,
        badgeText: 'แนะนำ +2 กก.',
        badgeClass: 'bg-flame text-white',
        headline: `รอบหน้าแนะนำเพิ่ม ${setLabel} +2 กก. เป็น ${suggested} กก.`,
        reason: `เพราะรอบล่าสุดคุณยก ${setLabel} ได้เกิน 8 ครั้ง แปลว่าแรงยังเหลือและพร้อมพัฒนาขึ้นอีกขั้น!`,
        actionLabel: `ใช้ค่าน้ำหนักแนะนำ (${suggested} กก.)`
      };
    } else if (decreaseCount >= workSets.length / 2) {
      const suggested = Math.max(0, Math.round((lastWorkWeight - 2) * 10) / 10);
      workAdvice = {
        type: isTouch ? 'touch' : 'work',
        status: 'decrease',
        delta: -2,
        baseWeight: lastWorkWeight,
        suggestedWeight: suggested,
        badgeText: 'แนะนำ -2 กก.',
        badgeClass: 'bg-amber-500 text-white',
        headline: `รอบหน้าแนะนำลด ${setLabel} -2 กก. เป็น ${suggested} กก.`,
        reason: `เพราะรอบล่าสุดยก ${setLabel} ได้ไม่ถึง 6 ครั้ง น้ำหนักอาจจะหนักเกินไป ลดลงนิดเพื่อเน้นฟอร์มที่ถูกต้อง`,
        actionLabel: `ใช้ค่าน้ำหนักแนะนำ (${suggested} กก.)`
      };
    } else {
      workAdvice = {
        type: isTouch ? 'touch' : 'work',
        status: 'optimal',
        delta: 0,
        baseWeight: lastWorkWeight,
        suggestedWeight: lastWorkWeight,
        badgeText: 'น้ำหนักลงตัว ✓',
        badgeClass: 'bg-emerald text-white',
        headline: `น้ำหนัก ${setLabel} เหมาะสมแล้ว (${lastWorkWeight} กก.)`,
        reason: `คุณยกได้อยู่ในเกณฑ์ 6–8 ครั้งตามเป้าหมาย โฟกัสจังหวะการบีบกล้ามเนื้อและคงน้ำหนักนี้ไว้`,
        actionLabel: `คงน้ำหนักเดิม (${lastWorkWeight} กก.)`
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
