// Canonical Exercise Groups (shared across days between main lifts and bonus touch-ups)
export const EXERCISE_CANONICAL_MAP = {
  // Seated Leg Press Machine (Monday Main <-> Tue/Wed/Thu Bonus)
  m1: 'seated_leg_press',
  b_t_leg: 'seated_leg_press',
  b_w_leg: 'seated_leg_press',
  b_th_leg: 'seated_leg_press',

  // Chest Press Machine (Tuesday Main <-> Mon/Wed/Thu Bonus)
  t1: 'chest_press',
  b_m_chest: 'chest_press',
  b_w_chest: 'chest_press',
  b_th_chest: 'chest_press',

  // Lat Pulldown Machine (Wednesday Main <-> Mon/Tue/Thu Bonus)
  w2: 'lat_pulldown',
  b_m_back: 'lat_pulldown',
  b_t_back: 'lat_pulldown',
  b_th_back: 'lat_pulldown',

  // Shoulder Press Machine (Thursday Main <-> Mon/Tue/Wed Bonus)
  th1: 'shoulder_press',
  b_m_shoulder: 'shoulder_press',
  b_t_shoulder: 'shoulder_press',
  b_w_shoulder: 'shoulder_press'
};

export function getCanonicalExerciseId(exId) {
  return EXERCISE_CANONICAL_MAP[exId] || exId;
}

export function getLinkedExerciseIds(exId) {
  const canon = getCanonicalExerciseId(exId);
  const linked = [];
  for (const [id, cId] of Object.entries(EXERCISE_CANONICAL_MAP)) {
    if (cId === canon && !linked.includes(id)) {
      linked.push(id);
    }
  }
  if (!linked.includes(exId)) linked.push(exId);
  return linked;
}

