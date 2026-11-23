import { ref, computed } from 'vue';

export const DEFAULT_SESSION_RPE = 7;
export const DEFAULT_SRPE = 7;
export const DEFAULT_PUMP_RATING = 'good';
export const DEFAULT_JOINT_COMFORT = 'good';

export const PUMP_RATINGS = ['low', 'good', 'insane'];
export const JOINT_COMFORTS = ['good', 'mild_ache', 'pain'];

export const PUMP_CONFIG = {
  low: {
    id: 'low',
    label: 'น้อย / ไม่ค่อยปั๊ม',
    shortLabel: 'น้อย',
    emoji: '💧',
    en: 'Low'
  },
  good: {
    id: 'good',
    label: 'กำลังดี / แน่น',
    shortLabel: 'กำลังดี',
    emoji: '💪',
    en: 'Good'
  },
  insane: {
    id: 'insane',
    label: 'ปั๊มจัด / ตึงเปรี๊ยะ',
    shortLabel: 'ปั๊มจัด',
    emoji: '🔥',
    en: 'Insane'
  }
};

export const JOINT_CONFIG = {
  good: {
    id: 'good',
    label: 'ปกติ / ไร้อาการ',
    shortLabel: 'ปกติ',
    emoji: '🟢',
    en: 'Good'
  },
  mild_ache: {
    id: 'mild_ache',
    label: 'ตึง / เมื่อยเล็กน้อย',
    shortLabel: 'เมื่อยล้า',
    emoji: '🟡',
    en: 'Mild ache'
  },
  pain: {
    id: 'pain',
    label: 'เจ็บ / ปวดแปลบ',
    shortLabel: 'เจ็บแปลบ',
    emoji: '🔴',
    en: 'Pain'
  }
};

export const SRPE_LABELS = {
  1: 'เบามาก',
  2: 'เบา',
  3: 'ปานกลางค่อนข้างเบา',
  4: 'ปานกลาง',
  5: 'ค่อนข้างหนัก',
  6: 'หนักปานกลาง',
  7: 'หนักกำลังดี',
  8: 'หนักมาก',
  9: 'เกือบหมดแรง',
  10: 'หมดแรงเต็มที่'
};

export const SRPE_SCALE = {
  1: { rpe: 1, label: 'เบามาก', en: 'Very light', desc: 'แทบไม่รู้สึกเหนื่อย เหมือนพักผ่อน' },
  2: { rpe: 2, label: 'เบา', en: 'Light', desc: 'ออกแรงเบาๆ สบายมาก' },
  3: { rpe: 3, label: 'ปานกลางค่อนข้างเบา', en: 'Moderate light', desc: 'เริ่มหายใจเร็วขึ้นเล็กน้อย' },
  4: { rpe: 4, label: 'ปานกลาง', en: 'Moderate', desc: 'เหนื่อยพอประมาณ ยังพูดคุยได้สบาย' },
  5: { rpe: 5, label: 'ค่อนข้างหนัก', en: 'Somewhat hard', desc: 'เริ่มเหงื่อออก หายใจลึกขึ้น' },
  6: { rpe: 6, label: 'หนักปานกลาง', en: 'Hard', desc: 'เริ่มตึง ต้องโฟกัสในการยก' },
  7: { rpe: 7, label: 'หนักกำลังดี', en: 'Challenging / Good fatigue', desc: 'เหนื่อยและล้าในระดับที่พัฒนา กำลังดี' },
  8: { rpe: 8, label: 'หนักมาก', en: 'Very hard', desc: 'เหนื่อยหอบ ต้องเค้นแรงในหลายๆ เซ็ต' },
  9: { rpe: 9, label: 'เกือบหมดแรง', en: 'Extremely hard', desc: 'ล้าจัด เหลือแรงอีกแค่ 1 ครั้งสุดท้าย' },
  10: { rpe: 10, label: 'หมดแรงเต็มที่', en: 'Maximum exertion', desc: 'เค้นจนหยดสุดท้าย ไม่สามารถยกต่อได้อีก' }
};

