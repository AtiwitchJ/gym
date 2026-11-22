# 🕵️‍♂️ GYM Competitor Reverse Engineering — Next Feature Specification
> **Document:** Next High-Impact Feature Blueprint: Per-Exercise Progression Chart & Strength Curve  
> **Target System:** `/Users/up-mac/wokrspace/mind/gym` (Vue 3 + Tailwind CSS + SQLite WAL)  
> **Prepared by:** GYM Competitor RE 🕵️‍♂️  
> **Recipients:** GYM Manager 👔, GYM Frontend / UXUI 🎨, GYM Backend ⚙️, GYM QA Test 🧪  
> **Date:** 23 พฤศจิกายน 2026  
> **File:** `docs/COMPETITOR-RE-NEXT-FEATURE-20261123.md`  

---

## 1. Executive Summary: ฟีเจอร์ที่เลือกและเหตุผล (Why This Feature)

### 1.1 ชื่อฟีเจอร์
**Per-Exercise Progression Chart & Strength Curve (กราฟวิวัฒนาการน้ำหนักและ e1RM รายท่า พร้อมเป้าหมายความแข็งแรง)**

### 1.2 บริบทและฟีเจอร์ที่เสร็จสิ้นแล้วใน GYM App
โปรเจกต์ GYM พัฒนาฟีเจอร์หลักในห้องซ้อมจนครบถ้วนและมีความเสถียรสูง ได้แก่:
- Barbell Plate Calculator + คลังแผ่นต่อยิม (Custom Plate Inventory + Gym Profiles)
- Smart Rest Timer ปรับเวลาต่อท่าใน SQLite (+30s/-15s, 3-2-1 Chime, Notification)
- RIR 0–4 + Dynamic e1RM + useWeightAdvisor แนะนำน้ำหนักตาม RIR/Reps
- Muscle Recovery Panel (48–72h Decay) + Weekly Volume Chart
- Monthly Summary สรุปผลงานรายเดือน
- Body Weight Tracker บันทึกน้ำหนักตัวและวิเคราะห์แนวโน้มรายวัน
- Training Calendar & Consistency Streak ปฏิทินรายเดือนและตัวนับสัปดาห์ต่อเนื่อง (🔥)
- Personal Records (PR) ตรวจจับเมื่อ e1RM ชนะสถิติเดิม + แสดงในการ์ดสรุปหลังซ้อม

### 1.3 ช่องว่างสำคัญที่สุดที่ยังขาด (The Parity Gap)
ในโมดอลประวัติท่า `ExerciseHistoryModal.vue` ปัจจุบันมีเพียง:
1. การ์ดแสดงค่า PR รวม 3 ค่า (`bestWeight`, `bestReps`, `estimated1RM`)
2. รายการข้อความเรียงตามวันเวลาแบบแนวตั้ง (Vertical Text List) เช่น "20 พ.ย. 69: เซ็ต 1: 80 กก. × 8, เซ็ต 2: 80 กก. × 7..."

**ปัญหาการใช้งานจริงในยิม (Real Gym Pain Point):**
- **หัวใจสำคัญของการเพาะกายและการสร้างความแข็งแกร่งคือ Progressive Overload (การเพิ่มภาระอย่างเป็นระบบ):** ผู้ใช้ต้องการเห็นแนวโน้มความก้าวหน้าของท่าสำคัญ (เช่น Barbell Bench Press, Incline Dumbbell Press, Barbell Squat, Lat Pulldown) ว่าตลอด 1–3 เดือนที่ผ่านมา แรงเราเพิ่มขึ้นจริงหรือไม่ หรือกำลังติดเพดาน (Plateau) หรือแรงตกจากการพักผ่อนไม่พอ
- **ผู้ใช้ต้องคำนวณในใจ:** ปัจจุบันต้องมานั่งอ่านตัวเลขย้อนหลังทีละบรรทัด เปรียบเทียบตัวเลขในหัวว่าสัปดาห์ก่อนยกได้เท่าไหร่
- **ขาดการมองเห็นเป้าหมาย (No Target Goal Visualization):** ไม่มีเส้นประเป้าหมาย เช่น "เป้าหมาย Bench Press: 100 kg" ให้เห็นว่าเหลือระยะทางอีกเท่าใดกว่าจะพิชิตเป้าหมาย

---

## 2. หลักฐานและการ Reverse-Engineer จากแอปคู่แข่ง (Competitor Breakdown)

