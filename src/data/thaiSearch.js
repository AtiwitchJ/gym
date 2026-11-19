/**
 * Thai search terms for the exercise library (secondary-screens item 2).
 * The library stores English keys (muscleGroup, equipment) and English names; these tables add the
 * Thai words a user types, so "อก", "ดัมเบล", "ขา" or "สควอท" find the right exercises.
 * Pure functions: no Vue, no DOM.
 */

export const MUSCLE_TH = {
  chest: 'อก',
  back: 'หลัง',
  quads: 'ขา ขาหน้า ต้นขา',
  hamstrings: 'ขา ขาหลัง ต้นขา',
  delts: 'ไหล่ บ่า',
  arms: 'แขน',
  abs: 'ท้อง หน้าท้อง แกนกลาง',
  cardio: 'คาร์ดิโอ'
};

export const EQUIP_TH = {
  barbell: 'บาร์เบล',
  dumbbell: 'ดัมเบล',
  machine: 'เครื่อง เครื่องออกกำลังกาย',
  smith_machine: 'สมิท สมิทแมชชีน เครื่อง',
  cable: 'เคเบิล',
  bodyweight: 'น้ำหนักตัว'
};

export const NAME_TH = [
  [/squat/i, 'สควอท ย่อตัว'],
  [/leg press/i, 'เลกเพรส ถีบขา'],
  [/leg/i, 'ขา'],
  [/bench|chest press|press/i, 'กด ดัน อก'],
  [/row/i, 'ถีบ ดึง พาย หลัง'],
  [/pulldown|pull-up|chin/i, 'ดึงลง ดึงข้าง หลัง'],
  [/curl/i, 'งอ ดัดแขน แขน'],
  [/fly|flye/i, 'บิน กาง'],
  [/extension|pushdown/i, 'เหยียด แขนหลัง'],
  [/raise/i, 'ยก'],
  [/deadlift/i, 'ดึงพื้น'],
  [/shrug/i, 'ยักไหล่ บ่า'],
  [/shoulder|overhead/i, 'ไหล่'],
  [/crunch|plank|abs|ab /i, 'ท้อง แกนกลาง']
];

/** Thai words for one exercise (muscle, equipment, and the name's movement). */
export function thaiSearchText(exercise) {
  const parts = [MUSCLE_TH[exercise?.muscleGroup] || '', EQUIP_TH[exercise?.equipment] || ''];
  const name = String(exercise?.name || '');
  for (const [pattern, thai] of NAME_TH) {
    if (pattern.test(name)) parts.push(thai);
  }
  return parts.join(' ');
}

/** True when the query (English or Thai) matches the exercise. An empty query matches everything. */
export function matchesQuery(exercise, query) {
  const q = String(query || '').toLowerCase().trim();
  if (!q) return true;
  const haystack = [
    exercise?.name,
    exercise?.muscleGroup,
    exercise?.equipment,
    exercise?.notes,
    thaiSearchText(exercise)
  ].map((v) => String(v || '').toLowerCase()).join(' ');
  return haystack.includes(q);
}
