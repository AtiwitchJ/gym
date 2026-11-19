// Canonical Exercise Groups (shared across days between main lifts and bonus touch-ups)
export const EXERCISE_CANONICAL_MAP = {
  // Seated Leg Press Machine (Monday Main <-> Tue/Wed/Thu Bonus <-> Program B)
  m1: 'seated_leg_press',
  b1: 'seated_leg_press',
  b1_leg_press: 'seated_leg_press',
  b_t_leg: 'seated_leg_press',
  b_w_leg: 'seated_leg_press',
  b_th_leg: 'seated_leg_press',

  // Chest Press Machine / Flat DB (Tuesday Main <-> Mon/Wed/Thu Bonus <-> Program A)
  t1: 'chest_press',
  a1: 'chest_press',
  a1_chest_press: 'chest_press',
  b_m_chest: 'chest_press',
  b_w_chest: 'chest_press',
  b_th_chest: 'chest_press',

  // Lat Pulldown Machine (Wednesday Main <-> Mon/Tue/Thu Bonus <-> Program A)
  w2: 'lat_pulldown',
  a2: 'lat_pulldown',
  a3_lat_pulldown: 'lat_pulldown',
  b_m_back: 'lat_pulldown',
  b_t_back: 'lat_pulldown',
  b_th_back: 'lat_pulldown',

  // Shoulder Press Machine (Thursday Main <-> Mon/Tue/Wed Bonus <-> Program B)
  th1: 'shoulder_press',
  b4: 'shoulder_press',
  b3_shoulder_press: 'shoulder_press',
  b_m_shoulder: 'shoulder_press',
  b_t_shoulder: 'shoulder_press',
  b_w_shoulder: 'shoulder_press',

  // Incline Chest (Tuesday Main <-> Program A)
  t2: 'incline_chest',
  a3: 'incline_chest',
  a2_incline_chest: 'incline_chest',

  // Row Back (Wednesday Main <-> Program A)
  w1: 'row_back',
  w3: 'row_back',
  a4: 'row_back',
  a4_seated_row: 'row_back',

  // Chest Fly (Tuesday Main <-> Program A)
  t3: 'chest_fly',
  a5: 'chest_fly',
  a5_pec_fly: 'chest_fly',

  // Hanging Leg Raise / Abs (Thursday Main <-> Program A)
  th7: 'hanging_leg_raise',
  a6: 'hanging_leg_raise',
  a6_abdominal: 'hanging_leg_raise',

  // Hip Thrust (Monday Main <-> Program B)
  m2: 'hip_thrust',
  b2: 'hip_thrust',
  b2_hip_thrust: 'hip_thrust',

  // Leg Extension (Monday Main <-> Program B)
  m3: 'leg_extension',
  b3: 'leg_extension',

  // Shrug (Thursday Main <-> Program B)
  th4: 'shrug',
  b5: 'shrug',
  b5_shrug: 'shrug',

  // Cable Triceps Pushdown (Tuesday Main <-> Program B)
  t5: 'triceps_pushdown',
  b6: 'triceps_pushdown',
  b7_triceps_pushdown: 'triceps_pushdown',

  // Dumbbell Hammer Curl (Wednesday Main <-> Program B)
  w5: 'hammer_curl',
  b7: 'hammer_curl',
  b6_biceps_curl: 'hammer_curl'
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

export const EXERCISE_DAY_MAP = {
  m1: 'mon', b_m_back: 'mon', b_m_chest: 'mon', b_m_shoulder: 'mon',
  t1: 'tue', b_t_shoulder: 'tue', b_t_back: 'tue', b_t_leg: 'tue',
  w2: 'wed', b_w_shoulder: 'wed', b_w_chest: 'wed', b_w_leg: 'wed',
  th1: 'thu', b_th_back: 'thu', b_th_chest: 'thu', b_th_leg: 'thu',
  a1: 'mon', a2: 'mon', a3: 'mon', a4: 'mon', a5: 'mon', a6: 'mon',
  b1: 'wed', b2: 'wed', b3: 'wed', b4: 'wed', b5: 'wed', b6: 'wed', b7: 'wed'
};

export function getExerciseDay(exId) {
  return EXERCISE_DAY_MAP[exId] || null;
}

// 3 YouTube Video Alternatives for 3 Different Gym Machines / Equipment
// (เผื่อยิมที่เล่นไม่มีเครื่องแบบใดแบบหนึ่ง สามารถเลือกดูคลิปสอนเล่นเครื่องแบบอื่นที่ยิมมีได้)
export const MACHINE_VIDEO_PRESETS = {
  seated_leg_press: [
    {
      name: "เครื่องแบบที่ 1 (45° Plate-Loaded Leg Press)",
      shortName: "45° ใส่แผ่นเหล็ก",
      equipment: "เครื่องถีบขา 45 องศาแบบใส่แผ่นเหล็ก (Plate-loaded)",
      videoUrl: "https://www.youtube.com/watch?v=kTM85YKV7ls"
    },
    {
      name: "เครื่องแบบที่ 2 (Seated Cable Pin Leg Press)",
      shortName: "แนวนอนแบบพิน",
      equipment: "เครื่อง Leg Press นั่งถีบแนวนอนแบบพินปรับระดับ (Selectorized)",
      videoUrl: "https://www.youtube.com/watch?v=IZxyjW7MPJQ"
    },
    {
      name: "เครื่องแบบที่ 3 (Hack Squat / Smith Machine)",
      shortName: "Hack Squat / Smith",
      equipment: "เครื่อง Hack Squat หรือ Smith Machine Squat",
      videoUrl: "https://www.youtube.com/watch?v=0tn5K9NlCfo"
    }
  ],
  chest_press: [
    {
      name: "เครื่องแบบที่ 1 (Seated Pin Chest Press)",
      shortName: "เครื่องพินนั่งดันอก",
      equipment: "เครื่อง Seated Chest Press แบบพินปรับระดับ",
      videoUrl: "https://www.youtube.com/watch?v=sqOw2Y68ecY"
    },
    {
      name: "เครื่องแบบที่ 2 (Plate-Loaded Chest Press)",
      shortName: "เครื่องใส่แผ่นแยกแขน",
      equipment: "เครื่อง Iso-Lateral Chest Press แบบใส่แผ่นเหล็ก",
      videoUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8"
    },
    {
      name: "เครื่องแบบที่ 3 (Smith Machine / Flat Dumbbell)",
      shortName: "Smith / ดัมเบล",
      equipment: "เครื่อง Smith Machine หรือ ม้านั่งดัมเบลราบ",
      videoUrl: "https://www.youtube.com/watch?v=kZeqk_Nffy8"
    }
  ],
  lat_pulldown: [
    {
      name: "เครื่องแบบที่ 1 (Wide-Grip Cable Pulldown)",
      shortName: "เคเบิลดึงปีกกว้าง",
      equipment: "เครื่องเคเบิล Lat Pulldown มาตรฐานแบบพิน",
      videoUrl: "https://www.youtube.com/watch?v=BwV6jzYKiNY"
    },
    {
      name: "เครื่องแบบที่ 2 (Plate-Loaded High Row)",
      shortName: "เครื่องดึงปีกใส่แผ่น",
      equipment: "เครื่องดึงปีกใส่แผ่นเหล็ก Iso-Lateral High Row",
      videoUrl: "https://www.youtube.com/watch?v=bNji2b0y1rE"
    },
    {
      name: "เครื่องแบบที่ 3 (Assisted Pull-Up Machine)",
      shortName: "เครื่องช่วยดึงข้อ",
      equipment: "เครื่องช่วยดึงข้อ Assisted Chin-Up หรือ เคเบิลมือจับคู่",
      videoUrl: "https://www.youtube.com/watch?v=y3ha3652E10"
    }
  ],
  shoulder_press: [
    {
      name: "เครื่องแบบที่ 1 (Seated Pin Shoulder Press)",
      shortName: "เครื่องพินนั่งดันไหล่",
      equipment: "เครื่อง Seated Shoulder Press แบบพินปรับระดับ",
      videoUrl: "https://www.youtube.com/watch?v=aMB82ZgfdJ8"
    },
    {
      name: "เครื่องแบบที่ 2 (Plate-Loaded Shoulder Press)",
      shortName: "เครื่องใส่แผ่นแยกแขน",
      equipment: "เครื่องดันไหล่ใส่แผ่นเหล็ก Iso-Lateral",
      videoUrl: "https://www.youtube.com/watch?v=cTsz42zGgW4"
    },
    {
      name: "เครื่องแบบที่ 3 (Smith Machine / Seated DB Press)",
      shortName: "Smith / ดัมเบลนั่ง",
      equipment: "เครื่อง Smith Machine หรือ ดัมเบลนั่งดันไหล่",
      videoUrl: "https://www.youtube.com/watch?v=XhI2mZl4rY0"
    }
  ],
  row_back: [
    {
      name: "เครื่องแบบที่ 1 (Seated Cable Row)",
      shortName: "เคเบิลนั่งดึงพิน",
      equipment: "เครื่องเคเบิลนั่งดึงหน้าท้องแบบพินปรับระดับ",
      videoUrl: "https://www.youtube.com/watch?v=0U8VMBXPQco"
    },
    {
      name: "เครื่องแบบที่ 2 (Chest-Supported Machine Row)",
      shortName: "เครื่องมีเบาะพิงอก",
      equipment: "เครื่องดึงหลังแบบมีเบาะพิงหน้าอกใส่แผ่นเหล็ก",
      videoUrl: "https://www.youtube.com/watch?v=roCP6wCXPqo"
    },
    {
      name: "เครื่องแบบที่ 3 (One-Arm DB Row / T-Bar)",
      shortName: "ดัมเบล / T-Bar Row",
      equipment: "ดัมเบลดึงหลังข้างเดียว หรือ บาร์เบล T-Bar Row",
      videoUrl: "https://www.youtube.com/watch?v=pYcpY20QaE8"
    }
  ],
  incline_chest: [
    {
      name: "เครื่องแบบที่ 1 (Incline Chest Press Machine)",
      shortName: "เครื่องพินดันอกบน",
      equipment: "เครื่อง Incline Chest Machine แบบพินปรับระดับ",
      videoUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8"
    },
    {
      name: "เครื่องแบบที่ 2 (Incline Dumbbell Bench Press)",
      shortName: "ม้านั่งเอียงดัมเบล",
      equipment: "ม้านั่งปรับเอียง 30-45 องศา ดันดัมเบล",
      videoUrl: "https://www.youtube.com/watch?v=0bnc96eUvG0"
    },
    {
      name: "เครื่องแบบที่ 3 (Incline Smith Machine Press)",
      shortName: "Smith Machine เอียง",
      equipment: "เครื่อง Smith Machine ตั้งม้านั่งเอียงดันอกบน",
      videoUrl: "https://www.youtube.com/watch?v=M5VbY_U3a-c"
    }
  ],
  chest_fly: [
    {
      name: "เครื่องแบบที่ 1 (Pec Deck Fly Machine)",
      shortName: "เครื่อง Pec Deck",
      equipment: "เครื่องหนีบอก Pec Deck Machine เบาะนั่ง",
      videoUrl: "https://www.youtube.com/watch?v=rTATwLKP548"
    },
    {
      name: "เครื่องแบบที่ 2 (Cable Crossover Dual Pulley)",
      shortName: "เคเบิลรอกคู่ยืนบีบ",
      equipment: "เครื่องรอกคู่เคเบิลยืนบีบอก (Cable Crossover)",
      videoUrl: "https://www.youtube.com/watch?v=taI4XduLpTk"
    },
    {
      name: "เครื่องแบบที่ 3 (Dumbbell Chest Fly)",
      shortName: "ดัมเบลนอนกางแขน",
      equipment: "ม้านั่งราบกางดัมเบลบีบอก (Dumbbell Fly)",
      videoUrl: "https://www.youtube.com/watch?v=eozdVDA78K0"
    }
  ],
  hip_thrust: [
    {
      name: "เครื่องแบบที่ 1 (Glute Drive / Hip Thrust Machine)",
      shortName: "เครื่อง Glute Drive",
      equipment: "เครื่องยกสะโพก Glute Drive Machine เฉพาะทาง",
      videoUrl: "https://www.youtube.com/watch?v=q_JqQ6C48aE"
    },
    {
      name: "เครื่องแบบที่ 2 (Smith Machine Hip Thrust)",
      shortName: "Smith + ม้านั่ง",
      equipment: "เครื่อง Smith Machine วางม้านั่งรองแผ่นหลัง",
      videoUrl: "https://www.youtube.com/watch?v=s1gUMRjpgqM"
    },
    {
      name: "เครื่องแบบที่ 3 (Barbell / Dumbbell Hip Thrust)",
      shortName: "บาร์เบล / ดัมเบล",
      equipment: "บาร์เบลพร้อมเบาะฟองน้ำ หรือ ดัมเบลวางหน้าตัก",
      videoUrl: "https://www.youtube.com/watch?v=xDmFkJxPzeM"
    }
  ],
  leg_extension: [
    {
      name: "เครื่องแบบที่ 1 (Selectorized Leg Extension)",
      shortName: "เครื่องพินเตะขาหน้า",
      equipment: "เครื่องเตะขาหน้า Leg Extension แบบพินปรับระดับ",
      videoUrl: "https://www.youtube.com/watch?v=dpn7z7nYRcQ"
    },
    {
      name: "เครื่องแบบที่ 2 (Plate-Loaded Leg Extension)",
      shortName: "เครื่องใส่แผ่นเหล็ก",
      equipment: "เครื่องเตะขาหน้าแบบใส่แผ่นเหล็กแยกข้าง",
      videoUrl: "https://www.youtube.com/watch?v=YyvSfVjQeL0"
    },
    {
      name: "เครื่องแบบที่ 3 (Smith / Sissy Squat Bench)",
      shortName: "Sissy Squat / Smith",
      equipment: "แท่น Sissy Squat หรือ Smith Squat โดนหน้าขา",
      videoUrl: "https://www.youtube.com/watch?v=dG_4rW7sT74"
    }
  ],
  leg_curl: [
    {
      name: "เครื่องแบบที่ 1 (Seated Leg Curl Machine)",
      shortName: "นั่งพับขาแบบพิน",
      equipment: "เครื่องนั่งพับขาหลัง Seated Leg Curl แบบพินปรับระดับ",
      videoUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs"
    },
    {
      name: "เครื่องแบบที่ 2 (Lying Leg Curl Machine)",
      shortName: "นอนคว่ำพับขา",
      equipment: "เครื่องนอนคว่ำพับขาหลัง (Lying Leg Curl Machine)",
      videoUrl: "https://www.youtube.com/watch?v=ELOCsoDSmrg"
    },
    {
      name: "เครื่องแบบที่ 3 (Dumbbell Hamstring Curl)",
      shortName: "ดัมเบลหนีบข้อเท้า",
      equipment: "ดัมเบลหนีบข้อเท้านอนคว่ำ หรือ เคเบิลรัดข้อเท้า",
      videoUrl: "https://www.youtube.com/watch?v=k4_vB3_T07c"
    }
  ],
  lateral_raise: [
    {
      name: "เครื่องแบบที่ 1 (Lateral Raise Machine)",
      shortName: "เครื่องนั่งกางไหล่",
      equipment: "เครื่องนั่งกางแขนยกไหล่ข้างแบบพินปรับระดับ",
      videoUrl: "https://www.youtube.com/watch?v=7sE12WbKzZc"
    },
    {
      name: "เครื่องแบบที่ 2 (Cable Lateral Raise)",
      shortName: "รอกเคเบิลเดี่ยว",
      equipment: "เครื่องรอกเคเบิลเดี่ยวยืนดึงเฉียงข้าง",
      videoUrl: "https://www.youtube.com/watch?v=PPrzBWZDOhA"
    },
    {
      name: "เครื่องแบบที่ 3 (Dumbbell Lateral Raise)",
      shortName: "ดัมเบลกางแขน",
      equipment: "ดัมเบลกางแขนยกไหล่ข้าง ยืนหรือนั่ง",
      videoUrl: "https://www.youtube.com/watch?v=3VcKaXpzqRo"
    }
  ],
  calf_raise: [
    {
      name: "เครื่องแบบที่ 1 (Standing Calf Raise Machine)",
      shortName: "เครื่องยืนเขย่งน่อง",
      equipment: "เครื่องยืนเขย่งน่องแบบพินเบาะดันบ่า",
      videoUrl: "https://www.youtube.com/watch?v=Lqpb-IiSFC4"
    },
    {
      name: "เครื่องแบบที่ 2 (Seated Calf Raise Machine)",
      shortName: "เครื่องนั่งเขย่งน่อง",
      equipment: "เครื่องนั่งเขย่งน่องแบบใส่แผ่นเหล็ก",
      videoUrl: "https://www.youtube.com/watch?v=JbyjNymZOt0"
    },
    {
      name: "เครื่องแบบที่ 3 (Leg Press / Smith Calf Raise)",
      shortName: "Leg Press / Smith",
      equipment: "เขย่งปลายเท้าบนแป้น Leg Press หรือ Smith Machine",
      videoUrl: "https://www.youtube.com/watch?v=oX8y-6T3j30"
    }
  ],
  rear_delt_fly: [
    {
      name: "เครื่องแบบที่ 1 (Reverse Pec Fly Machine)",
      shortName: "เครื่อง Pec Fly ปรับหลัง",
      equipment: "หันหน้าเข้าเบาะเครื่อง Pec Deck ปรับแขนไปข้างหลังสุด",
      videoUrl: "https://www.youtube.com/watch?v=woIoS0MbNYg"
    },
    {
      name: "เครื่องแบบที่ 2 (Incline / Bent-Over Dumbbell Rear Delt)",
      shortName: "ดัมเบลคว่ำหน้าบนม้านั่ง",
      equipment: "ม้านั่งเอียง 30-45 องศา คว่ำหน้ากางดัมเบล หรือยืนก้มตัว (ไม่ต้องใช้เครื่อง)",
      videoUrl: "https://www.youtube.com/watch?v=sIQNCJ6Xwsk"
    },
    {
      name: "เครื่องแบบที่ 3 (Cross Cable Rear Delt Fly)",
      shortName: "รอกเคเบิลคู่ดึงไขว้",
      equipment: "เคเบิลคู่ปรับระดับเสมอหน้า ดึงกางแขนไขว้ไปข้างหลัง",
      videoUrl: "https://www.youtube.com/watch?v=cGXBVOc5xIk"
    }
  ],
  hanging_leg_raise: [
    {
      name: "เครื่องแบบที่ 1 (Captain's Chair / Power Tower)",
      shortName: "เก้าอี้กัปตันยกเข่า",
      equipment: "เครื่อง Captain's Chair มีเบาะรองศอก ยกเข่าหรือยกขาตรง",
      videoUrl: "https://www.youtube.com/watch?v=hdng3Nm1x_E"
    },
    {
      name: "เครื่องแบบที่ 2 (Hanging Bar / Pull-Up Bar)",
      shortName: "โหนบาร์ม้วนสะโพก",
      equipment: "โหนบาร์ดึงข้อ ยกเข่าม้วนสะโพกเข้าหาอก",
      videoUrl: "https://www.youtube.com/watch?v=hdng3Nm1x_E"
    },
    {
      name: "เครื่องแบบที่ 3 (Decline Ab Bench Crunch / Reverse Crunch)",
      shortName: "ม้านั่งเอียง / ท้องราบ",
      equipment: "ม้านั่งปรับเอียงนอนยกสะโพก หรือ Crunch บนเบาะ",
      videoUrl: "https://www.youtube.com/watch?v=H1RkFIBeolk"
    }
  ],
  shrug: [
    {
      name: "เครื่องแบบที่ 1 (Smith Machine Shrug)",
      shortName: "Smith Machine ยักไหล่",
      equipment: "เครื่อง Smith Machine ตั้งบาร์ระดับหน้าขา ยักไหล่บีบบ่า",
      videoUrl: "https://www.youtube.com/watch?v=wTSt22ay31w"
    },
    {
      name: "เครื่องแบบที่ 2 (Dumbbell Shrug)",
      shortName: "ดัมเบลยักไหล่สองข้าง",
      equipment: "ดัมเบลถือข้างลำตัว ยืนตรงยักไหล่ขึ้นตรง ๆ ไม่หมุนหัวไหล่",
      videoUrl: "https://www.youtube.com/watch?v=g6qbzXzT5c8"
    },
    {
      name: "เครื่องแบบที่ 3 (Trap Bar / Cable Dual Shrug)",
      shortName: "Trap Bar / เคเบิลคู่",
      equipment: "บาร์ Hex / Trap Bar หรือ ยืนตรงกลางเคเบิลคู่ปรับต่ำ",
      videoUrl: "https://www.youtube.com/watch?v=d_k8w6Y7lfc"
    }
  ],
  triceps_pushdown: [
    {
      name: "เครื่องแบบที่ 1 (Cable Rope Pushdown)",
      shortName: "เคเบิลเชือกกดหลังแขน",
      equipment: "เครื่องเคเบิลต่อหัวเชือก ดึงลงแล้วกางปลายเชือกออกบีบหลังแขน",
      videoUrl: "https://www.youtube.com/watch?v=oz0gmMXpMAc"
    },
    {
      name: "เครื่องแบบที่ 2 (Straight / V-Bar Pushdown)",
      shortName: "บาร์ตรง / V-Bar พิน",
      equipment: "เคเบิลบาร์ตรงหรือ V-Bar ล็อคข้อศอกข้างลำตัวกดลงสุด",
      videoUrl: "https://www.youtube.com/watch?v=2-LAMcpzODU"
    },
    {
      name: "เครื่องแบบที่ 3 (Seated Triceps Dip Machine)",
      shortName: "เครื่องพินกดหลังแขน",
      equipment: "เครื่องกดหลังแขนแบบนั่งเบาะพิน (Seated Dip Machine)",
      videoUrl: "https://www.youtube.com/watch?v=0326dy_-CzM"
    }
  ],
  hammer_curl: [
    {
      name: "เครื่องแบบที่ 1 (Standing / Seated DB Hammer Curl)",
      shortName: "ดัมเบลแนวตั้ง",
      equipment: "ดัมเบลพับแขนแนวตั้ง (สันมือหงายขึ้นด้านบน) ยืนหรือนั่ง",
      videoUrl: "https://www.youtube.com/watch?v=YQAo_78-ruc"
    },
    {
      name: "เครื่องแบบที่ 2 (Cable Rope Hammer Curl)",
      shortName: "เคเบิลเชือกรอกต่ำ",
      equipment: "เคเบิลรอกล่างต่อสายเชือก ยืนตรงดึงขึ้นด้วยการจับแบบค้อน",
      videoUrl: "https://www.youtube.com/watch?v=7jqi2qWAUrs"
    },
    {
      name: "เครื่องแบบที่ 3 (Preacher Hammer Curl Bench)",
      shortName: "เบาะพิงแขน Preacher",
      equipment: "ม้านั่ง Preacher วางแขนพับดัมเบลแนวตั้ง ล็อคท่อนแขนบนสนิท",
      videoUrl: "https://www.youtube.com/watch?v=soxrZlIL35U"
    }
  ]
};

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
        machineVideos: MACHINE_VIDEO_PRESETS.seated_leg_press,
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
        machineVideos: MACHINE_VIDEO_PRESETS.hip_thrust,
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
        machineVideos: MACHINE_VIDEO_PRESETS.leg_extension,
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
        videoUrl: "https://www.youtube.com/watch?v=1Tq3QdYUuHs",
        machineVideos: MACHINE_VIDEO_PRESETS.leg_curl,
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
        machineVideos: MACHINE_VIDEO_PRESETS.calf_raise,
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
        machineVideos: MACHINE_VIDEO_PRESETS.lat_pulldown,
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
        machineVideos: MACHINE_VIDEO_PRESETS.shoulder_press,
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
        videoUrl: "https://www.youtube.com/watch?v=sqOw2Y68ecY",
        machineVideos: MACHINE_VIDEO_PRESETS.chest_press,
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
        videoUrl: "https://www.youtube.com/watch?v=sqOw2Y68ecY",
        machineVideos: MACHINE_VIDEO_PRESETS.chest_press,
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
        machineVideos: MACHINE_VIDEO_PRESETS.incline_chest,
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
        machineVideos: MACHINE_VIDEO_PRESETS.chest_fly,
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
        machineVideos: MACHINE_VIDEO_PRESETS.seated_leg_press,
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
        machineVideos: MACHINE_VIDEO_PRESETS.shoulder_press,
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
        machineVideos: MACHINE_VIDEO_PRESETS.lat_pulldown,
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
        machineVideos: MACHINE_VIDEO_PRESETS.row_back,
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
        machineVideos: MACHINE_VIDEO_PRESETS.lat_pulldown,
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
        videoUrl: "https://www.youtube.com/watch?v=sqOw2Y68ecY",
        machineVideos: MACHINE_VIDEO_PRESETS.chest_press,
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
        machineVideos: MACHINE_VIDEO_PRESETS.seated_leg_press,
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
        machineVideos: MACHINE_VIDEO_PRESETS.shoulder_press,
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
        machineVideos: MACHINE_VIDEO_PRESETS.shoulder_press,
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
        machineVideos: MACHINE_VIDEO_PRESETS.lateral_raise,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง (หรือ 10–12)" },
          { type: "work", reps: "6–8 ครั้ง (หรือ 10–12)" },
          { type: "work", reps: "6–8 ครั้ง (หรือ 10–12)" }
        ]
      },
      {
        id: "th3",
        name: "Reverse Pec Fly Machine / Dumbbell Rear Delt",
        isMain: false,
        altName: "เครื่อง Pec Fly ปรับหลัง, ดัมเบลคว่ำหน้าบนม้านั่ง, หรือเคเบิลไขว้ (ใส่น้ำหนักต่อข้าง)",
        mainMuscle: "หัวไหล่ด้านหลัง (Rear Delts) & สะบัก",
        subMuscle: "หลังส่วนบน (ช่วยแก้ปัญหาไหล่ห่อ)",
        videoUrl: "https://www.youtube.com/watch?v=woIoS0MbNYg",
        machineVideos: MACHINE_VIDEO_PRESETS.rear_delt_fly,
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
        videoUrl: "https://www.youtube.com/watch?v=sqOw2Y68ecY",
        machineVideos: MACHINE_VIDEO_PRESETS.chest_press,
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
        machineVideos: MACHINE_VIDEO_PRESETS.lat_pulldown,
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
        machineVideos: MACHINE_VIDEO_PRESETS.seated_leg_press,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "touchup", reps: "6–8 ครั้ง" }
        ]
      }
    ]
  },
  fri: {
    title: "วันศุกร์: สลับ A/B (3-Day Alternating Split)",
    subtitle: "สลับ Program A (อก+หลัง+ท้อง) หรือ Program B (ขา+แขน+ไหล่/บ่า) ตามรอบสัปดาห์ (Week 1: A-B-A, Week 2: B-A-B)",
    exercises: [
      {
        id: "a1",
        name: "Flat Dumbbell Bench Press",
        isMain: true,
        altName: "ดัมเบลนอนดันอกบนม้านั่งราบ (ใส่น้ำหนักต่อข้าง) หรือเครื่อง Chest Press",
        mainMuscle: "อกส่วนกลาง (Mid Chest)",
        subMuscle: "ไหล่หน้า (Front Delts), หลังแขน (Triceps)",
        videoUrl: "https://www.youtube.com/watch?v=sqOw2Y68ecY",
        machineVideos: MACHINE_VIDEO_PRESETS.chest_press,
        sets: [
          { type: "warm", reps: "15 ครั้ง (40-50%)" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "a2",
        name: "Lat Pulldown Machine",
        isMain: true,
        altName: "ดึงบาร์ลงข้างหน้า หรือ Assisted Chin-up",
        mainMuscle: "หลังส่วนกว้าง/ปีก (Latissimus Dorsi - V-Shape)",
        subMuscle: "หน้าแขน (Biceps), สะบักและหลังบน",
        videoUrl: "https://www.youtube.com/watch?v=BwV6jzYKiNY",
        machineVideos: MACHINE_VIDEO_PRESETS.lat_pulldown,
        sets: [
          { type: "warm", reps: "15 ครั้ง (40-50%)" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "a3",
        name: "Incline Dumbbell Press",
        isMain: true,
        altName: "ดันอกเบาะเอียง 30–45 องศา หรือ Incline Machine",
        mainMuscle: "อกส่วนบน (Upper Chest / แนวไหปลาร้า)",
        subMuscle: "ไหล่หน้า, หลังแขน",
        videoUrl: "https://www.youtube.com/watch?v=0bnc96eUvG0",
        machineVideos: MACHINE_VIDEO_PRESETS.incline_chest,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "a4",
        name: "Seated Cable Row",
        isMain: false,
        altName: "เคเบิลดึงหลังท่านั่งจับแคบ (V-Bar) หรือ Chest-Supported Machine",
        mainMuscle: "หลังส่วนกลางและปีกส่วนล่าง (Mid Back & Lower Lats)",
        subMuscle: "หน้าแขน, หลังล่างช่วยพยุงตัว",
        videoUrl: "https://www.youtube.com/watch?v=0U8VMBXPQco",
        machineVideos: MACHINE_VIDEO_PRESETS.row_back,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "a5",
        name: "Pec Fly Machine",
        isMain: false,
        altName: "เครื่องหนีบอก Matrix หรือ Cable Fly",
        mainMuscle: "อกด้านใน/ร่องอก (Inner & Mid Chest)",
        subMuscle: "ไหล่ด้านหน้า",
        videoUrl: "https://www.youtube.com/watch?v=rTATwLKP548",
        machineVideos: MACHINE_VIDEO_PRESETS.chest_fly,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "10–12 ครั้ง" },
          { type: "work", reps: "10–12 ครั้ง" }
        ]
      },
      {
        id: "a6",
        name: "Hanging Leg Raise",
        isMain: false,
        altName: "โหนบาร์หรือเครื่อง Captain's Chair ยกเข่า/ยกขา",
        mainMuscle: "หน้าท้องส่วนล่างและแกนกลางลำตัว (Lower Abs & Core)",
        subMuscle: "แกนกลางลำตัว และกล้ามเนื้องอสะโพก (Hip Flexors)",
        videoUrl: "https://www.youtube.com/watch?v=hdng3Nm1x_E",
        machineVideos: MACHINE_VIDEO_PRESETS.hanging_leg_raise,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "12–15 ครั้ง" },
          { type: "work", reps: "12–15 ครั้ง" }
        ]
      }
    ],
    bonusExercises: []
  },
  prog_a: {
    id: "prog_a",
    title: "Program A: อก + หลัง + ท้อง (Chest, Back & Abs)",
    subtitle: "3-Day A/B Split - 6 ท่าหลักเน้นกล้ามเนื้อมวลรวมช่วงบนและแกนกลางลำตัว",
    exercises: [
      {
        id: "a1",
        name: "Flat Dumbbell Bench Press",
        isMain: true,
        altName: "ดัมเบลนอนดันอกบนม้านั่งราบ (ใส่น้ำหนักต่อข้าง) หรือเครื่อง Chest Press",
        mainMuscle: "อกส่วนกลาง (Mid Chest)",
        subMuscle: "ไหล่หน้า (Front Delts), หลังแขน (Triceps)",
        videoUrl: "https://www.youtube.com/watch?v=sqOw2Y68ecY",
        machineVideos: MACHINE_VIDEO_PRESETS.chest_press,
        sets: [
          { type: "warm", reps: "15 ครั้ง (40-50%)" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" },
          { type: "work", reps: "6–8 ครั้ง" }
        ]
      },
      {
        id: "a2",
        name: "Lat Pulldown Machine",
        isMain: true,
        altName: "ดึงบาร์ลงข้างหน้า หรือ Assisted Chin-up",
        mainMuscle: "หลังส่วนกว้าง/ปีก (Latissimus Dorsi - V-Shape)",
        subMuscle: "หน้าแขน (Biceps), สะบักและหลังบน",
        videoUrl: "https://www.youtube.com/watch?v=BwV6jzYKiNY",
        machineVideos: MACHINE_VIDEO_PRESETS.lat_pulldown,
        sets: [
          { type: "warm", reps: "15 ครั้ง (40-50%)" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "a3",
        name: "Incline Dumbbell Press",
        isMain: true,
        altName: "ดันอกเบาะเอียง 30–45 องศา หรือ Incline Machine",
        mainMuscle: "อกส่วนบน (Upper Chest / แนวไหปลาร้า)",
        subMuscle: "ไหล่หน้า, หลังแขน",
        videoUrl: "https://www.youtube.com/watch?v=0bnc96eUvG0",
        machineVideos: MACHINE_VIDEO_PRESETS.incline_chest,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "a4",
        name: "Seated Cable Row",
        isMain: false,
        altName: "เคเบิลดึงหลังท่านั่งจับแคบ (V-Bar) หรือ Chest-Supported Machine",
        mainMuscle: "หลังส่วนกลางและปีกส่วนล่าง (Mid Back & Lower Lats)",
        subMuscle: "หน้าแขน, หลังล่างช่วยพยุงตัว",
        videoUrl: "https://www.youtube.com/watch?v=0U8VMBXPQco",
        machineVideos: MACHINE_VIDEO_PRESETS.row_back,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "a5",
        name: "Pec Fly Machine",
        isMain: false,
        altName: "เครื่องหนีบอก Matrix หรือ Cable Fly",
        mainMuscle: "อกด้านใน/ร่องอก (Inner & Mid Chest)",
        subMuscle: "ไหล่ด้านหน้า",
        videoUrl: "https://www.youtube.com/watch?v=rTATwLKP548",
        machineVideos: MACHINE_VIDEO_PRESETS.chest_fly,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "10–12 ครั้ง" },
          { type: "work", reps: "10–12 ครั้ง" }
        ]
      },
      {
        id: "a6",
        name: "Hanging Leg Raise",
        isMain: false,
        altName: "โหนบาร์หรือเครื่อง Captain's Chair ยกเข่า/ยกขา",
        mainMuscle: "หน้าท้องส่วนล่างและแกนกลางลำตัว (Lower Abs & Core)",
        subMuscle: "แกนกลางลำตัว และกล้ามเนื้องอสะโพก (Hip Flexors)",
        videoUrl: "https://www.youtube.com/watch?v=hdng3Nm1x_E",
        machineVideos: MACHINE_VIDEO_PRESETS.hanging_leg_raise,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "12–15 ครั้ง" },
          { type: "work", reps: "12–15 ครั้ง" }
        ]
      }
    ],
    bonusExercises: []
  },
  prog_b: {
    id: "prog_b",
    title: "Program B: ขา + แขน + ไหล่/บ่า (Legs, Arms, Shoulders & Traps)",
    subtitle: "3-Day A/B Split - 7 ท่าหลักเน้นช่วงล่าง แขนทั้งสองมัด และหัวไหล่/บ่า 3D",
    exercises: [
      {
        id: "b1",
        name: "Seated Leg Press Machine",
        isMain: true,
        altName: "เครื่องถีบขา หรือ Squat",
        mainMuscle: "ต้นขาด้านหน้า (Quads), ก้น (Glutes)",
        subMuscle: "ต้นขาด้านหลัง, น่อง (วางเท้าสูงโดนก้นมากขึ้น)",
        videoUrl: "https://www.youtube.com/watch?v=kTM85YKV7ls",
        machineVideos: MACHINE_VIDEO_PRESETS.seated_leg_press,
        sets: [
          { type: "warm", reps: "15 ครั้ง (40-50%)" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "b2",
        name: "Smith Machine Hip Thrust",
        isMain: true,
        altName: "หรือ Glute Drive Machine / Barbell",
        mainMuscle: "ก้นมัดใหญ่ (Gluteus Maximus เน้น ๆ)",
        subMuscle: "ต้นขาด้านหลัง และแกนกลางลำตัว",
        videoUrl: "https://www.youtube.com/watch?v=s1gUMRjpgqM",
        machineVideos: MACHINE_VIDEO_PRESETS.hip_thrust,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "b3",
        name: "Leg Extension Machine",
        isMain: false,
        altName: "เครื่องเตะขาหน้า",
        mainMuscle: "ต้นขาด้านหน้า 4 มัดล้วน (Quadriceps)",
        subMuscle: "กล้ามเนื้อพยุงรอบหัวเข่า",
        videoUrl: "https://www.youtube.com/watch?v=dpn7z7nYRcQ",
        machineVideos: MACHINE_VIDEO_PRESETS.leg_extension,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "10–12 ครั้ง" },
          { type: "work", reps: "10–12 ครั้ง" }
        ]
      },
      {
        id: "b4",
        name: "Seated DB Shoulder Press",
        isMain: true,
        altName: "ดัมเบลนั่งดันไหล่ หรือ Shoulder Press Machine",
        mainMuscle: "หัวไหล่ด้านหน้าและด้านข้าง (Front & Side Delts)",
        subMuscle: "แขนด้านหลัง (Triceps), บ่าส่วนบน",
        videoUrl: "https://www.youtube.com/watch?v=aMB82ZgfdJ8",
        machineVideos: MACHINE_VIDEO_PRESETS.shoulder_press,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "b5",
        name: "Dumbbell Shrug",
        isMain: false,
        altName: "ยักไหล่ถือดัมเบล หรือ Smith Machine Shrug",
        mainMuscle: "กล้ามเนื้อบ่า/สะพานคอ (Upper Trapezius)",
        subMuscle: "กำลังมือและท่อนแขน (Grip & Forearms)",
        videoUrl: "https://www.youtube.com/watch?v=wTSt22ay31w",
        machineVideos: MACHINE_VIDEO_PRESETS.shrug,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "10–12 ครั้ง" },
          { type: "work", reps: "10–12 ครั้ง" }
        ]
      },
      {
        id: "b6",
        name: "Cable Triceps Pushdown",
        isMain: false,
        altName: "เคเบิลกดเชือกหรือบาร์หลังแขน",
        mainMuscle: "แขนด้านหลังทั้ง 3 หัว (Triceps เน้น ๆ)",
        subMuscle: "ท่อนแขนส่วนปลาย (Forearms)",
        videoUrl: "https://www.youtube.com/watch?v=oz0gmMXpMAc",
        machineVideos: MACHINE_VIDEO_PRESETS.triceps_pushdown,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      },
      {
        id: "b7",
        name: "Dumbbell Hammer Curl",
        isMain: false,
        altName: "พับแขนจับดัมเบลแนวตั้ง หรือเชือกเคเบิล",
        mainMuscle: "กล้ามเนื้อแขนมัดลึกดันแขนหนา (Brachialis) + ท่อนแขน",
        subMuscle: "หน้าแขน (Biceps)",
        videoUrl: "https://www.youtube.com/watch?v=YQAo_78-ruc",
        machineVideos: MACHINE_VIDEO_PRESETS.hammer_curl,
        sets: [
          { type: "warm", reps: "15 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" },
          { type: "work", reps: "8–10 ครั้ง" }
        ]
      }
    ],
    bonusExercises: []
  }
};