| Competitor | ชื่อฟีเจอร์ของคู่แข่ง | พฤติกรรม UX และการทำงานของระบบ | แหล่งอ้างอิง |
| :--- | :--- | :--- | :--- |
| **Strong** | **Exercise Charts & Progression Analytics** | • ฟีเจอร์ชูโรงหลักของ Strong Pro (ใช้เป็น Paywall แม่เหล็กดึงดูดผู้ใช้)<br>• แสดงกราฟเส้น (Line Chart) แสดง e1RM, Max Weight, Total Volume รายท่า<br>• แสดงจุดสถิติย้อนหลังทุกรอบการซ้อม พร้อมเส้น Trend Line<br>• ชี้ให้เห็นว่ากำลัง Progressive Overload หรือเกิด Plateau | strongapp.io / Features (Strong Pro Analytics) |
| **Hevy** | **Exercise Performance Graph & 1RM History** | • เข้าหน้ารายละเอียดท่าใดก็ได้ จะพบกราฟแบบ Interactive สลับดูแท็บ 1RM / Max Weight / Volume ได้ทันที<br>• เลือกระยะเวลาดูย้อนหลัง: 1M, 3M, 6M, 1Y, All<br>• แตะที่จุดบนกราฟ (Data Point) จะเด้งพรีวิววันที่, น้ำหนัก, ครั้ง และเซ็ตที่ทำได้ในวันนั้น | hevyapp.com / Hevy Help Center (Exercise Analytics) |
| **FitNotes** | **Exercise Graph Tracker** | • แท็บ Graph ประจำท่าเป็นฟีเจอร์หลักที่ผู้ใช้ชื่นชอบมากที่สุด<br>• พล็อตกราฟจุดและเส้นเชื่อมโยงความก้าวหน้าของ Estimated 1RM ต่อเนื่องทุกเซสชัน<br>• ช่วยให้นักกีฬาวางแผนช่วง Deload และ Peak Strength ได้แม่นยำ | fitnotesapp.com / Graphing Features |

### จุดแข็งที่ GYM App จะทำได้ดีกว่าคู่แข่ง:
1. **ฟรีและใช้งานออฟไลน์ 100%:** Strong ล็อคกราฟความก้าวหน้ารายท่าไว้หลังระบบสมาชิกรายเดือน (Pro Paywall $4.99/เดือน) แต่ GYM App เปิดให้ใช้งานเต็มรูปแบบทันทีบนเครื่อง
2. **Pure SVG ไม่มี Dependency ภายนอก:** ใช้วิธีเรนเดอร์ SVG แบบ Responsive น้ำหนักเบา คล้ายคลึงกับ `VolumeChart.vue` และ `BodyWeightCard.vue` โหลดเร็วในพริบตา ไม่หน่วงหน้าจอมือถือ
3. **เชื่อมโยงกับ e1RM Formula เดิมของแอป:** ใช้อัลกอริทึมคำนวณ e1RM จาก RIR เดียวกันกับ `useRpeAdvisor.js` และ `exercise-stats.js` ทำให้ข้อมูลสอดคล้องกันทั้งระบบ

---

## 3. รายละเอียดสเปกการออกแบบ UX / UI (Neobrutalism Design System)

### 3.1 ตำแหน่งการแสดงผล (Placement)
- คอมโพเนนต์ใหม่ชื่อ `ExerciseProgressionChart.vue`
- วางแทรกอยู่ใน `src/components/ExerciseHistoryModal.vue` โดยอยู่ระหว่าง "PR Card" ด้านบน กับ "History List" ด้านล่าง

### 3.2 องค์ประกอบของ Component (Thai Neobrutalism Style)
```
+-----------------------------------------------------------------------+
|  EXERCISE PROGRESSION · กราฟวิวัฒนาการ                     [🎯 ตั้งเป้าหมาย] |
|  📈 +7.5 กก. (+10.0%) จากรอบแรก               สถิติสูงสุด: 82.5 กก. (e1RM)   |
|                                                                       |
|  [ e1RM (แรงสูงสุด) ]     [ น้ำหนักยกสูงสุด ]     [ ปริมาณรวม (Volume) ]      |
+-----------------------------------------------------------------------+
|  e1RM (กก.)                                                           |
|   90 |                                                    🎯 85 กก.  |
|      |                                                ● (82.5)        |
|   80 |                            ●-----------●------/                |
|      |               ●-----------/                                    |
|   70 |  ●-----------/                                                 |
|      |  (75.0)                                                        |
|    0 +-------------------------------------------------------------   |
|        15 ต.ค.          28 ต.ค.          10 พ.ย.          20 พ.ย.     |
+-----------------------------------------------------------------------+
|  📌 20 พ.ย. 2026: 80 กก. × 8 ครั้ง (RIR 1) -> e1RM ≈ 82.5 กก.           |
+-----------------------------------------------------------------------+
```

