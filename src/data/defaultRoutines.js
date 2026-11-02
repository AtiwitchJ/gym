/**
 * Pre-loaded default routines based on Atiwitch's 4-Day Hypertrophy Workout Plan.
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

export const defaultRoutines = [
  {
    id: 'atiwitch_mon_legs',
    title: 'วันจันทร์: ขา + ก้น ครบทุกมิติ (Legs & Glutes)',
    subtitle: 'เน้นการสร้างฐานกล้ามเนื้อมวลรวมของร่างกาย',
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
      }
    ]
  },
  {
    id: 'atiwitch_tue_chest',
    title: 'วันอังคาร: อกรวมทุกมุม + หลังแขน (Chest & Triceps)',
    subtitle: 'เน้นการระเบิดพลังมวลกล้ามเนื้อช่วงบนและการดัน',
    exercises: [
      {
        exerciseId: 'chest_press_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 55 },
          { type: 'working', targetReps: 8, targetWeight: 55 },
          { type: 'working', targetReps: 8, targetWeight: 55 }
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
        exerciseId: 'chest_dips',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 0 },
          { type: 'working', targetReps: 8, targetWeight: 0 },
          { type: 'working', targetReps: 8, targetWeight: 0 },
          { type: 'working', targetReps: 8, targetWeight: 0 }
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
      }
    ]
  },
  {
    id: 'atiwitch_wed_back',
    title: 'วันพุธ: หลัง + หน้าแขน (Back & Biceps)',
    subtitle: 'สร้างปีก V-Shape และความหนาของแผ่นหลัง',
    exercises: [
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
        exerciseId: 'lat_pulldown_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 }
        ]
      },
      {
        exerciseId: 'barbell_bent_over_row',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 30 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 },
          { type: 'working', targetReps: 8, targetWeight: 50 }
        ]
      },
      {
        exerciseId: 'barbell_biceps_curl',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 15 },
          { type: 'working', targetReps: 8, targetWeight: 25 },
          { type: 'working', targetReps: 8, targetWeight: 25 },
          { type: 'working', targetReps: 8, targetWeight: 25 }
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
    subtitle: 'สร้างมิติไหล่ 3D รอบทิศทาง และแกนกลางลำตัว',
    exercises: [
      {
        exerciseId: 'shoulder_press_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 25 },
          { type: 'working', targetReps: 8, targetWeight: 45 },
          { type: 'working', targetReps: 8, targetWeight: 45 },
          { type: 'working', targetReps: 8, targetWeight: 45 }
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
        exerciseId: 'rear_delt_fly_machine',
        sets: [
          { type: 'warmup', targetReps: 15, targetWeight: 20 },
          { type: 'working', targetReps: 8, targetWeight: 35 },
          { type: 'working', targetReps: 8, targetWeight: 35 },
          { type: 'working', targetReps: 8, targetWeight: 35 }
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
      }
    ]
  }
];
