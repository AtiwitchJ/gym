/**
 * 3-Day A/B Split Workout Program (จันทร์, พุธ, ศุกร์)
 *
 * Program A (อก + หลัง + ท้อง - 6 ท่า)
 * Program B (ขา + แขน + คอ บ่า ไหล่ - 7 ท่า)
 *
 * All exercises configured with:
 * - 4 sets per exercise (1 warmup 15 reps + 3 working sets 6-8 reps / 8-12 reps)
 * - 3 distinct YouTube gym machine alternative videos
 * - Canonical ID mappings for cross-day and cross-program record synchronization
 */

import { MACHINE_VIDEO_PRESETS } from './workouts.js';

// Extend or define additional machine video presets for arms, traps, and abs
export const AB_MACHINE_VIDEO_PRESETS = {
  ...MACHINE_VIDEO_PRESETS,
  shrug_traps: [
    {
      name: "เครื่องแบบที่ 1 (Dumbbell Shrug)",
      shortName: "ดัมเบลยักไหล่",
      equipment: "ดัมเบลหนักสองข้าง ยืนตัวตรงยักบ่าขึ้นตรง ๆ",
      videoUrl: "https://www.youtube.com/watch?v=wTSt22ay31w"
    },
    {
      name: "เครื่องแบบที่ 2 (Cable Shrug)",
      shortName: "เคเบิลคู่ยักบ่า",
      equipment: "รอกเคเบิลคู่ล่าง ดึงบาร์ตรงหรือเชือกยักสะพานคอ",
      videoUrl: "https://www.youtube.com/watch?v=k4_vB3_T07c"
    },
    {
      name: "เครื่องแบบที่ 3 (Smith Machine Shrug)",
      shortName: "Smith ยักไหล่",
      equipment: "เครื่อง Smith Machine ปรับระดับขาอ่อน ยักบ่าเต็มแรง",
      videoUrl: "https://www.youtube.com/watch?v=g6qbsS4Gg7c"
    }
  ],
  biceps_curl: [
    {
      name: "เครื่องแบบที่ 1 (Preacher / Machine Biceps Curl)",
      shortName: "เครื่องพินหนอนแขน",
      equipment: "เครื่องเล่นหน้าแขนแบบพินเบาะเอียง (Selectorized Biceps Curl)",
      videoUrl: "https://www.youtube.com/watch?v=TFUznuXdPVo"
    },
    {
      name: "เครื่องแบบที่ 2 (Incline Dumbbell Curl)",
      shortName: "ดัมเบลเบาะเอียง",
      equipment: "ม้านั่งปรับเอียง 45-60 องศา นอนหงายแขนโฟกัส Long Head",
      videoUrl: "https://www.youtube.com/watch?v=soxrZlIl35U"
    },
    {
      name: "เครื่องแบบที่ 3 (Cable Biceps Curl)",
      shortName: "เคเบิลล่างบาร์ตรง",
      equipment: "เคเบิลรอกล่างใส่ Straight Bar หรือ EZ-Bar ยืนพับแขน",
      videoUrl: "https://www.youtube.com/watch?v=AsAVb_e_Oqk"
    }
  ],
  triceps_pushdown: [
    {
      name: "เครื่องแบบที่ 1 (Cable Rope Triceps Pushdown)",
      shortName: "เคเบิลเชือกดันหลังแขน",
      equipment: "เคเบิลรอกบนใส่เชือก (Rope) ดันลงกางปลายแขนออก",
      videoUrl: "https://www.youtube.com/watch?v=oz0gmMXpMAc"
    },
    {
      name: "เครื่องแบบที่ 2 (Straight Bar Pushdown)",
      shortName: "เคเบิลบาร์ตรง",
      equipment: "เคเบิลรอกบนใส่บาร์ตรงหรือ V-Bar ล็อกศอกกดลงสุด",
      videoUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU"
    },
    {
      name: "เครื่องแบบที่ 3 (Assisted Dip Machine)",
      shortName: "เครื่องดิปช่วยพยุง",
      equipment: "เครื่องดิปมีเบาะรองเข่าหรือม้านั่งดิปตัวตรงเน้นหลังแขน",
      videoUrl: "https://www.youtube.com/watch?v=6oaLJs4dAwA"
    }
  ],
  abdominal: [
    {
      name: "เครื่องแบบที่ 1 (Abdominal Crunch Machine)",
      shortName: "เครื่องเล่นท้องพิน",
      equipment: "เครื่อง Ab Crunch นั่งพิงเบาะม้วนตัวลงล็อกขา",
      videoUrl: "https://www.youtube.com/watch?v=H1RkFIBeolk"
    },
    {
      name: "เครื่องแบบที่ 2 (Cable Kneeling Crunch)",
      shortName: "เคเบิลคุกเข่าม้วนท้อง",
      equipment: "รอกเคเบิลบนคุกเข่าจับเชือกแนบขมับ ม้วนสะโพกลง",
      videoUrl: "https://www.youtube.com/watch?v=2fO41gVvUuU"
    },
    {
      name: "เครื่องแบบที่ 3 (Captain's Chair / Hanging Leg Raise)",
      shortName: "บาร์โหนยกขา",
      equipment: "แท่นกัปตันแชร์หรือบาร์โหน พับเข่าม้วนก้นขึ้น",
      videoUrl: "https://www.youtube.com/watch?v=hdng3Nm1x_E"
    }
  ]
};

