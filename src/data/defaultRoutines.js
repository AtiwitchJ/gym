/**
 * Pre-loaded default routines based on Atiwitch's 4-Day Hypertrophy Workout Plan (Jetts Fitness).
 * Expanded to 7 exercises per day matching the latest Jetts Fitness protocol.
 * Mapped to the routine schema:
 * {
 *   id: string,
 *   title: string,
 *   subtitle: string,
 *   exercises: Array<{
 *     exerciseId: string,
 *     sets: Array<{
 *       type: 'warmup' | 'working' | 'dropset' | 'failure',
 *       targetReps: number | string,
 *       targetWeight?: number
 *     }>
 *   }>
 * }
 */

const allDefaultRoutines = [
  {
    id: 'atiwitch_mon_legs',
    title: 'วันจันทร์: ขา + ก้น ครบทุกมิติ (Legs & Glutes)',
    subtitle: 'เน้นการสร้างฐานกล้ามเนื้อมวลรวมของร่างกาย (7 ท่า)',
    exercises: [
      {
        exerciseId: 'seated_leg_press',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 90 },
          { type: 'working', targetReps: 8, targetWeight: 90 },
          { type: 'working', targetReps: 8, targetWeight: 90 }
        ]
      },
      {
        exerciseId: 'smith_hip_thrust',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 40 },
          { type: 'working', targetReps: 8, targetWeight: 80 },
          { type: 'working', targetReps: 8, targetWeight: 80 },
          { type: 'working', targetReps: 8, targetWeight: 80 }
        ]
      },
      {
        exerciseId: 'leg_extension_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 25 },
          { type: 'working', targetReps: 8, targetWeight: 45 },
          { type: 'working', targetReps: 8, targetWeight: 45 },
          { type: 'working', targetReps: 8, targetWeight: 45 }
        ]
      },
      {
        exerciseId: 'seated_leg_curl',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 25 },
          { type: 'working', targetReps: 8, targetWeight: 45 },
          { type: 'working', targetReps: 8, targetWeight: 45 },
          { type: 'working', targetReps: 8, targetWeight: 45 }
        ]
      },
      {
        exerciseId: 'hip_abduction_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 }
        ]
      },
      {
        exerciseId: 'hip_adduction_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 }
        ]
      },
      {
        exerciseId: 'standing_calf_raise',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 12, targetWeight: 60 },
          { type: 'working', targetReps: 12, targetWeight: 60 },
          { type: 'working', targetReps: 12, targetWeight: 60 }
        ]
      }
    ]
  },
  {
    id: 'atiwitch_tue_chest',
    title: 'วันอังคาร: อกรวมทุกมุม + หลังแขน (Chest & Triceps)',
    subtitle: 'เน้นการระเบิดพลังมวลกล้ามเนื้อช่วงบนและการดัน (7 ท่า)',
    exercises: [
      {
        exerciseId: 'flat_dumbbell_bench_press',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 14 },
          { type: 'working', targetReps: 8, targetWeight: 24 },
          { type: 'working', targetReps: 8, targetWeight: 24 },
          { type: 'working', targetReps: 8, targetWeight: 24 }
        ]
      },
      {
        exerciseId: 'incline_dumbbell_press',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 14 },
          { type: 'working', targetReps: 8, targetWeight: 22 },
          { type: 'working', targetReps: 8, targetWeight: 22 },
          { type: 'working', targetReps: 8, targetWeight: 22 }
        ]
      },
      {
        exerciseId: 'pec_fly_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 25 },
          { type: 'working', targetReps: 8, targetWeight: 45 },
          { type: 'working', targetReps: 8, targetWeight: 45 },
          { type: 'working', targetReps: 8, targetWeight: 45 }
        ]
      },
      {
        exerciseId: 'cable_triceps_pushdown',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 15 },
          { type: 'working', targetReps: 8, targetWeight: 25 },
          { type: 'working', targetReps: 8, targetWeight: 25 },
          { type: 'working', targetReps: 8, targetWeight: 25 }
        ]
      },
      {
        exerciseId: 'cable_overhead_triceps_extension',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 12 },
          { type: 'working', targetReps: 8, targetWeight: 20 },
          { type: 'working', targetReps: 8, targetWeight: 20 },
          { type: 'working', targetReps: 8, targetWeight: 20 }
        ]
      },
      {
        exerciseId: 'cable_incline_fly',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 10 },
          { type: 'working', targetReps: 8, targetWeight: 16 },
          { type: 'working', targetReps: 8, targetWeight: 16 },
          { type: 'working', targetReps: 8, targetWeight: 16 }
        ]
      },
      {
        exerciseId: 'dips_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 }
        ]
      }
    ]
  },
  {
    id: 'atiwitch_wed_back',
    title: 'วันพุธ: หลัง + หน้าแขน (Back & Biceps)',
    subtitle: 'สร้างปีก V-Shape และความหนาของแผ่นหลัง (7 ท่า)',
    exercises: [
      {
        exerciseId: 'assisted_pull_up_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 35 },
          { type: 'working', targetReps: 8, targetWeight: 25 },
          { type: 'working', targetReps: 8, targetWeight: 25 },
          { type: 'working', targetReps: 8, targetWeight: 25 }
        ]
      },
      {
        exerciseId: 'lat_pulldown_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 }
        ]
      },
      {
        exerciseId: 'seated_cable_row',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 55 },
          { type: 'working', targetReps: 8, targetWeight: 55 },
          { type: 'working', targetReps: 8, targetWeight: 55 }
        ]
      },
      {
        exerciseId: 'dumbbell_biceps_curl',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 8 },
          { type: 'working', targetReps: 8, targetWeight: 14 },
          { type: 'working', targetReps: 8, targetWeight: 14 },
          { type: 'working', targetReps: 8, targetWeight: 14 }
        ]
      },
      {
        exerciseId: 'incline_dumbbell_curl',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 8 },
          { type: 'working', targetReps: 8, targetWeight: 12 },
          { type: 'working', targetReps: 8, targetWeight: 12 },
          { type: 'working', targetReps: 8, targetWeight: 12 }
        ]
      },
      {
        exerciseId: 'chest_supported_row',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 12 },
          { type: 'working', targetReps: 8, targetWeight: 20 },
          { type: 'working', targetReps: 8, targetWeight: 20 },
          { type: 'working', targetReps: 8, targetWeight: 20 }
        ]
      },
      {
        exerciseId: 'dumbbell_hammer_curl',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 10 },
          { type: 'working', targetReps: 8, targetWeight: 16 },
          { type: 'working', targetReps: 8, targetWeight: 16 },
          { type: 'working', targetReps: 8, targetWeight: 16 }
        ]
      }
    ]
  },
  {
    id: 'atiwitch_thu_shoulders',
    title: 'วันพฤหัสบดี: ไหล่ครบทุกมุม + หน้าท้อง (Shoulders & Abs)',
    subtitle: 'สร้างมิติไหล่ 3D รอบทิศทาง และแกนกลางลำตัว (7 ท่า)',
    exercises: [
      {
        exerciseId: 'seated_dumbbell_shoulder_press',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 12 },
          { type: 'working', targetReps: 8, targetWeight: 20 },
          { type: 'working', targetReps: 8, targetWeight: 20 },
          { type: 'working', targetReps: 8, targetWeight: 20 }
        ]
      },
      {
        exerciseId: 'dumbbell_lateral_raise',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 6 },
          { type: 'working', targetReps: 8, targetWeight: 10 },
          { type: 'working', targetReps: 8, targetWeight: 10 },
          { type: 'working', targetReps: 8, targetWeight: 10 }
        ]
      },
      {
        exerciseId: 'cable_lateral_raise',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 5 },
          { type: 'working', targetReps: 8, targetWeight: 8 },
          { type: 'working', targetReps: 8, targetWeight: 8 },
          { type: 'working', targetReps: 8, targetWeight: 8 }
        ]
      },
      {
        exerciseId: 'dumbbell_shrug',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 16 },
          { type: 'working', targetReps: 8, targetWeight: 26 },
          { type: 'working', targetReps: 8, targetWeight: 26 },
          { type: 'working', targetReps: 8, targetWeight: 26 }
        ]
      },
      {
        exerciseId: 'abdominal_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 20 },
          { type: 'working', targetReps: 8, targetWeight: 40 },
          { type: 'working', targetReps: 8, targetWeight: 40 },
          { type: 'working', targetReps: 8, targetWeight: 40 }
        ]
      },
      {
        exerciseId: 'face_pull',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 12 },
          { type: 'working', targetReps: 8, targetWeight: 20 },
          { type: 'working', targetReps: 8, targetWeight: 20 },
          { type: 'working', targetReps: 8, targetWeight: 20 }
        ]
      },
      {
        exerciseId: 'hanging_leg_raise',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 0 },
          { type: 'working', targetReps: 10, targetWeight: 0 },
          { type: 'working', targetReps: 10, targetWeight: 0 },
          { type: 'working', targetReps: 10, targetWeight: 0 }
        ]
      }
    ]
  },
  {
    id: 'atiwitch_ab_program_a',
    title: 'Program A: อก + หลัง + ท้อง (Chest, Back & Abs)',
    subtitle: '3-Day A/B Split • วันจันทร์/ศุกร์ (6 ท่า)',
    exercises: [
      {
        exerciseId: 'chest_press_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 60 },
          { type: 'working', targetReps: 8, targetWeight: 60 },
          { type: 'working', targetReps: 8, targetWeight: 60 }
        ]
      },
      {
        exerciseId: 'incline_dumbbell_press',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 14 },
          { type: 'working', targetReps: 8, targetWeight: 22 },
          { type: 'working', targetReps: 8, targetWeight: 22 },
          { type: 'working', targetReps: 8, targetWeight: 22 }
        ]
      },
      {
        exerciseId: 'lat_pulldown_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 35 },
          { type: 'working', targetReps: 8, targetWeight: 55 },
          { type: 'working', targetReps: 8, targetWeight: 55 },
          { type: 'working', targetReps: 8, targetWeight: 55 }
        ]
      },
      {
        exerciseId: 'seated_cable_row',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 }
        ]
      },
      {
        exerciseId: 'pec_fly_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 25 },
          { type: 'working', targetReps: 8, targetWeight: 45 },
          { type: 'working', targetReps: 8, targetWeight: 45 },
          { type: 'working', targetReps: 8, targetWeight: 45 }
        ]
      },
      {
        exerciseId: 'abdominal_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 20 },
          { type: 'working', targetReps: 12, targetWeight: 40 },
          { type: 'working', targetReps: 12, targetWeight: 40 },
          { type: 'working', targetReps: 12, targetWeight: 40 }
        ]
      }
    ]
  },
  {
    id: 'atiwitch_ab_program_b',
    title: 'Program B: ขา + แขน + ไหล่/บ่า (Legs, Arms, Shoulders & Traps)',
    subtitle: '3-Day A/B Split • วันพุธ/สลับสัปดาห์ (7 ท่า)',
    exercises: [
      {
        exerciseId: 'seated_leg_press',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 90 },
          { type: 'working', targetReps: 8, targetWeight: 90 },
          { type: 'working', targetReps: 8, targetWeight: 90 }
        ]
      },
      {
        exerciseId: 'smith_hip_thrust',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 40 },
          { type: 'working', targetReps: 8, targetWeight: 80 },
          { type: 'working', targetReps: 8, targetWeight: 80 },
          { type: 'working', targetReps: 8, targetWeight: 80 }
        ]
      },
      {
        exerciseId: 'shoulder_press_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 20 },
          { type: 'working', targetReps: 8, targetWeight: 40 },
          { type: 'working', targetReps: 8, targetWeight: 40 },
          { type: 'working', targetReps: 8, targetWeight: 40 }
        ]
      },
      {
        exerciseId: 'dumbbell_lateral_raise',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 4 },
          { type: 'working', targetReps: 8, targetWeight: 8 },
          { type: 'working', targetReps: 8, targetWeight: 8 },
          { type: 'working', targetReps: 8, targetWeight: 8 }
        ]
      },
      {
        exerciseId: 'dumbbell_shrug',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 14 },
          { type: 'working', targetReps: 8, targetWeight: 22 },
          { type: 'working', targetReps: 8, targetWeight: 22 },
          { type: 'working', targetReps: 8, targetWeight: 22 }
        ]
      },
      {
        exerciseId: 'dumbbell_biceps_curl',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 6 },
          { type: 'working', targetReps: 8, targetWeight: 12 },
          { type: 'working', targetReps: 8, targetWeight: 12 },
          { type: 'working', targetReps: 8, targetWeight: 12 }
        ]
      },
      {
        exerciseId: 'cable_triceps_pushdown',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 15 },
          { type: 'working', targetReps: 8, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 30 }
        ]
      }
    ]
  },
  {
    id: 'atiwitch_prog_a',
    title: 'Program A: อก + หลัง + ท้อง (Chest, Back & Abs)',
    subtitle: '3-Day A/B Alternating Split (6 ท่าเน้นกล้ามเนื้อมวลรวมช่วงบนและแกนกลางลำตัว)',
    exercises: [
      {
        exerciseId: 'flat_dumbbell_bench_press',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 14 },
          { type: 'working', targetReps: 8, targetWeight: 24 },
          { type: 'working', targetReps: 8, targetWeight: 24 },
          { type: 'working', targetReps: 8, targetWeight: 24 }
        ]
      },
      {
        exerciseId: 'lat_pulldown_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 10, targetWeight: 50 },
          { type: 'working', targetReps: 10, targetWeight: 50 },
          { type: 'working', targetReps: 10, targetWeight: 50 }
        ]
      },
      {
        exerciseId: 'incline_dumbbell_press',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 12 },
          { type: 'working', targetReps: 10, targetWeight: 20 },
          { type: 'working', targetReps: 10, targetWeight: 20 }
        ]
      },
      {
        exerciseId: 'seated_cable_row',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 10, targetWeight: 50 },
          { type: 'working', targetReps: 10, targetWeight: 50 }
        ]
      },
      {
        exerciseId: 'pec_fly_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 25 },
          { type: 'working', targetReps: 12, targetWeight: 45 },
          { type: 'working', targetReps: 12, targetWeight: 45 }
        ]
      },
      {
        exerciseId: 'hanging_leg_raise',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 0 },
          { type: 'working', targetReps: 15, targetWeight: 0 },
          { type: 'working', targetReps: 15, targetWeight: 0 }
        ]
      }
    ]
  },
  {
    id: 'atiwitch_prog_b',
    title: 'Program B: ขา + แขน + ไหล่/บ่า (Legs, Arms, Shoulders & Traps)',
    subtitle: '3-Day A/B Alternating Split (7 ท่าเน้นช่วงล่าง แขนทั้งสองมัด และหัวไหล่/บ่า 3D)',
    exercises: [
      {
        exerciseId: 'seated_leg_press',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 50 },
          { type: 'working', targetReps: 10, targetWeight: 90 },
          { type: 'working', targetReps: 10, targetWeight: 90 },
          { type: 'working', targetReps: 10, targetWeight: 90 }
        ]
      },
      {
        exerciseId: 'smith_hip_thrust',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 40 },
          { type: 'working', targetReps: 10, targetWeight: 80 },
          { type: 'working', targetReps: 10, targetWeight: 80 }
        ]
      },
      {
        exerciseId: 'leg_extension_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 25 },
          { type: 'working', targetReps: 12, targetWeight: 45 },
          { type: 'working', targetReps: 12, targetWeight: 45 }
        ]
      },
      {
        exerciseId: 'seated_dumbbell_shoulder_press',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 12 },
          { type: 'working', targetReps: 10, targetWeight: 20 },
          { type: 'working', targetReps: 10, targetWeight: 20 }
        ]
      },
      {
        exerciseId: 'dumbbell_shrug',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 16 },
          { type: 'working', targetReps: 12, targetWeight: 26 },
          { type: 'working', targetReps: 12, targetWeight: 26 }
        ]
      },
      {
        exerciseId: 'cable_triceps_pushdown',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 15 },
          { type: 'working', targetReps: 10, targetWeight: 25 },
          { type: 'working', targetReps: 10, targetWeight: 25 }
        ]
      },
      {
        exerciseId: 'dumbbell_hammer_curl',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 10 },
          { type: 'working', targetReps: 10, targetWeight: 16 },
          { type: 'working', targetReps: 10, targetWeight: 16 }
        ]
      }
    ]
  }
];

// Retired routines: the old 4-day split (Mon–Thu).
// Hidden from the Routines list and dropped from saved localStorage data.
// The A/B program templates (atiwitch_ab_program_a/b, atiwitch_prog_a/b) are kept.
export const RETIRED_ROUTINE_IDS = [
  'atiwitch_mon_legs',
  'atiwitch_tue_chest',
  'atiwitch_wed_back',
  'atiwitch_thu_shoulders'
];

export const defaultRoutines = allDefaultRoutines.filter(r => !RETIRED_ROUTINE_IDS.includes(r.id));