### 3.3 UI Specifications & Micro-interactions:
- **Card Container:**
  - `bg-white border-2 border-plate rounded-2xl p-4 shadow-[3px_3px_0px_#1e2220] flex flex-col gap-3 select-none`
- **Header & Metric Switcher (ปุ่มสลับมุมมอง):**
  - แถบสลับเมตริก 3 ปุ่ม: `e1RM (แรงประเมิน)`, `น้ำหนักสูงสุด (Max Weight)`, `ปริมาณรวม (Volume)`
  - ขนาดปุ่มสัมผัสตามเกณฑ์มือถือ: ความสูงขั้นต่ำ 44px (`min-h-[44px] px-3 py-2 text-xs font-heading font-bold rounded-xl border-2 border-plate touch-manipulation`)
  - ปุ่มที่เลือก: `bg-flame text-white shadow-[2px_2px_0px_#1e2220]`
  - ปุ่มที่ไม่ได้เลือก: `bg-surface hover:bg-paper-dim text-ink shadow-[1px_1px_0px_#1e2220]`
- **สรุปตัวเลขพัฒนาการ (Delta Badge):**
  - Badge สีเขียว `bg-emerald-bg text-emerald-text border border-emerald font-mono font-bold px-2 py-0.5 rounded-full text-[11px]` แสดงการเติบโต เช่น `📈 +7.5 กก. (+10.0%)`
  - หากพัฒนาการติดลบ/คงที่ แสดง Badge สีกรมท่า/เทาอย่างชัดเจน
- **Interactive SVG Chart:**
  - เส้นกราฟความก้าวหน้า: เส้นสีเข้มหนา 3px `stroke-plate` หรือ `stroke-emerald` พร้อมจุดวงกลม `fill-flame r="4.5" stroke-plate stroke-2`
  - เส้นประเป้าหมาย (Goal Line): เส้นประสีแดง/ส้ม `stroke-flame stroke-dasharray="4 4"` พร้อม Badge เล็กระบุเป้าหมาย เช่น `🎯 85 กก.`
  - แตะที่จุดบนกราฟ (Data Point Interaction): จุดจะขยายขนาด (`scale-125`) และกล่องข้อความสรุปด้านล่างจะแสดงข้อมูลของวันนั้นทันที (วันที่, น้ำหนัก, ครั้งที่ทำได้, RIR และ e1RM)
- **Accessibility & Safe Tailwind Classes:**
  - หลีกเลี่ยงคลาสที่ผิดระเบียบหรือทำให้การทดสอบพัง (เช่น ห้ามใช้ `text-ink-muted/80`, ห้ามใช้ `focus:outline-none`)
  - รักษาโฟกัสริงมาตรฐาน `focus-visible:ring-2 focus-visible:ring-plate`

---

## 4. สัญญา API และ Database Schema (Backend Specifications)

### 4.1 Database Migration (Safe SQLite WAL)
ข้อมูลเซ็ตและการฝึกซ้อมบันทึกอยู่ในตาราง `workout_sessions`, `session_exercises`, และ `session_sets` ครบถ้วนอยู่แล้ว  
เพื่อรองรับการตั้งเป้าหมายความแข็งแกร่งรายท่า (Exercise Target Goal) ให้เพิ่มตารางใหม่แบบปลอดภัย 100%:

```sql
-- เพิ่มใน server/db.js (ปลอดภัย ไม่กระทบตารางเดิม)
CREATE TABLE IF NOT EXISTS exercise_goals (
  exercise_id TEXT PRIMARY KEY,
  target_weight REAL NOT NULL,               -- น้ำหนักเป้าหมาย (กก.)
  target_reps INTEGER DEFAULT 1,             -- จำนวนครั้งเป้าหมาย (เช่น 1RM, 5 reps)
  target_e1rm REAL,                          -- ค่า e1RM เป้าหมายที่คำนวณได้
  notes TEXT,                                -- บันทึกสั้นๆ เช่น "เป้าสิ้นปี 2026"
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 API Contracts

#### Endpoint 1: ดึงไทม์ไลน์ความก้าวหน้าของท่าฝึก
- **Route:** `GET /api/exercises/:id/progression`
- **Path Parameter:** `id` (string เช่น `barbell_bench_press`)
- **Query Parameters (ตัวเลือก):** `limit` (จำนวนเซสชันล่าสุด ค่าเริ่มต้น 20 สูงสุด 50)
- **Success Response (200 OK):**
```json
{
  "exerciseId": "barbell_bench_press",
  "timeline": [
    {
      "date": "2026-10-15",
      "sessionId": "session_1729000000000",
      "maxWeight": 70.0,
      "bestE1rm": 81.6,
      "totalVolume": 1680.0,
      "workingSetsCount": 3,
      "bestSet": {
        "weight": 70.0,
        "reps": 8,
        "rir": 2
      }
    },
    {
      "date": "2026-11-20",
      "sessionId": "session_1732089600000",
      "maxWeight": 80.0,
      "bestE1rm": 88.0,
      "totalVolume": 1920.0,
      "workingSetsCount": 3,
      "bestSet": {
        "weight": 80.0,
        "reps": 6,
        "rir": 1
      }
    }
  ],
  "stats": {
    "baselineE1rm": 81.6,
    "latestE1rm": 88.0,
    "deltaE1rm": 6.4,
    "percentageGain": 7.84,
    "bestWeightEver": 80.0,
    "totalSessionsLogged": 2
  },
  "goal": {
    "targetWeight": 100.0,
    "targetReps": 1,
    "targetE1rm": 100.0,
    "notes": "เป้าหมาย 100 kg สิ้นปี"
  }
}
```

#### Endpoint 2: ตั้งเป้าหมายน้ำหนักของท่าฝึก
- **Route:** `PUT /api/exercises/:id/goal`
- **Request Body:**
```json
{
  "targetWeight": 100.0,
  "targetReps": 1,
  "notes": "เป้าหมาย 100 kg สิ้นปี"
}
```
- **Validation:**
  - `targetWeight` ต้องเป็นตัวเลขบวก (> 0 และ ≤ 1000) (มิฉะนั้นตอบ `400 Bad Request`)
  - `targetReps` ต้องเป็นจำนวนเต็มบวก (1 ถึง 100)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "exerciseId": "barbell_bench_press",
  "goal": {
    "targetWeight": 100.0,
    "targetReps": 1,
    "targetE1rm": 100.0,
    "notes": "เป้าหมาย 100 kg สิ้นปี"
  }
}
```

---

## 5. การแบ่งหน้าที่ไฟล์พัฒนา (Separation of Concerns)

เพื่อป้องกันปัญหา Merge Conflicts และให้ทีม Frontend, Backend และ QA ทำงานขนานกันได้อิสระแบบ 1 commit ตามระเบียบการพัฒนาของโปรเจกต์:

| ทีมผู้รับผิดชอบ | ไฟล์ที่สร้างใหม่ / ไฟล์ที่แก้ไข | วัตถุประสงค์และขอบเขตงาน |
| :--- | :--- | :--- |
| **Backend ⚙️** | `server/exercise-progression.js` *(สร้างใหม่)* | Logic ดึงประวัติเซ็ตจริง (คัดกรองเซ็ตวอร์มออก), รวบรวมข้อมูลตามวันที่ (`date ASC`), คำนวณ `bestE1rm`, `maxWeight`, `totalVolume`, `stats` พัฒนาการ |
| **Backend ⚙️** | `server/db.js` *(แก้ไขเฉพาะส่วน CREATE TABLE)* | เพิ่มตาราง `exercise_goals` ปลอดภัยแบบ `CREATE TABLE IF NOT EXISTS` |
| **Backend ⚙️** | `server/server.js` *(แก้ไขเฉพาะการ Mount Route)* | Mount เส้นทาง `GET /api/exercises/:id/progression` และ `PUT /api/exercises/:id/goal` |
| **Frontend 🎨** | `src/composables/useExerciseProgression.js` *(สร้างใหม่)* | Composable จัดการดึง API, แปลงข้อมูลพิกัด SVG Coordinates (X, Y), คัดกรองตัวเลือกเมตริก, และคำนวณ Delta |
| **Frontend 🎨** | `src/components/ExerciseProgressionChart.vue` *(สร้างใหม่)* | คอมโพเนนต์ UI กราฟ SVG สไตล์ Neobrutalism, ปุ่มสลับเมตริก 44px, เส้นประเป้าหมาย, และ Tooltip สรุปเซ็ต |
| **Frontend 🎨** | `src/components/ExerciseHistoryModal.vue` *(แก้ไข 2-3 บรรทัด)* | นำเข้า `<ExerciseProgressionChart :exercise-id="props.exerciseId" />` วางไว้ด้านบนรายการประวัติ |
| **QA Test 🧪** | `test/test-exercise-progression-api.js` *(สร้างใหม่)* | ชุดทดสอบอัตโนมัติรันผ่าน Runner ปลอดภัย ตรวจสอบความถูกต้องของ e1RM timeline, การคัดแยกเซ็ตวอร์ม, Goal Upsert, และ Validation |

