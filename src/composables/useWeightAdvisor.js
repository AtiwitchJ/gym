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

  // Warmup sets (target ~15, strictly excluded from 6-8 hypertrophy rule)
  if (isWarmupType(type)) {
    return {
      type: 'warm',
      status: 'warmup',
      delta: 0,
      currentWeight: numWeight,
      suggestedWeight: numWeight,
      reps: numReps,
      badgeText: 'วอร์ม',
      badgeClass: 'bg-sky-bg text-sky border-sky/40',
      reasonText: `เซ็ตวอร์ม ${numReps} ครั้ง เพื่อวอร์มข้อต่อและกระตุ้นการไหลเวียนเลือด (ไม่นำมาคิดรวมกับเซ็ตเล่นจริง)`,
      shortText: 'วอร์มข้อต่อ'
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
 * based on its working sets history.
 */
export function getExerciseOverallAdvice(sets = []) {
  if (!sets || sets.length === 0) return null;

  // Filter only working sets that have both weight and reps (warm-up sets are strictly excluded)
  const workSets = sets.filter(s => !isWarmupType(s.type) && s.reps && Number(s.reps) > 0);
  if (workSets.length === 0) return null;

  // Evaluate the primary working sets
  let totalDelta = 0;
  let increaseCount = 0;
  let decreaseCount = 0;
  let optimalCount = 0;
  let lastWorkWeight = 0;

  workSets.forEach(s => {
    const advice = calculateWeightAdvice({ weight: s.weight, reps: s.reps, type: 'work' });
    if (advice) {
      if (advice.delta > 0) increaseCount++;
      else if (advice.delta < 0) decreaseCount++;
      else optimalCount++;
      lastWorkWeight = advice.currentWeight;
    }
  });

  if (increaseCount >= workSets.length / 2) {
    const suggested = Math.round((lastWorkWeight + 2) * 10) / 10;
    return {
      status: 'increase',
      delta: 2,
      baseWeight: lastWorkWeight,
      suggestedWeight: suggested,
      badgeText: 'แนะนำ +2 กก.',
      badgeClass: 'bg-flame text-white',
      headline: `รอบหน้าแนะนำเพิ่ม +2 กก. เป็น ${suggested} กก.`,
      reason: `เพราะรอบล่าสุดคุณยกเซ็ตเล่นจริงได้เกิน 8 ครั้ง แปลว่าแรงยังเหลือและพร้อมพัฒนาขึ้นอีกขั้น!`,
      actionLabel: `ใช้ค่าน้ำหนักแนะนำ (${suggested} กก.)`
    };
  }

  if (decreaseCount >= workSets.length / 2) {
    const suggested = Math.max(0, Math.round((lastWorkWeight - 2) * 10) / 10);
    return {
      status: 'decrease',
      delta: -2,
      baseWeight: lastWorkWeight,
      suggestedWeight: suggested,
      badgeText: 'แนะนำ -2 กก.',
      badgeClass: 'bg-amber-500 text-white',
      headline: `รอบหน้าแนะนำลด -2 กก. เป็น ${suggested} กก.`,
      reason: `เพราะรอบล่าสุดยกได้ไม่ถึง 6 ครั้ง น้ำหนักอาจจะหนักเกินไป ลดลงนิดเพื่อเน้นฟอร์มที่ถูกต้อง`,
      actionLabel: `ใช้ค่าน้ำหนักแนะนำ (${suggested} กก.)`
    };
  }

  return {
    status: 'optimal',
    delta: 0,
    baseWeight: lastWorkWeight,
    suggestedWeight: lastWorkWeight,
    badgeText: 'น้ำหนักลงตัว ✓',
    badgeClass: 'bg-emerald text-white',
    headline: `น้ำหนักเหมาะสมแล้ว (${lastWorkWeight} กก.)`,
    reason: `คุณยกได้อยู่ในเกณฑ์ 6–8 ครั้งตามเป้าหมาย โฟกัสจังหวะการบีบกล้ามเนื้อและคงน้ำหนักนี้ไว้`,
    actionLabel: `คงน้ำหนักเดิม (${lastWorkWeight} กก.)`
  };
}

export function useWeightAdvisor() {
  return {
    isWarmupType,
    calculateWeightAdvice,
    getExerciseOverallAdvice
  };
}
