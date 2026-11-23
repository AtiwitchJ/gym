// server/muscle-slug-map.js
// Maps the free-text Thai/English mainMuscle labels in muscle-map.js onto a
// small standard English slug set used by the 2D anatomical heatmap.
// Pure module: no DB, no clock, no side effects.

const MUSCLE_KEYS = [
  'chest',
  'lats',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'delts',
  'abs',
  'calves',
  'traps'
];

const MUSCLE_KEY_SET = new Set(MUSCLE_KEYS);

// Deterministic inference order matters: some labels contain more than one hint
// (e.g. "ต้นขาด้านหน้า (Quads), ก้น (Glutes)" must resolve to quads, the primary
// mover listed first). Check the most specific patterns before the generic ones.
const PATTERNS = [
  ['quads', /(quad|ต้นขาด้านหน้า|หน้าขา)/i],
  ['hamstrings', /(hamstring|ต้นขาด้านหลัง|หลังขา)/i],
  ['glutes', /(glute|ก้น|สะโพก)/i],
  ['calves', /(calf|calves|น่อง)/i],
  ['triceps', /(tricep|หลังแขน)/i],
  ['biceps', /(bicep|หน้าแขน|brachialis)/i],
  ['delts', /(delt|shoulder|ไหล่)/i],
  ['traps', /(trap|บ่า|สะพานคอ)/i],
  ['lats', /(lat|ปีก|rhomboid|mid back|lower back|erector|หลังส่วน)/i],
  ['abs', /(abdominal|\babs\b|core|ท้อง|แกนกลาง)/i],
  ['chest', /(chest| pector|อก)/i]
];

function muscleKeyFor(label) {
  if (typeof label !== 'string' || !label.trim()) return null;
  for (const [key, pattern] of PATTERNS) {
    if (pattern.test(label)) return key;
  }
  return null;
}

function normalizeToWhitelist(key) {
  return typeof key === 'string' && MUSCLE_KEY_SET.has(key.toLowerCase())
    ? key.toLowerCase()
    : null;
}

module.exports = {
  MUSCLE_KEYS,
  MUSCLE_KEY_SET,
  muscleKeyFor,
  normalizeToWhitelist
};