/**
 * Program A (อก + หลัง + ท้อง - 6 ท่า)
 */
export const PROGRAM_A = {
  id: 'program_a',
  title: 'Program A: อก + หลัง + ท้อง (Chest, Back & Abs)',
  subtitle: 'โปรแกรมสร้างกล้ามเนื้อช่วงบนและแกนกลางลำตัว (6 ท่า)',
  splitName: '3-Day A/B Split (วันจันทร์ / วันศุกร์)',
  exercises: [
    {
      id: 'a1_chest_press',
      canonicalId: 'chest_press',
      name: 'Chest Press Machine',
      category: 'อก (Chest)',
      isMain: true,
      altName: 'เครื่องดันอกท่านั่ง หรือ ดัมเบลราบ',
      mainMuscle: 'อกส่วนกลาง (Mid Chest)',
      subMuscle: 'ไหล่หน้า, หลังแขน (Triceps)',
      videoUrl: 'https://www.youtube.com/watch?v=sqOw2Y68ecY',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.chest_press,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' }
      ]
    },
    {
      id: 'a2_incline_chest',
      canonicalId: 'incline_chest',
      name: 'Incline Dumbbell / Smith Press',
      category: 'อก (Chest)',
      isMain: true,
      altName: 'ดันอกบนเบาะเอียง 30-45 องศา',
      mainMuscle: 'อกส่วนบน (Upper Chest)',
      subMuscle: 'ไหล่หน้า, หลังแขน',
      videoUrl: 'https://www.youtube.com/watch?v=0bnc96eUvG0',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.incline_chest,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' }
      ]
    },
    {
      id: 'a3_lat_pulldown',
      canonicalId: 'lat_pulldown',
      name: 'Lat Pulldown Machine',
      category: 'หลัง (Back)',
      isMain: true,
      altName: 'ดึงบาร์ลงข้างหน้า หรือ Assisted Chin-up',
      mainMuscle: 'หลังส่วนกว้าง/ปีก (Lats / V-Shape)',
      subMuscle: 'หน้าแขน (Biceps), สะบัก',
      videoUrl: 'https://www.youtube.com/watch?v=BwV6jzYKiNY',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.lat_pulldown,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' }
      ]
    },
    {
      id: 'a4_seated_row',
      canonicalId: 'row_back',
      name: 'Seated Row Machine',
      category: 'หลัง (Back)',
      isMain: true,
      altName: 'เครื่องดึงหลังพิงเบาะ หรือ Barbell Row',
      mainMuscle: 'หลังส่วนกลางเพิ่มความหนา (Mid Back & Rhomboids)',
      subMuscle: 'ปีก (Lats), ไหล่หลัง, หน้าแขน',
      videoUrl: 'https://www.youtube.com/watch?v=0U8VMBXPQco',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.row_back,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' }
      ]
    },
    {
      id: 'a5_pec_fly',
      canonicalId: 'chest_fly',
      name: 'Pec Fly Machine / Cable Fly',
      category: 'อก (Chest)',
      isMain: false,
      altName: 'เครื่องหนีบอก Matrix หรือ Cable Crossover',
      mainMuscle: 'อกด้านในและร่องอก (Inner Chest)',
      subMuscle: 'ไหล่ด้านหน้า',
      videoUrl: 'https://www.youtube.com/watch?v=rTATwLKP548',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.chest_fly,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' }
      ]
    },
    {
      id: 'a6_abdominal',
      canonicalId: 'abdominal_core',
      name: 'Abdominal Crunch Machine',
      category: 'ท้อง (Abs)',
      isMain: false,
      altName: 'เครื่องเล่นหน้าท้อง หรือ Cable Crunch / Plank',
      mainMuscle: 'หน้าท้องส่วนหน้าและแกนกลางลำตัว (Core & Abs)',
      subMuscle: 'หน้าท้องด้านข้าง (Obliques)',
      videoUrl: 'https://www.youtube.com/watch?v=H1RkFIBeolk',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.abdominal,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '10–15 ครั้ง' },
        { type: 'work', reps: '10–15 ครั้ง' },
        { type: 'work', reps: '10–15 ครั้ง' }
      ]
    }
  ]
};