/**
 * Normalizes Session RPE between 1 and 10 (integer).
 * Fallback to 7 if invalid or missing.
 */
export function normalizeSrpe(rpe) {
  if (rpe === undefined || rpe === null || rpe === '') return DEFAULT_SESSION_RPE;
  const num = Math.round(Number(rpe));
  if (isNaN(num)) return DEFAULT_SESSION_RPE;
  if (num < 1) return 1;
  if (num > 10) return 10;
  return num;
}

/**
 * Validates pumpRating enum: 'low' | 'good' | 'insane'
 */
export function normalizePumpRating(val) {
  if (val && typeof val === 'string' && PUMP_RATINGS.includes(val.trim().toLowerCase())) {
    return val.trim().toLowerCase();
  }
  return DEFAULT_PUMP_RATING;
}

/**
 * Validates jointComfort enum: 'good' | 'mild_ache' | 'pain'
 */
export function normalizeJointComfort(val) {
  if (val && typeof val === 'string' && JOINT_COMFORTS.includes(val.trim().toLowerCase())) {
    return val.trim().toLowerCase();
  }
  return DEFAULT_JOINT_COMFORT;
}

/**
 * Computes Session Load in Arbitrary Units (AU):
 * sessionLoadAu = Math.round((durationSec / 60) * sessionRpe)
 * @param {number} durationSec - Total session duration in seconds
 * @param {number} rpe - Session RPE (1-10)
 * @returns {number} Session load (AU)
 */
export function computeSessionLoadAu(durationSec, rpe) {
  const sec = Number(durationSec) || 0;
  const validRpe = normalizeSrpe(rpe);
  return Math.round((sec / 60) * validRpe);
}

/**
 * Returns Thai description label for sRPE.
 */
export function getSrpeLabel(rpe) {
  const valid = normalizeSrpe(rpe);
  return SRPE_LABELS[valid] || SRPE_SCALE[valid]?.label || 'หนักกำลังดี';
}

/**
 * Returns Thai description label for muscle pump.
 */
export function getPumpRatingLabel(rating) {
  const valid = normalizePumpRating(rating);
  return PUMP_CONFIG[valid]?.label || 'กำลังดี / แน่น';
}

/**
 * Returns Thai description label for joint comfort.
 */
export function getJointComfortLabel(comfort) {
  const valid = normalizeJointComfort(comfort);
  return JOINT_CONFIG[valid]?.label || 'ปกติ / ไร้อาการ';
}

/**
 * Composable for managing session debrief state
 */
export function useSessionDebrief(initial = {}) {
  const sessionRpe = ref(normalizeSrpe(initial.sessionRpe));
  const pumpRating = ref(normalizePumpRating(initial.pumpRating));
  const jointComfort = ref(normalizeJointComfort(initial.jointComfort));
  const durationSec = ref(Number(initial.durationSec || 0));

  const sessionLoadAu = computed(() => computeSessionLoadAu(durationSec.value, sessionRpe.value));
  const srpeLabel = computed(() => getSrpeLabel(sessionRpe.value));

  function setRpe(val) {
    sessionRpe.value = normalizeSrpe(val);
  }

  function incrementRpe() {
    if (sessionRpe.value < 10) {
      sessionRpe.value += 1;
    }
  }

  function decrementRpe() {
    if (sessionRpe.value > 1) {
      sessionRpe.value -= 1;
    }
  }

  function setPump(val) {
    pumpRating.value = normalizePumpRating(val);
  }

  function setJoint(val) {
    jointComfort.value = normalizeJointComfort(val);
  }

  function toDebriefPayload() {
    return {
      sessionRpe: sessionRpe.value,
      sessionLoadAu: sessionLoadAu.value,
      pumpRating: pumpRating.value,
      jointComfort: jointComfort.value
    };
  }

  return {
    sessionRpe,
    pumpRating,
    jointComfort,
    durationSec,
    sessionLoadAu,
    srpeLabel,
    setRpe,
    incrementRpe,
    decrementRpe,
    setPump,
    setJoint,
    toDebriefPayload
  };
}