export const programA = workoutData.prog_a;
export const programB = workoutData.prog_b;

export const PROGRAM_A = programA;
export const PROGRAM_B = programB;
export const AB_MACHINE_VIDEO_PRESETS = MACHINE_VIDEO_PRESETS;
export const AB_SPLIT_CANONICAL_MAP = EXERCISE_CANONICAL_MAP;

// ---------------------------------------------------------------------------
// 3-Day A/B schedule routing
// Mon / Wed / Fri tabs open Program A or B; Tue / Thu are rest days.
// Week 1 (anchor week) = A-B-A, next calendar week = B-A-B, and so on.
// ASSUMPTION: anchor = Monday 2026-11-16 (week 1 = A-B-A). Change this to re-phase.
// ---------------------------------------------------------------------------
export const AB_SCHEDULE_ANCHOR_MONDAY = '2026-11-16';
const AB_WEEK_PATTERN = {
  even: { mon: 'prog_a', wed: 'prog_b', fri: 'prog_a' }, // A-B-A
  odd: { mon: 'prog_b', wed: 'prog_a', fri: 'prog_b' }   // B-A-B
};
const AB_TAB_KEYS = ['mon', 'wed', 'fri'];
const REST_TAB_KEYS = ['tue', 'thu'];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Which program a Mon/Wed/Fri tab uses in the week containing `date` (local time).
 * Returns 'prog_a' | 'prog_b', or null when dayKey is not a program day.
 */
