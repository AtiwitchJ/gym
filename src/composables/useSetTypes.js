import { useWorkoutStore } from './useWorkoutStore.js';

export const SET_TYPES = {
  NORMAL: 'normal',
  WARMUP: 'warmup',
  DROP: 'drop',
  FAILURE: 'failure'
};

export const WARMUP_ALIASES = new Set(['warm', 'warmup', 'วอร์ม', 'w']);
export const DROP_ALIASES = new Set(['drop', 'dropset', 'ดรอป', 'ดรอปเซ็ต', 'd']);
export const FAILURE_ALIASES = new Set(['failure', 'fail', 'ล้มเหลว', 'amrap', 'f']);

export function normalizeSetType(rawType) {
  if (!rawType || typeof rawType !== 'string') return SET_TYPES.NORMAL;
  const t = rawType.trim().toLowerCase();
  if (WARMUP_ALIASES.has(t)) return SET_TYPES.WARMUP;
  if (DROP_ALIASES.has(t)) return SET_TYPES.DROP;
  if (FAILURE_ALIASES.has(t)) return SET_TYPES.FAILURE;
  return SET_TYPES.NORMAL;
}

export const SET_TYPE_CONFIG = {
  normal: {
    id: 'normal',
    badge: '1..N',
    name: 'เซ็ตปกติ',
    enName: 'Normal Working Set',
    styleLabel: 'ป้ายขาว ขอบดำ',
    desc: 'นับโวลุ่มทำงานและประเมิน Progressive Overload ตามปกติ',
    badgeClass: 'bg-surface-card text-ink border-2 border-plate shadow-[1.5px_1.5px_0px_#1e2220] font-mono font-extrabold'
  },
  warmup: {
    id: 'warmup',
    badge: 'W',
    name: 'เซ็ตวอร์มอัพ',
    enName: 'Warm-up Set',
    styleLabel: 'ป้ายฟ้า bg-sky-bg',
    desc: 'ปรับสภาพข้อต่อ ไม่นับเข้าโวลุ่ม ไม่รบกวนสถิติ PR',
    badgeClass: 'bg-sky-bg text-sky-text border-2 border-sky shadow-[1.5px_1.5px_0px_#0284c7] font-mono font-extrabold'
  },
  drop: {
    id: 'drop',
    badge: 'D',
    name: 'ดรอปเซ็ต',
    enName: 'Drop Set',
    styleLabel: 'ป้ายม่วง bg-purple-100',
    desc: 'ลดน้ำหนักยกต่อทันที ไม่ถูก Weight Advisor สั่งลดน้ำหนัก',
    badgeClass: 'bg-purple-100 text-purple-900 border-2 border-purple-600 shadow-[1.5px_1.5px_0px_#7c3aed] font-mono font-extrabold'
  },
  failure: {
    id: 'failure',
    badge: 'F',
    name: 'เซ็ตล้มเหลว',
    enName: 'Failure / AMRAP Set',
    styleLabel: 'ป้ายส้มไฟ bg-flame-bg',
    desc: 'เล่นจนกล้ามเนื้อหมดแรงจริง ตั้งค่า RIR เป็น 0 อัตโนมัติ',
    badgeClass: 'bg-flame-bg text-flame-text border-2 border-flame shadow-[1.5px_1.5px_0px_#e11d48] font-mono font-extrabold'
  }
};

export function cycleSetType(currentType) {
  const norm = normalizeSetType(currentType);
  const order = [SET_TYPES.NORMAL, SET_TYPES.WARMUP, SET_TYPES.DROP, SET_TYPES.FAILURE];
  const idx = order.indexOf(norm);
  return order[(idx + 1) % order.length];
}

export function getSetTypeBadge(type, setNumber = 1) {
  const norm = normalizeSetType(type);
  if (norm === SET_TYPES.WARMUP) return 'W';
  if (norm === SET_TYPES.DROP) return 'D';
  if (norm === SET_TYPES.FAILURE) return 'F';
  return String(setNumber);
}

export function getSetTypeClass(type) {
  const norm = normalizeSetType(type);
  return SET_TYPE_CONFIG[norm]?.badgeClass || SET_TYPE_CONFIG.normal.badgeClass;
}

export function getSetTypeLabel(type) {
  const norm = normalizeSetType(type);
  return SET_TYPE_CONFIG[norm]?.name || SET_TYPE_CONFIG.normal.name;
}

export function getSetTypeDesc(type) {
  const norm = normalizeSetType(type);
  return SET_TYPE_CONFIG[norm]?.desc || SET_TYPE_CONFIG.normal.desc;
}

export function isWorkingSet(type) {
  const norm = normalizeSetType(type);
  return norm === SET_TYPES.NORMAL || norm === SET_TYPES.DROP || norm === SET_TYPES.FAILURE;
}

export function isWarmupSet(type) {
  return normalizeSetType(type) === SET_TYPES.WARMUP;
}

export function isDropSet(type) {
  return normalizeSetType(type) === SET_TYPES.DROP;
}

export function isFailureSet(type) {
  return normalizeSetType(type) === SET_TYPES.FAILURE;
}

export function useSetTypes() {
  const store = useWorkoutStore();

  function getSetType(dayKey, exId, sIdx, defaultFallback = null) {
    const day = dayKey || store?.currentDay?.value;
    const exState = store?.userState?.[day]?.[exId] || {};
    const raw = exState[`type_${sIdx}`];
    if (raw) return normalizeSetType(raw);
    if (defaultFallback) return normalizeSetType(defaultFallback);
    return SET_TYPES.NORMAL;
  }

  function setSetType(dayKey, exId, sIdx, newType) {
    const day = dayKey || store?.currentDay?.value;
    if (!store?.userState) return normalizeSetType(newType);
    if (!store.userState[day]) store.userState[day] = {};
    if (!store.userState[day][exId]) store.userState[day][exId] = {};

    const normalized = normalizeSetType(newType);
    store.userState[day][exId][`type_${sIdx}`] = normalized;

    if (normalized === SET_TYPES.FAILURE && typeof store.updateRir === 'function') {
      store.updateRir(day, exId, sIdx, 0);
    }

    if (typeof store.persistLocal === 'function') {
      store.persistLocal();
    }

    return normalized;
  }

  function cycleSet(dayKey, exId, sIdx, currentFallback = null) {
    const cur = getSetType(dayKey, exId, sIdx, currentFallback);
    const next = cycleSetType(cur);
    return setSetType(dayKey, exId, sIdx, next);
  }

  return {
    SET_TYPES,
    SET_TYPE_CONFIG,
    normalizeSetType,
    cycleSetType,
    getSetTypeBadge,
    getSetTypeClass,
    getSetTypeLabel,
    getSetTypeDesc,
    isWorkingSet,
    isWarmupSet,
    isDropSet,
    isFailureSet,
    getSetType,
    setSetType,
    cycleSet
  };
}