export const workoutData = {
  mon: {
    title: "วันจันทร์: ขา + ก้น ครบทุกมิติ (Legs & Glutes)",
    subtitle: "เน้นการสร้างฐานกล้ามเนื้อมวลรวมของร่างกาย",
    exercises: [
      {
        id: "m1",
        name: "Seated Leg Press Machine",
        isMain: true,
        altName: "เครื่องถีบขา หรือ Squat",
        mainMuscle: "ต้นขาด้านหน้า (Quads), ก้น (Glutes)",
        subMuscle: "ต้นขาด้านหลัง, น่อง (วางเท้าสูงโดนก้นมากขึ้น)",
        videoUrl: "https://www.youtube.com/watch?v=kTM85YKV7ls",
        localVideo: "/videos/leg-press-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 1 (45° Leg Press)",
        sets: [
          { type: "warm", reps: "15 ครั้ง (40-50%)" },
          { type: "work", reps: "6–8 ครั้ง (ท้าทาย)" },
          { type: "work", reps: "6–8 ครั้ง (ท้าทาย)" },
          { type: "work", reps: "6–8 ครั้ง (ท้าทาย)" }
        ]
      },
      {
        id: "m2",
        name: "Smith Machine Hip Thrust",
        isMain: true,
        altName: "หรือ Bulgarian Split Squat",
        mainMuscle: "ก้นมัดใหญ่ (Gluteus Maximus เน้น ๆ)",
        subMuscle: "แกนกลางลำตัว และ ขาด้านหลังช่วยพยุง",
        videoUrl: "https://www.youtube.com/watch?v=s1gUMRjpgqM",
        sets: [
          { type: "warm", reps: "15 ครั้ง (40-50%)" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "m3",
        name: "Leg Extension Machine",
        isMain: false,
        altName: "เครื่องเตะขาหน้า",
        mainMuscle: "ต้นขาด้านหน้า 4 มัดล้วน (Quadriceps)",
        subMuscle: "กล้ามเนื้อพยุงรอบหัวเข่า",
        videoUrl: "https://www.youtube.com/watch?v=dpn7z7nYRcQ",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "m4",
        name: "Seated / Prone Leg Curl Machine",
        isMain: false,
        altName: "เครื่องพับขาหลัง หรือเลือกเล่น RDL แทน",
        mainMuscle: "ต้นขาด้านหลังล้วน (Hamstrings)",
        subMuscle: "น่องส่วนบน",
        videoUrl: "https://www.youtube.com/watch?v=WzS7KK4eI0g",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "m5",
        name: "Seated Hip Abduction Machine",
        isMain: false,
        altName: "เครื่องกางขาออก",
        mainMuscle: "ก้นด้านข้าง/สะโพก (Gluteus Medius & Minimus)",
        subMuscle: "กล้ามเนื้อพยุงเชิงกรานด้านข้าง",
        videoUrl: "https://www.youtube.com/watch?v=dfzTjPMGVYw",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง (กางสุดค้าง 1 วิ)" },
          { type: "work", reps: "8–10 ครั้ง (กางสุดค้าง 1 วิ)" },
          { type: "work", reps: "8–10 ครั้ง (กางสุดค้าง 1 วิ)" }
        ]
      },
      {
        id: "m6",
        name: "Seated Hip Adduction Machine",
        isMain: false,
        altName: "เครื่องหนีบขาเข้า",
        mainMuscle: "ต้นขาด้านใน (Adductor Longus / Magnus / Brevis)",
        subMuscle: "กล้ามเนื้อขาหนีบ และพยุงเข่าด้านใน",
        videoUrl: "https://www.youtube.com/watch?v=fpVHoidfg60",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง (หนีบสุดค้าง 1 วิ)" },
          { type: "work", reps: "8–10 ครั้ง (หนีบสุดค้าง 1 วิ)" },
          { type: "work", reps: "8–10 ครั้ง (หนีบสุดค้าง 1 วิ)" }
        ]
      },
      {
        id: "m7",
        name: "Standing Calf Raise Machine",
        isMain: false,
        altName: "เครื่องยืนเขย่งน่อง (หรือเขย่งบน Smith / Leg Press)",
        mainMuscle: "น่องมัดใหญ่ (Gastrocnemius)",
        subMuscle: "น่องมัดลึก (Soleus) และเอ็นร้อยหวาย",
        videoUrl: "https://www.youtube.com/watch?v=Lqpb-IiSFC4",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "12–15 ครั้ง (ยืดสุด-บีบสุดค้าง 1 วิ)" },
          { type: "work", reps: "12–15 ครั้ง (ยืดสุด-บีบสุดค้าง 1 วิ)" },
          { type: "work", reps: "12–15 ครั้ง (ยืดสุด-บีบสุดค้าง 1 วิ)" }
        ]
      }
    ],
    bonusExercises: [
      {
        id: "b_m_back",
        name: "Lat Pulldown Machine",
        part: "หลัง (Back)",
        altName: "ดึงปีกกว้างทรง V-Shape",
        tip: "วันหลังคือวันพุธ (พัก 48 ชม. ฟื้นตัวทันแน่นอน)",
        videoUrl: "https://www.youtube.com/watch?v=BwV6jzYKiNY",
        localVideo: "/videos/lat-pulldown-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 2 (Lat Pulldown)",
        sets: [
          { type: "warm", reps: "15 ครั้ง (วอร์มปีก)" },
          { type: "touchup", reps: "6–8 ครั้ง (RPE 7-8 เหลือแรง 2 ครั้ง)" }
        ]
      },
      {
        id: "b_m_shoulder",
        name: "Shoulder Press Machine",
        part: "ไหล่ (Shoulders)",
        altName: "ดันไหล่รวมมิติรอบด้าน",
        tip: "วันไหล่คือวันพฤหัสบดี (มีเวลาพักยาว)",
        videoUrl: "https://www.youtube.com/watch?v=aMB82ZgfdJ8",
        sets: [
          { type: "warm", reps: "15 ครั้ง (วอร์มข้อต่อ)" },
          { type: "touchup", reps: "6–8 ครั้ง (RPE 7-8)" }
        ]
      },
      {
        id: "b_m_chest",
        name: "Flat Dumbbell Press / Chest Press",
        part: "อก (Chest)",
        altName: "ดัมเบลนอนดันอก หรือเครื่องผลักอก",
        tip: "พรุ่งนี้ (อังคาร) เป็นวันอกเต็มระบบ เล่นเบา ๆ แค่โฟกัสฟอร์ม",
        videoUrl: "https://www.youtube.com/watch?v=Y_7aHqXeCfQ",
        localVideo: "/videos/chest-press-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 3 (Chest Press)",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "touchup", reps: "6–8 ครั้ง (น้ำหนักปานกลาง)" }
        ]
      }
    ]
  },
  tue: {
    title: "วันอังคาร: อกรวมทุกมุม + หลังแขน (Chest & Triceps)",
    subtitle: "เน้นการระเบิดพลังมวลกล้ามเนื้อช่วงบนและการดัน",
    exercises: [
      {
        id: "t1",
        name: "Flat Dumbbell Bench Press",
        isMain: true,
        altName: "ดัมเบลนอนดันอกบนม้านั่งราบ (ใส่น้ำหนักต่อข้าง) หรือเครื่อง Chest Press",
        mainMuscle: "อกส่วนกลาง (Mid Chest)",
        subMuscle: "ไหล่หน้า (Front Delts), หลังแขน (Triceps)",
        videoUrl: "https://www.youtube.com/watch?v=Y_7aHqXeCfQ",
        localVideo: "/videos/chest-press-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 3 (Chest Press)",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "t2",
        name: "Incline Dumbbell / Smith Press",
        isMain: true,
        altName: "ดันอกเบาะเอียง 30–45 องศา",
        mainMuscle: "อกส่วนบน (Upper Chest / แนวไหปลาร้า)",
        subMuscle: "ไหล่หน้า, หลังแขน",
        videoUrl: "https://www.youtube.com/watch?v=0bnc96eUvG0",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "t3",
        name: "Pec Fly Machine",
        isMain: false,
        altName: "เครื่องหนีบอก Matrix หรือ Cable Fly",
        mainMuscle: "อกด้านใน/ร่องอก และขยายฐานอก (Inner & Mid Chest)",
        subMuscle: "ไหล่ด้านหน้า",
        videoUrl: "https://www.youtube.com/watch?v=rTATwLKP548",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "t4",
        name: "Assisted Dip Machine",
        isMain: false,
        altName: "เครื่องดิปมีแท่นรับเข่า หรือ วิดพื้น",
        mainMuscle: "อกส่วนล่าง (Lower Chest)",
        subMuscle: "หลังแขน (Triceps), ไหล่ด้านหน้า",
        videoUrl: "https://www.youtube.com/watch?v=6oaLJs4dAwA",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "t5",
        name: "Cable Triceps Pushdown",
        isMain: false,
        altName: "กดเชือกหรือบาร์ที่เสาเคเบิล",
        mainMuscle: "แขนด้านหลังทั้ง 3 หัว (Triceps เน้น ๆ)",
        subMuscle: "ท่อนแขนส่วนปลาย (Forearms)",
        videoUrl: "https://www.youtube.com/watch?v=oz0gmMXpMAc",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "t6",
        name: "Overhead Cable Triceps Extension",
        isMain: false,
        altName: "ดึงเชือกหลังแขนเหนือศีรษะ",
        mainMuscle: "หลังแขนหัวยาว (Triceps Long Head)",
        subMuscle: "ข้อศอกและเอ็นยึดแขนด้านหลัง",
        videoUrl: "https://www.youtube.com/watch?v=1u18yJcLDA0",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง (ยืดสุด-บีบสุด)" },
          { type: "work", reps: "8–10 ครั้ง (ยืดสุด-บีบสุด)" },
          { type: "work", reps: "8–10 ครั้ง (ยืดสุด-บีบสุด)" }
        ]
      },
      {
        id: "t7",
        name: "Cable Crossover / Low-to-High Fly",
        isMain: false,
        altName: "เคเบิลตัดขอบอกล่าง หรือ บีบร่องอก",
        mainMuscle: "อกส่วนล่างและร่องอก (Lower & Inner Chest)",
        subMuscle: "ไหล่ด้านหน้า",
        videoUrl: "https://www.youtube.com/watch?v=taI4XduLpTk",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง (บีบค้าง 1 วิ)" },
          { type: "work", reps: "8–10 ครั้ง (บีบค้าง 1 วิ)" },
          { type: "work", reps: "8–10 ครั้ง (บีบค้าง 1 วิ)" }
        ]
      }
    ],
    bonusExercises: [
      {
        id: "b_t_leg",
        name: "Seated Leg Press Machine",
        part: "ขา/ก้น (Legs)",
        altName: "ถีบขากระตุ้นต้นขาหน้าและก้น",
        tip: "ปั๊มเลือดคลายความตึงจากวันจันทร์ได้ดีมาก",
        videoUrl: "https://www.youtube.com/watch?v=kTM85YKV7ls",
        localVideo: "/videos/leg-press-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 1 (45° Leg Press)",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "touchup", reps: "6–8 ครั้ง (RPE 7-8)" }
        ]
      },
      {
        id: "b_t_shoulder",
        name: "Shoulder Press Machine",
        part: "ไหล่ (Shoulders)",
        altName: "ดันไหล่เหนือศีรษะ",
        tip: "แตะเบา ๆ เพราะไหล่หน้าเพิ่งช่วยดันอกมาหมาด ๆ",
        videoUrl: "https://www.youtube.com/watch?v=aMB82ZgfdJ8",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "touchup", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "b_t_back",
        name: "Lat Pulldown หรือ Seated Row",
        part: "หลัง (Back)",
        altName: "เครื่องดึงปีกหรือดึงหลัง",
        tip: "พรุ่งนี้ (พุธ) เป็นวันหลังเต็มระบบ เล่นเบา ๆ แค่ยืดเส้น",
        videoUrl: "https://www.youtube.com/watch?v=BwV6jzYKiNY",
        localVideo: "/videos/lat-pulldown-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 2 (Lat Pulldown)",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "touchup", reps: "6–8 ครั้ง (น้ำหนักเบา)" }
        ]
      }
    ]
  },
  wed: {
    title: "วันพุธ: หลัง + หน้าแขน (Back & Biceps)",
    subtitle: "สร้างปีก V-Shape และความหนาของแผ่นหลัง",
    exercises: [
      {
        id: "w1",
        name: "Seated Row Machine",
        isMain: true,
        altName: "เครื่องดึงหลังพิงเบาะ หรือ Barbell Row",
        mainMuscle: "หลังส่วนกลางเพิ่มความหนา (Mid Back / Rhomboids)",
        subMuscle: "ปีก (Lats), ไหล่หลัง, หน้าแขน (Biceps)",
        videoUrl: "https://www.youtube.com/watch?v=0U8VMBXPQco",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "w2",
        name: "Lat Pulldown Machine",
        isMain: true,
        altName: "ดึงบาร์ลงข้างหน้า หรือ Assisted Chin-up",
        mainMuscle: "หลังส่วนกว้าง/ปีก (Latissimus Dorsi - V-Shape)",
        subMuscle: "หน้าแขน (Biceps), สะบักและหลังบน",
        videoUrl: "https://www.youtube.com/watch?v=BwV6jzYKiNY",
        localVideo: "/videos/lat-pulldown-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 2 (Lat Pulldown)",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "w3",
        name: "Seated Cable Row",
        isMain: false,
        altName: "เคเบิลดึงหลังท่านั่งจับแคบ (V-Bar)",
        mainMuscle: "หลังส่วนกลางและปีกส่วนล่าง (Mid Back & Lower Lats)",
        subMuscle: "หน้าแขน, หลังล่างช่วยพยุงตัว",
        videoUrl: "https://www.youtube.com/watch?v=5Y32un_XBts",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "w4",
        name: "Dumbbell / Cable Biceps Curl",
        isMain: false,
        altName: "พับแขนหงายมือ โฟกัสลูกหนู",
        mainMuscle: "แขนด้านหน้ามัดหลัก (Biceps Brachii)",
        subMuscle: "ท่อนแขน (Forearms)",
        videoUrl: "https://www.youtube.com/watch?v=TFUznuXdPVo",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "w5",
        name: "Hammer Curl",
        isMain: false,
        altName: "พับแขนจับดัมเบลแนวตั้ง หรือเชือกเคเบิล",
        mainMuscle: "กล้ามเนื้อแขนมัดลึกดันแขนหนา (Brachialis) + ท่อนแขน",
        subMuscle: "หน้าแขน (Biceps)",
        videoUrl: "https://www.youtube.com/watch?v=YQAo_78-ruc",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "w6",
        name: "Straight Arm Lat Pulldown",
        isMain: false,
        altName: "เคเบิลกดแขนตรง หรือ Cable Pullover",
        mainMuscle: "หลังส่วนกว้าง/ปีกโดดเดี่ยว (Lats Isolation)",
        subMuscle: "หลังแขนหัวยาว, กล้ามเนื้อสะบัก",
        videoUrl: "https://www.youtube.com/watch?v=GxD_YyS7jLg",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง (กดสุดค้าง 1 วิ)" },
          { type: "work", reps: "8–10 ครั้ง (กดสุดค้าง 1 วิ)" },
          { type: "work", reps: "8–10 ครั้ง (กดสุดค้าง 1 วิ)" }
        ]
      },
      {
        id: "w7",
        name: "Hyperextension / Back Extension Bench",
        isMain: false,
        altName: "ม้านั่งพับหลังล่าง หรือ หลังเครื่อง Machine",
        mainMuscle: "หลังส่วนล่าง (Erector Spinae)",
        subMuscle: "ก้น (Glutes) และต้นขาด้านหลัง",
        videoUrl: "https://www.youtube.com/watch?v=ph3pddpKzzw",
        sets: [
          { type: "warm", reps: "15 ครั้ง (ตัวเปล่า)" },
          { type: "work", reps: "10–12 ครั้ง (ขึ้นตรงไม่แอ่นเกิน)" },
          { type: "work", reps: "10–12 ครั้ง (ขึ้นตรงไม่แอ่นเกิน)" },
          { type: "work", reps: "10–12 ครั้ง (ขึ้นตรงไม่แอ่นเกิน)" }
        ]
      }
    ],
    bonusExercises: [
      {
        id: "b_w_chest",
        name: "Flat Dumbbell Press / Chest Press",
        part: "อก (Chest)",
        altName: "ดัมเบลนอนดันอก หรือเครื่องผลักอก",
        tip: "ปั๊มเลือดเข้าอก (Feeder Set) ที่เพิ่งเล่นเมื่อวาน ช่วยฟื้นตัวเร็ว",
        videoUrl: "https://www.youtube.com/watch?v=Y_7aHqXeCfQ",
        localVideo: "/videos/chest-press-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 3 (Chest Press)",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "touchup", reps: "6–8 ครั้ง (RPE 7-8)" }
        ]
      },
      {
        id: "b_w_leg",
        name: "Seated Leg Press Machine",
        part: "ขา/ก้น (Legs)",
        altName: "ถีบขาเพิ่มมวลรวม",
        tip: "กระตุ้นขามวลรวมได้ดี",
        videoUrl: "https://www.youtube.com/watch?v=kTM85YKV7ls",
        localVideo: "/videos/leg-press-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 1 (45° Leg Press)",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "touchup", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "b_w_shoulder",
        name: "Shoulder Press Machine",
        part: "ไหล่ (Shoulders)",
        altName: "ดันไหล่",
        tip: "พรุ่งนี้ (พฤหัส) เป็นวันไหล่เต็มระบบ เล่นเบา ๆ แค่วอร์มข้อต่อ",
        videoUrl: "https://www.youtube.com/watch?v=aMB82ZgfdJ8",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "touchup", reps: "6–8 ครั้ง (น้ำหนักเบา)" }
        ]
      }
    ]
  },
  thu: {
    title: "วันพฤหัสบดี: ไหล่ครบทุกมุม + หน้าท้อง (Shoulders & Abs)",
    subtitle: "สร้างมิติไหล่ 3D รอบทิศทาง และแกนกลางลำตัว",
    exercises: [
      {
        id: "th1",
        name: "Shoulder Press Machine",
        isMain: true,
        altName: "เครื่องดันไหล่ หรือ ดัมเบล",
        mainMuscle: "หัวไหล่ด้านหน้าและด้านข้าง (Front & Side Delts)",
        subMuscle: "แขนด้านหลัง (Triceps), บ่าส่วนบน",
        videoUrl: "https://www.youtube.com/watch?v=aMB82ZgfdJ8",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "th2",
        name: "Dumbbell / Cable Lateral Raise",
        isMain: false,
        altName: "กางแขนยกด้านข้าง (สร้างมิติไหล่กว้าง 3D)",
        mainMuscle: "หัวไหล่ด้านข้าง (Side Delts)",
        subMuscle: "บ่า (Traps หากยกสูงเกินระดับไหล่)",
        videoUrl: "https://www.youtube.com/watch?v=puqaiVqacvQ",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง (หรือ 10–12)" },
          { type: "work", reps: "6–8 ครั้ง (หรือ 10–12)" },
          { type: "work", reps: "6–8 ครั้ง (หรือ 10–12)" }
        ]
      },
      {
        id: "th3",
        name: "Reverse Pec Fly Machine (Rear Delt Fly)",
        isMain: false,
        altName: "หันหน้าเข้าเครื่อง Pec Fly กวาดแขนไปด้านหลัง",
        mainMuscle: "หัวไหล่ด้านหลัง (Rear Delts) & สะบัก",
        subMuscle: "หลังส่วนบน (ช่วยแก้ปัญหาไหล่ห่อ)",
        videoUrl: "https://www.youtube.com/watch?v=woIoS0MbNYg",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "th4",
        name: "Dumbbell / Cable Shrug",
        isMain: false,
        altName: "ยักไหล่ถือดัมเบล หรือ บาร์เบล",
        mainMuscle: "กล้ามเนื้อบ่า/สะพานคอ (Upper Trapezius)",
        subMuscle: "กำลังมือและท่อนแขน (Grip & Forearms)",
        videoUrl: "https://www.youtube.com/watch?v=wTSt22ay31w",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "th5",
        name: "Abdominal Machine / Plank",
        isMain: false,
        altName: "เครื่องเล่นท้อง หรือ ทำ Plank",
        mainMuscle: "หน้าท้องส่วนหน้า (Six Pack) & แกนกลางลำตัว (Core)",
        subMuscle: "หน้าท้องด้านข้าง (Obliques)",
        videoUrl: "https://www.youtube.com/watch?v=H1RkFIBeolk",
        sets: [
          { type: "warm", reps: "15 ครั้ง (หรือ 30s)" },
          { type: "work", reps: "10–12 ครั้ง (หรือ 45-60s)" },
          { type: "work", reps: "10–12 ครั้ง (หรือ 45-60s)" },
          { type: "work", reps: "10–12 ครั้ง (หรือ 45-60s)" }
        ]
      },
      {
        id: "th6",
        name: "Cable Face Pull",
        isMain: false,
        altName: "เคเบิลดึงเชือกเข้าหน้าผาก/หัวตา",
        mainMuscle: "หัวไหล่ด้านหลัง (Rear Delts) & บ่ากลาง-ล่าง",
        subMuscle: "กลุ่มกล้ามเนื้อหมุนหัวไหล่ (Rotator Cuff) เปิดไหล่กว้าง",
        videoUrl: "https://www.youtube.com/watch?v=rep-qVOkqgk",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "10–12 ครั้ง (ดึงศอกสูงค้าง 1 วิ)" },
          { type: "work", reps: "10–12 ครั้ง (ดึงศอกสูงค้าง 1 วิ)" },
          { type: "work", reps: "10–12 ครั้ง (ดึงศอกสูงค้าง 1 วิ)" }
        ]
      },
      {
        id: "th7",
        name: "Hanging Knee / Leg Raise",
        isMain: false,
        altName: "โหนบาร์หรือเครื่อง Captain's Chair ยกเข่า",
        mainMuscle: "หน้าท้องส่วนล่าง (Lower Abs)",
        subMuscle: "แกนกลางลำตัว และกล้ามเนื้องอสะโพก (Hip Flexors)",
        videoUrl: "https://www.youtube.com/watch?v=hdng3Nm1x_E",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "10–12 ครั้ง (ม้วนก้นขึ้น)" },
          { type: "work", reps: "10–12 ครั้ง (ม้วนก้นขึ้น)" },
          { type: "work", reps: "10–12 ครั้ง (ม้วนก้นขึ้น)" }
        ]
      }
    ],
    bonusExercises: [
      {
        id: "b_th_chest",
        name: "Flat Dumbbell Press / Chest Press",
        part: "อก (Chest)",
        altName: "ดัมเบลนอนดันอก หรือเครื่องผลักอก",
        tip: "พรุ่งนี้วันพัก 3 วันติด เล่นน้ำหนักท้าทายได้เต็มที่",
        videoUrl: "https://www.youtube.com/watch?v=Y_7aHqXeCfQ",
        localVideo: "/videos/chest-press-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 3 (Chest Press)",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "touchup", reps: "6–8 ครั้ง (ท้าทาย)" }
        ]
      },
      {
        id: "b_th_back",
        name: "Lat Pulldown Machine",
        part: "หลัง (Back)",
        altName: "ดึงปีก V-Shape",
        tip: "กระตุ้นปีกก่อนเข้าช่วงวันพักผ่อน",
        videoUrl: "https://www.youtube.com/watch?v=BwV6jzYKiNY",
        localVideo: "/videos/lat-pulldown-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 2 (Lat Pulldown)",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "touchup", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "b_th_leg",
        name: "Seated Leg Press Machine",
        part: "ขา/ก้น (Legs)",
        altName: "ถีบขา",
        tip: "ปั๊มเลือดเข้ากล้ามเนื้อขาและก้นมวลรวม",
        videoUrl: "https://www.youtube.com/watch?v=kTM85YKV7ls",
        localVideo: "/videos/leg-press-machine.mp4",
        localVideoTitle: "คลิปในเครื่อง: Machine 1 (45° Leg Press)",
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "touchup", reps: "6–8 ครั้ง" }
        ]
      }
    ]
  }
};