---

## 6. แผนการทดสอบอัตโนมัติ (Automated QA Test Plan)

ชุดทดสอบใน `test/test-exercise-progression-api.js` ต้องรันผ่าน Guarded Runner (`npm run test:chain`) โดยห้ามแตะฐานข้อมูลจริง `data/gym.db`:

1. **Test 1: Empty History Handling:**
   - ท่าที่ยังไม่เคยมีบันทึกเซสชันเลย ต้องตอบกลับ `timeline: []`, `stats: null`, และ `goal: null` (Status 200 ไม่แครช)
2. **Test 2: Chronological Timeline & Warmup Exclusion:**
   - จำลองเซสชัน 3 วันที่มีทั้งเซ็ตวอร์ม (`warm`) และเซ็ตจริง (`work`)
   - ตรวจสอบว่า Timeline เรียงลำดับจากอดีตไปปัจจุบัน (`date ASC`) ถูกต้อง
   - ตรวจสอบว่าน้ำหนักในเซ็ตวอร์มไม่ถูกนำมาคำนวณใน `maxWeight`, `bestE1rm`, และ `totalVolume`
3. **Test 3: Progression Stats Calculation:**
   - ตรวจสอบค่า `deltaE1rm` (`latestE1rm - baselineE1rm`) และ `percentageGain` ว่าคำนวณแม่นยำตามสูตรคณิตศาสตร์
4. **Test 4: Exercise Goal Upsert & Validation:**
   - ทดสอบบันทึกเป้าหมายผ่าน `PUT /api/exercises/:id/goal`
   - ตรวจสอบว่าถ้าส่ง `targetWeight: -10` หรือ `targetWeight: 1200` ตอบกลับ `400 Bad Request`
   - ทดสอบอัปเดตเป้าหมายซ้ำใน `exercise_id` เดิม ต้องทำ Upsert สำเร็จ ไม่เกิด Duplicate Key
5. **Test 5: Zero Data Integrity Impact:**
   - ตรวจสอบว่าตารางหลัก `workout_sessions`, `session_exercises`, `session_sets`, `exercise_rest`, `user_training_goals` ไม่ได้รับผลกระทบใดๆ ทั้งสิ้น

---

## 7. เกณฑ์ความสำเร็จที่วัดได้ (Acceptance Criteria)

- [ ] เมื่อเปิดหน้าต่าง `ExerciseHistoryModal.vue` จะแสดงกราฟ SVG เส้นความก้าวหน้าของท่านั้นทันที
- [ ] ผู้ใช้สามารถกดปุ่มสลับเมตริกระหว่าง `e1RM`, `น้ำหนักยกสูงสุด`, และ `ปริมาณรวม (Volume)` ได้อย่างราบรื่น
- [ ] ปุ่มสลับเมตริกและปุ่มตั้งเป้าหมายมีขนาดสัมผัสขั้นต่ำ 44px บนจอมือถือ (ผ่านเกณฑ์ Mobile Density)
- [ ] แตะจุดบนกราฟเพื่อดูรายละเอียดของเซสชันวันนั้นได้อย่างแม่นยำ
- [ ] แสดงป้าย Badge สรุปพัฒนาการ (Delta และ % เติบโต) ในสไตล์ Neobrutalism เข้ากับธีมของแอป
- [ ] มีเส้นประเป้าหมาย (Goal Line) เมื่อผู้ใช้กำหนดเป้าหมายน้ำหนักของท่านั้น
- [ ] ไม่ใช้คลาสสีหรือ accessibility ที่ผิดระเบียบ (`text-ink-muted/80`, `focus:outline-none`)
- [ ] รัน `npm run test:chain` ผ่านทุกเคส 100% ภายในเวลาไม่เกิน 5 วินาที โดยไม่แตะต้องไฟล์ฐานข้อมูลจริง

---
*เอกสารนี้พร้อมให้ทีม Frontend, Backend และ QA เริ่มต้นพัฒนาในรอบการทำงานนี้ได้ทันที*
