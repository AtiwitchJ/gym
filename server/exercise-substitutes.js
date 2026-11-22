// Exercise Substitution & Equipment Alternative Engine (SPEC §4).
// Recommends substitutes sharing the same primary muscle group, calculates weight ratio & match score.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

// The Docker runner image ships only server/ and dist/ (see server/estimate.js),
// so a self-contained fallback is required when src/data is not present.
const FALLBACK_CATALOG = [
  { id: 'barbell_bench_press', name: 'Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
  { id: 'incline_dumbbell_press', name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { id: 'flat_dumbbell_bench_press', name: 'Flat Dumbbell Bench Press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { id: 'chest_press_machine', name: 'Chest Press Machine', muscleGroup: 'chest', equipment: 'machine' },
  { id: 'pec_fly_machine', name: 'Pec Fly Machine (Pec Deck)', muscleGroup: 'chest', equipment: 'machine' },
  { id: 'incline_smith_press', name: 'Incline Smith Machine Press', muscleGroup: 'chest', equipment: 'smith_machine' },
  { id: 'cable_crossover', name: 'Cable Crossover', muscleGroup: 'chest', equipment: 'cable' },
  { id: 'push_up', name: 'Push Up', muscleGroup: 'chest', equipment: 'bodyweight' },
  { id: 'barbell_overhead_press', name: 'Barbell Overhead Press', muscleGroup: 'delts', equipment: 'barbell' },
  { id: 'dumbbell_shoulder_press', name: 'Dumbbell Shoulder Press', muscleGroup: 'delts', equipment: 'dumbbell' },
  { id: 'lateral_raise', name: 'Dumbbell Lateral Raise', muscleGroup: 'delts', equipment: 'dumbbell' },
  { id: 'rear_delt_fly', name: 'Reverse Pec Deck Fly', muscleGroup: 'delts', equipment: 'machine' },
  { id: 'face_pull', name: 'Cable Face Pull', muscleGroup: 'delts', equipment: 'cable' },
  { id: 'barbell_back_squat', name: 'Barbell Back Squat', muscleGroup: 'quads', equipment: 'barbell' },
  { id: 'leg_press', name: 'Leg Press Machine', muscleGroup: 'quads', equipment: 'machine' },
  { id: 'dumbbell_lunge', name: 'Dumbbell Lunge', muscleGroup: 'quads', equipment: 'dumbbell' },
  { id: 'leg_extension', name: 'Leg Extension', muscleGroup: 'quads', equipment: 'machine' },
  { id: 'goblet_squat', name: 'Goblet Squat', muscleGroup: 'quads', equipment: 'dumbbell' },
  { id: 'barbell_deadlift', name: 'Barbell Deadlift', muscleGroup: 'hamstrings', equipment: 'barbell' },
  { id: 'romanian_deadlift', name: 'Barbell Romanian Deadlift', muscleGroup: 'hamstrings', equipment: 'barbell' },
  { id: 'lying_leg_curl', name: 'Lying Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine' },
  { id: 'seated_leg_curl', name: 'Seated Leg Curl', muscleGroup: 'hamstrings', equipment: 'machine' },
  { id: 'lat_pulldown', name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable' },
  { id: 'barbell_bent_over_row', name: 'Barbell Bent-Over Row', muscleGroup: 'back', equipment: 'barbell' },
  { id: 'seated_cable_row', name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable' },
  { id: 'single_arm_dumbbell_row', name: 'Single-Arm Dumbbell Row', muscleGroup: 'back', equipment: 'dumbbell' },
  { id: 'pull_up', name: 'Pull Up', muscleGroup: 'back', equipment: 'bodyweight' },
  { id: 'bicep_curl', name: 'Barbell Bicep Curl', muscleGroup: 'arms', equipment: 'barbell' },
  { id: 'dumbbell_curl', name: 'Dumbbell Bicep Curl', muscleGroup: 'arms', equipment: 'dumbbell' },
  { id: 'cable_curl', name: 'Cable Bicep Curl', muscleGroup: 'arms', equipment: 'cable' },
  { id: 'tricep_pushdown', name: 'Tricep Pushdown', muscleGroup: 'arms', equipment: 'cable' },
  { id: 'overhead_tricep_extension', name: 'Overhead Tricep Extension', muscleGroup: 'arms', equipment: 'dumbbell' },
  { id: 'close_grip_bench_press', name: 'Close-Grip Bench Press', muscleGroup: 'arms', equipment: 'barbell' },
  { id: 'crunch', name: 'Cable Crunch', muscleGroup: 'abs', equipment: 'cable' },
  { id: 'hanging_leg_raise', name: 'Hanging Leg Raise', muscleGroup: 'abs', equipment: 'bodyweight' }
];

let cachedExercises = null;

function getCatalog() {
  if (cachedExercises) return cachedExercises;
  try {
    const filePath = path.resolve(__dirname, '../src/data/defaultExercises.js');
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf8');
      const scriptContent = code
        .replace(/export\s+default\s+defaultExercises;?/g, '')
        .replace(/export\s+const\s+defaultExercises\s*=/g, 'const defaultExercises =') + '\n; defaultExercises;';
      cachedExercises = vm.runInNewContext(scriptContent);
      return cachedExercises;
    }
  } catch (err) {
    console.error('Error loading default exercises catalog, using embedded fallback:', err);
  }
  cachedExercises = FALLBACK_CATALOG;
  return cachedExercises;
}

function findExercise(exerciseId) {
  const catalog = getCatalog();
  const cleanId = String(exerciseId || '').trim();
  if (!cleanId) return null;

  // 1. Direct match by id
  const direct = catalog.find(e => e.id === cleanId);
  if (direct) return direct;

  // 2. Case-insensitive or normalized id
  const lower = cleanId.toLowerCase();
  const caseMatch = catalog.find(e => e.id.toLowerCase() === lower);
  if (caseMatch) return caseMatch;

  return null;
}

function getMuscleThaiName(m) {
  switch (m) {
    case 'chest': return 'อก';
    case 'back': return 'หลัง';
    case 'quads': return 'ต้นขาด้านหน้า';
    case 'hamstrings': return 'ต้นขาด้านหลังและสะโพก';
    case 'delts': return 'หัวไหล่';
    case 'arms': return 'แขน';
    case 'abs': return 'หน้าท้องและแกนกลาง';
    case 'cardio': return 'คาร์ดิโอ';
    default: return m || '';
  }
}

function computeWeightRatio(srcEq, tgtEq, muscleGroup) {
  const s = (srcEq || '').toLowerCase();
  const t = (tgtEq || '').toLowerCase();

  if (s === t) {
    return {
      ratio: 1.0,
      explanation: 'แนะนำใช้น้ำหนักเท่าเดิมหรือใกล้เคียงเดิม'
    };
  }

  if (s === 'barbell') {
    if (t === 'dumbbell') {
      return {
        ratio: 0.40,
        explanation: 'แนะนำใช้น้ำหนักประมาณ 40% ของบาร์เบลต่อข้าง'
      };
    }
    if (t === 'machine') {
      return {
        ratio: 0.95,
        explanation: 'แนะนำใช้น้ำหนักใกล้เคียงบาร์เบลเดิม'
      };
    }
    if (t === 'smith_machine') {
      return {
        ratio: 0.90,
        explanation: 'แนะนำใช้น้ำหนักประมาณ 90% ของบาร์เบลเดิม (วิถีบาร์มีรางพยุง)'
      };
    }
    if (t === 'cable') {
      return {
        ratio: 0.30,
        explanation: 'แนะนำใช้น้ำหนักเบาลงเพื่อเน้นฟอร์มการหุบแขน'
      };
    }
    if (t === 'bodyweight') {
      return {
        ratio: 1.0,
        explanation: 'ใช้น้ำหนักตัว หรือใช้น้ำหนักถ่วงเสริมตามความเหมาะสม'
      };
    }
  }

  if (s === 'dumbbell') {
    if (t === 'barbell') {
      return {
        ratio: 2.20,
        explanation: 'แนะนำใช้น้ำหนักประมาณ 2.2 เท่าของดัมเบลหนึ่งข้าง (รวมสองข้างและบาร์)'
      };
    }
    if (t === 'machine') {
      return {
        ratio: 2.10,
        explanation: 'แนะนำใช้น้ำหนักพินประมาณ 2 เท่าของดัมเบลหนึ่งข้าง'
      };
    }
    if (t === 'smith_machine') {
      return {
        ratio: 2.00,
        explanation: 'แนะนำใช้น้ำหนักประมาณ 2 เท่าของดัมเบลหนึ่งข้าง'
      };
    }
    if (t === 'cable') {
      return {
        ratio: 0.70,
        explanation: 'แนะนำใช้น้ำหนักเคเบิลประมาณ 70% ของดัมเบลหนึ่งข้าง'
      };
    }
    if (t === 'bodyweight') {
      return {
        ratio: 1.0,
        explanation: 'ใช้น้ำหนักตัว หรือใช้น้ำหนักถ่วงเสริม'
      };
    }
  }

  if (s === 'machine') {
    if (t === 'barbell') {
      return {
        ratio: 0.95,
        explanation: 'แนะนำใช้น้ำหนักประมาณ 90-95% ของน้ำหนักเครื่องเดิม'
      };
    }
    if (t === 'dumbbell') {
      return {
        ratio: 0.40,
        explanation: 'แนะนำใช้น้ำหนักดัมเบลประมาณ 40% ของน้ำหนักเครื่องต่อข้าง'
      };
    }
    if (t === 'smith_machine') {
      return {
        ratio: 0.95,
        explanation: 'แนะนำใช้น้ำหนักใกล้เคียงเครื่องเดิม'
      };
    }
    if (t === 'cable') {
      return {
        ratio: 0.40,
        explanation: 'แนะนำใช้น้ำหนักเคเบิลประมาณ 40% ของเครื่องเพื่อเน้นการโฟกัส'
      };
    }
    if (t === 'bodyweight') {
      return {
        ratio: 1.0,
        explanation: 'ใช้น้ำหนักตัว หรือถ่วงน้ำหนักเสริม'
      };
    }
  }

  if (s === 'cable') {
    if (t === 'barbell') {
      return {
        ratio: 2.50,
        explanation: 'แนะนำใช้น้ำหนักบาร์เบลประมาณ 2.5 เท่าของเคเบิล'
      };
    }
    if (t === 'dumbbell') {
      return {
        ratio: 1.20,
        explanation: 'แนะนำใช้น้ำหนักดัมเบลประมาณ 1.2 เท่าของเคเบิลหนึ่งข้าง'
      };
    }
    if (t === 'machine') {
      return {
        ratio: 2.00,
        explanation: 'แนะนำใช้น้ำหนักเครื่องประมาณ 2 เท่าของเคเบิล'
      };
    }
    if (t === 'smith_machine') {
      return {
        ratio: 2.20,
        explanation: 'แนะนำใช้น้ำหนักสมิธแมชชีนประมาณ 2.2 เท่าของเคเบิล'
      };
    }
    if (t === 'bodyweight') {
      return {
        ratio: 1.0,
        explanation: 'ใช้น้ำหนักตัว'
      };
    }
  }

  if (s === 'smith_machine') {
    if (t === 'barbell') {
      return {
        ratio: 1.05,
        explanation: 'แนะนำใช้น้ำหนักฟรีเวทใกล้เคียงหรือลดลงเล็กน้อยเพื่อฝึกกล้ามเนื้อพยุง'
      };
    }
    if (t === 'dumbbell') {
      return {
        ratio: 0.42,
        explanation: 'แนะนำใช้น้ำหนักดัมเบลประมาณ 40-45% ของน้ำหนักสมิธต่อข้าง'
      };
    }
    if (t === 'machine') {
      return {
        ratio: 1.00,
        explanation: 'แนะนำใช้น้ำหนักใกล้เคียงกัน'
      };
    }
    if (t === 'cable') {
      return {
        ratio: 0.35,
        explanation: 'แนะนำใช้น้ำหนักประมาณ 35% เพื่อคุมวิถีแรงตึง'
      };
    }
    if (t === 'bodyweight') {
      return {
        ratio: 1.0,
        explanation: 'ใช้น้ำหนักตัว'
      };
    }
  }

  return {
    ratio: 1.0,
    explanation: 'แนะนำเริ่มจากน้ำหนักปานกลางและปรับตามระดับ RIR'
  };
}

function computeMatchDetails(source, candidate) {
  const sEq = (source.equipment || '').toLowerCase();
  const cEq = (candidate.equipment || '').toLowerCase();
  const muscle = (source.muscleGroup || '').toLowerCase();
  const thaiMuscle = getMuscleThaiName(muscle);

  let score = 85;
  let reason = '';

  if (cEq === 'dumbbell') {
    score = (sEq === 'barbell') ? 95 : (sEq === 'dumbbell' ? 96 : 90);
    reason = `กล้ามเนื้อ${thaiMuscle}กลุ่มเดียวกัน ดัมเบลช่วยขยายระยะยืดและให้อิสระแก่ข้อต่อ`;
  } else if (cEq === 'machine') {
    score = (sEq === 'barbell') ? 92 : (sEq === 'machine' ? 96 : 88);
    reason = `กล้ามเนื้อ${thaiMuscle}ระนาบตรง วิถีเครื่องปลอดภัยสูง`;
  } else if (cEq === 'smith_machine') {
    score = (sEq === 'barbell') ? 90 : 87;
    reason = `วิถีบาร์ตรงมั่นคง ล็อคโฟกัสกล้ามเนื้อ${thaiMuscle}และปลอดภัยเมื่อเล่นหนัก`;
  } else if (cEq === 'cable') {
    score = (sEq === 'cable') ? 95 : 85;
    reason = `แรงตึงเคเบิลคงที่ เน้นการบีบโฟกัส`;
  } else if (cEq === 'barbell') {
    score = (sEq === 'barbell') ? 96 : 92;
    reason = `ท่าบาร์เบลสร้างความแข็งแรงหลักและเพิ่มมวลรวมของกล้ามเนื้อ${thaiMuscle}`;
  } else if (cEq === 'bodyweight') {
    score = 82;
    reason = `ใช้น้ำหนักตัว เสริมสร้างการประสานงานและการควบคุมแกนกลางลำตัว`;
  } else {
    score = 80;
    reason = `กลุ่มกล้ามเนื้อ${thaiMuscle}เดียวกัน ทดแทนกันได้ตามระดับอุปกรณ์ที่มี`;
  }

  if (source.id === 'barbell_bench_press') {
    if (candidate.id === 'incline_dumbbell_press') {
      score = 95;
      reason = 'กล้ามเนื้ออกกลุ่มเดียวกัน (อกบน-กลาง) ดัมเบลช่วยขยายระยะยืด';
    } else if (candidate.id === 'chest_press_machine') {
      score = 92;
      reason = 'กล้ามเนื้ออกระนาบตรง วิถีเครื่องปลอดภัยสูง';
    } else if (candidate.id === 'cable_crossover') {
      score = 85;
      reason = 'แรงตึงเคเบิลคงที่ เน้นการบีบโฟกัส';
    }
  }

  return { score, reason };
}

function getSubstitutes(repo, exerciseId, options = {}) {
  const source = findExercise(exerciseId);
  if (!source) {
    return {
      exerciseId: String(exerciseId || ''),
      name: '',
      muscleGroup: '',
      equipment: '',
      substitutes: []
    };
  }

  const catalog = getCatalog();
  const favorites = repo.getFavoriteSubstitutions(source.id);
  const favoriteIds = new Set(favorites.map(f => f.substitute_id));

  let candidates = catalog.filter(e => e.id !== source.id && e.muscleGroup === source.muscleGroup);

  if (options.equipment && typeof options.equipment === 'string') {
    const eqFilter = options.equipment.toLowerCase().trim();
    if (eqFilter && eqFilter !== 'all') {
      candidates = candidates.filter(e => (e.equipment || '').toLowerCase() === eqFilter);
    }
  }

  const substitutes = candidates.map(candidate => {
    const { ratio, explanation } = computeWeightRatio(source.equipment, candidate.equipment, source.muscleGroup);
    const { score, reason } = computeMatchDetails(source, candidate);
    const isUserFavorite = favoriteIds.has(candidate.id);

    return {
      id: candidate.id,
      name: candidate.name,
      muscleGroup: candidate.muscleGroup,
      equipment: candidate.equipment,
      isCustom: Boolean(candidate.isCustom),
      matchScore: score,
      matchReason: reason,
      weightRatio: ratio,
      ratioExplanation: explanation,
      isUserFavorite
    };
  });

  substitutes.sort((a, b) => {
    if (b.isUserFavorite !== a.isUserFavorite) {
      return b.isUserFavorite ? 1 : -1;
    }
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return a.name.localeCompare(b.name);
  });

  return {
    exerciseId: source.id,
    name: source.name,
    muscleGroup: source.muscleGroup,
    equipment: source.equipment,
    substitutes
  };
}

function validateSubstituteInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be a JSON object');
  }

  const { substituteId, priority, notes } = body;

  if (typeof substituteId !== 'string' || !substituteId.trim()) {
    throw new ValidationError('substituteId must be a non-empty string');
  }

  let cleanPriority = 1;
  if (priority !== undefined && priority !== null) {
    const p = Number(priority);
    if (!Number.isInteger(p) || p <= 0) {
      throw new ValidationError('priority must be a positive integer');
    }
    cleanPriority = p;
  }

  let cleanNotes = '';
  if (notes !== undefined && notes !== null) {
    if (typeof notes !== 'string') {
      throw new ValidationError('notes must be a string');
    }
    if (notes.length > 500) {
      throw new ValidationError('notes must not exceed 500 characters');
    }
    cleanNotes = notes.trim();
  }

  return {
    substituteId: substituteId.trim(),
    priority: cleanPriority,
    notes: cleanNotes
  };
}

module.exports = {
  ValidationError,
  getCatalog,
  findExercise,
  computeWeightRatio,
  computeMatchDetails,
  getSubstitutes,
  validateSubstituteInput
};