/**
 * Program B (ขา + แขน + คอ บ่า ไหล่ - 7 ท่า)
 */
export const PROGRAM_B = {
  id: 'program_b',
  title: 'Program B: ขา + แขน + คอ บ่า ไหล่ (Legs, Arms, Shoulders & Traps)',
  subtitle: 'โปรแกรมสร้างกล้ามเนื้อช่วงล่าง แขน และหัวไหล่รอบทิศ (7 ท่า)',
  splitName: '3-Day A/B Split (วันพุธ / สัปดาห์สลับ)',
  exercises: [
    {
      id: 'b1_leg_press',
      canonicalId: 'seated_leg_press',
      name: 'Seated Leg Press Machine',
      category: 'ขา (Legs)',
      isMain: true,
      altName: 'เครื่องถีบขา หรือ Squat',
      mainMuscle: 'ต้นขาด้านหน้า (Quads) และก้น (Glutes)',
      subMuscle: 'ต้นขาด้านหลัง, น่อง',
      videoUrl: 'https://www.youtube.com/watch?v=kTM85YKV7ls',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.seated_leg_press,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' }
      ]
    },
    {
      id: 'b2_hip_thrust',
      canonicalId: 'hip_thrust',
      name: 'Smith Machine Hip Thrust',
      category: 'ขา (Legs)',
      isMain: true,
      altName: 'ยกสะโพกด้วย Smith Machine หรือ Glute Drive',
      mainMuscle: 'กล้ามเนื้อก้นมัดใหญ่ (Gluteus Maximus)',
      subMuscle: 'ต้นขาด้านหลัง (Hamstrings)',
      videoUrl: 'https://www.youtube.com/watch?v=q_JqQ6C48aE',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.hip_thrust,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' }
      ]
    },
    {
      id: 'b3_shoulder_press',
      canonicalId: 'shoulder_press',
      name: 'Shoulder Press Machine',
      category: 'คอ บ่า ไหล่ (Shoulders)',
      isMain: true,
      altName: 'เครื่องดันไหล่ หรือ ดัมเบลนั่งดัน',
      mainMuscle: 'หัวไหล่ด้านหน้าและด้านข้าง (Front & Side Delts)',
      subMuscle: 'หลังแขน (Triceps), บ่าส่วนบน',
      videoUrl: 'https://www.youtube.com/watch?v=aMB82ZgfdJ8',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.shoulder_press,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' },
        { type: 'work', reps: '6–8 ครั้ง' }
      ]
    },
    {
      id: 'b4_lateral_raise',
      canonicalId: 'lateral_raise',
      name: 'Dumbbell / Cable Lateral Raise',
      category: 'คอ บ่า ไหล่ (Shoulders)',
      isMain: false,
      altName: 'กางแขนยกด้านข้าง สร้างไหล่กว้าง 3D',
      mainMuscle: 'หัวไหล่ด้านข้าง (Side Delts)',
      subMuscle: 'บ่า (Upper Traps)',
      videoUrl: 'https://www.youtube.com/watch?v=puqaiVqacvQ',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.lateral_raise,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' }
      ]
    },
    {
      id: 'b5_shrug',
      canonicalId: 'shrug_traps',
      name: 'Dumbbell / Cable Shrug',
      category: 'คอ บ่า ไหล่ (Traps & Neck)',
      isMain: false,
      altName: 'ยักไหล่ถือดัมเบลหรือเคเบิลบ่า',
      mainMuscle: 'กล้ามเนื้อบ่าและสะพานคอ (Upper Trapezius)',
      subMuscle: 'แรงบีบมือและท่อนแขน (Forearms)',
      videoUrl: 'https://www.youtube.com/watch?v=wTSt22ay31w',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.shrug_traps,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' }
      ]
    },
    {
      id: 'b6_biceps_curl',
      canonicalId: 'biceps_curl',
      name: 'Dumbbell / Cable Biceps Curl',
      category: 'แขน (Arms - Biceps)',
      isMain: false,
      altName: 'พับแขนโฟกัสหน้าแขนลูกหนู',
      mainMuscle: 'แขนด้านหน้า (Biceps Brachii)',
      subMuscle: 'ท่อนแขน (Forearms)',
      videoUrl: 'https://www.youtube.com/watch?v=TFUznuXdPVo',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.biceps_curl,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' }
      ]
    },
    {
      id: 'b7_triceps_pushdown',
      canonicalId: 'triceps_pushdown',
      name: 'Cable Triceps Pushdown',
      category: 'แขน (Arms - Triceps)',
      isMain: false,
      altName: 'กดสายเคเบิลหรือเชือกโฟกัสหลังแขน',
      mainMuscle: 'แขนด้านหลัง (Triceps)',
      subMuscle: 'ท่อนแขนส่วนปลาย',
      videoUrl: 'https://www.youtube.com/watch?v=oz0gmMXpMAc',
      machineVideos: AB_MACHINE_VIDEO_PRESETS.triceps_pushdown,
      sets: [
        { type: 'warm', reps: '15 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' },
        { type: 'work', reps: '8–12 ครั้ง' }
      ]
    }
  ]
};

export const AB_SPLIT_CANONICAL_MAP = {
  // Program A
  a1_chest_press: 'chest_press',
  a2_incline_chest: 'incline_chest',
  a3_lat_pulldown: 'lat_pulldown',
  a4_seated_row: 'row_back',
  a5_pec_fly: 'chest_fly',
  a6_abdominal: 'abdominal_core',

  // Program B
  b1_leg_press: 'seated_leg_press',
  b2_hip_thrust: 'hip_thrust',
  b3_shoulder_press: 'shoulder_press',
  b4_lateral_raise: 'lateral_raise',
  b5_shrug: 'shrug_traps',
  b6_biceps_curl: 'biceps_curl',
  b7_triceps_pushdown: 'triceps_pushdown'
};