export function scheduledProgramForDay(dayKey, date = new Date()) {
  if (!AB_TAB_KEYS.includes(dayKey)) return null;
  const dow = (date.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dow);
  const [y, m, d] = AB_SCHEDULE_ANCHOR_MONDAY.split('-').map(Number);
  const anchor = new Date(y, m - 1, d);
  const weeks = Math.round((monday - anchor) / (7 * MS_PER_DAY));
  const pattern = weeks % 2 === 0 ? AB_WEEK_PATTERN.even : AB_WEEK_PATTERN.odd;
  return pattern[dayKey];
}

/**
 * Map a tab/day key to the key the app should render and save under.
 * mon/wed/fri -> prog_a|prog_b (per week), tue/thu -> 'rest', anything else unchanged.
 */
export function resolveDayKey(key, date = new Date()) {
  if (AB_TAB_KEYS.includes(key)) return scheduledProgramForDay(key, date);
  if (REST_TAB_KEYS.includes(key)) return 'rest';
  return key;
}

/** Today's program key ('prog_a' | 'prog_b' | 'rest') from the weekday schedule. */
export function resolveTodayKey(date = new Date()) {
  const weekday = ['rest', 'mon', 'tue', 'wed', 'thu', 'fri', 'rest'][date.getDay()];
  return resolveDayKey(weekday, date);
}


