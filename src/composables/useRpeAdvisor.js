/**
 * RIR (Reps in Reserve) & Estimated 1RM (e1RM) Engine
 * Designed for Hypertrophy & Strength Progression
 */

export const RIR_OPTIONS = [
  { rir: 0, rpe: 10, label: 'RIR 0', name: 'หมดแรงเกลี้ยง (Failure)', shortDesc: 'ยกต่อไม่ได้แล้ว', color: '#DC2626' },
  { rir: 1, rpe: 9,  label: 'RIR 1', name: 'เหลือ 1 ครั้ง (Very Hard)', shortDesc: 'เค้นได้อีกครั้งเดียว', color: '#EA580C' },
  { rir: 2, rpe: 8,  label: 'RIR 2', name: 'เหลือ 2 ครั้ง (Sweet Spot)', shortDesc: 'จุดที่กล้ามโตดีที่สุด', color: '#16A34A' },
  { rir: 3, rpe: 7,  label: 'RIR 3+', name: 'เหลือ 3+ ครั้ง (Moderate)', shortDesc: 'ยังสบาย เล่นต่อได้', color: '#2563EB' }
];

/**
 * Calculate Estimated 1RM (e1RM) using Brzycki / Epley Hybrid Formula with RIR
 * @param {number|string} weight - Weight lifted in kg
 * @param {number|string} reps - Completed reps
 * @param {number|string|null} rir - Reps In Reserve (0 to 4+)
 * @returns {number} Estimated 1RM in kg rounded to 1 decimal place
 */
export function calculateEstimated1RM(weight, reps, rir = 0) {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps, 10) || 0;
  const reserve = (rir !== null && rir !== undefined && rir !== '') ? parseInt(rir, 10) : 0;

  if (w <= 0 || r <= 0) return 0;

  // Effective reps = actual reps + reserve reps
  const effectiveReps = r + reserve;

  // Hybrid Epley formula: e1RM = Weight * (1 + effectiveReps / 30)
  const e1rm = w * (1 + effectiveReps / 30);
  return Math.round(e1rm * 10) / 10;
}

/**
 * Retrieve metadata for a given RIR value
 * @param {number|string|null} rir 
 */
export function getRirMeta(rir) {
  if (rir === null || rir === undefined || rir === '') return null;
  const num = parseInt(rir, 10);
  if (isNaN(num)) return null;
  if (num >= 3) return RIR_OPTIONS[3];
  return RIR_OPTIONS.find(opt => opt.rir === num) || null;
}

export function useRpeAdvisor() {
  return {
    rirOptions: RIR_OPTIONS,
    calculateEstimated1RM,
    getRirMeta
  };
}
