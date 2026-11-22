# 🕵️‍♂️ GYM Competitor Reverse Engineering — Next Feature Specification
> **Document:** Next High-Impact Feature Blueprint: Exercise Substitution & Equipment Alternative Engine  
> **Target System:** `/Users/up-mac/wokrspace/mind/gym` (Vue 3 + Tailwind CSS + SQLite WAL)  
> **Prepared by:** GYM Competitor RE 🕵️‍♂️  
> **Recipients:** GYM Manager 👔, GYM Frontend / UXUI 🎨, GYM Backend ⚙️, GYM QA Test 🧪  
> **Date:** 26 พฤศจิกายน 2026  
> **File:** `docs/COMPETITOR-RE-NEXT-FEATURE-20261126.md`  

---

## 1. Executive Summary: ฟีเจอร์ที่เลือกและเหตุผล (Why This Feature)

### 1.1 ชื่อฟีเจอร์
**Exercise Substitution & Equipment Alternative Engine (ระบบแนะนำและสลับท่าฝึกทดแทนตามกลุ่มกล้ามเนื้อและอุปกรณ์ที่มีในยิม)**

### 1.2 บริบทและสถานะฟีเจอร์ที่ส่งมอบแล้วใน GYM App
โปรเจกต์ GYM ดำเนินการพัฒนาและส่งมอบฟังก์ชันติดตามการฝึกระดับสูงครบถ้วนอย่างเป็นระบบ:
1. **Barbell Plate Calculator & Custom Plate Inventory:** คำนวณแผ่นน้ำหนักและจัดการคลังแผ่นต่อยิม (`47fb463`)
2. **Smart Rest Timer:** ระบบจับเวลาพักเซ็ตอัจฉริยะ ปรับเวลาต่อท่าใน SQLite (+30s/-15s, 3-2-1 Chime, Web Notification) (`da4635d`)
3. **RIR 0–4 + Dynamic e1RM + useWeightAdvisor:** แนะนำน้ำหนักเซ็ตถัดไปตามผลงานจริง
4. **Muscle Recovery Panel & Weekly Volume Chart:** วิเคราะห์การฟื้นตัวของกล้ามเนื้อ (48–72h Decay) และปริมาณโวลุ่มรายสัปดาห์
5. **Monthly Summary:** สรุปผลงานและสถิติภาพรวมรายเดือน (`0a25119`)
6. **Body Weight Tracker & Trend Sparkline:** บันทึกน้ำหนักตัวและวิเคราะห์แนวโน้มรายวัน (`d316105`)
7. **Training Calendar & Consistency Streak:** ปฏิทินบันทึกการซ้อมและสถิติความสม่ำเสมอต่อเนื่อง (`d7ed6e9`)
8. **Per-Exercise Progression Chart & Strength Curve:** กราฟความแข็งแรงรายท่าพร้อมเส้นเป้าหมาย (`dd8c8e1`)
9. **Universal Workout Data Import & Export:** ระบบนำเข้า/ส่งออกข้อมูล JSON/CSV รองรับ Strong และ Hevy (`d5d0f44`)
10. **Persistent Exercise Machine Setup & Form Cues:** ระบบจำตำแหน่งพินเบาะเครื่องและคิวฟอร์มถาวรข้ามเซสชัน (`df108cd`)

### 1.3 ช่องว่างสำคัญที่สุดที่ยังขาดในห้องฝึกซ้อมจริง (The Parity Gap)
แม้ระบบบันทึกและคำนวณของ GYM App จะสมบูรณ์แบบมาก แต่ในสถานการณ์ฝึกซ้อมจริง ณ ช่วงเวลาเร่งด่วนของยิม (Peak Gym Hours: 17:00 – 20:00 น.):
1. **ปัญหาเครื่องเล่นไม่ว่าง (Equipment Congestion & Queue Bottleneck):**
   - เครื่องเล่นเป้าหมาย เช่น **Leg Press Machine, Cable Crossover, Smith Machine, หรือ Flat Barbell Bench** มักมีผู้ใช้งานต่อคิวเล่นซ้อนกัน 2–3 คน
   - ปัจจุบันใน GYM App ท่าฝึกในตารางถูกกำหนดตายตัวไว้ตาม `src/data/workouts.js` (เช่น วัน Push บังคับ Barbell Bench Press) หากเครื่องไม่ว่าง นักกีฬาต้องยืนรอ 10–15 นาที ทำให้ร่างกายเย็นลง หรือต้องละทิ้งท่าฝึกนั้นไปเลย ส่งผลให้โวลุ่มรวมในวันนั้นเสียหาย
2. **การขาดระบบสลับท่ากลางเซสชัน (Mid-Workout Exercise Swap Gap):**
   - ใน `ExerciseCard.vue` ปัจจุบัน มีเพียงปุ่มลบท่าทิ้ง หรือนำออกจากซูเปอร์เซ็ต แต่ **"ไม่มีปุ่มสำหรับสลับเป็นท่าทดแทน (Substitute / Swap Exercise)"**
   - เมื่อนักกีฬาต้องการเปลี่ยนไปเล่นดัมเบลหรือเคเบิลแทน ไม่สามารถเปลี่ยนชื่อท่าได้ทันทีโดยคงชุดเซ็ตเดิมไว้
3. **ความต้องการคำแนะนำน้ำหนักเมื่อเปลี่ยนอุปกรณ์ (Smart Weight Conversion):**
   - เมื่อเปลี่ยนจากท่าบาร์เบล (เช่น Barbell Bench Press 80 กก.) ไปเป็นดัมเบล (Dumbbell Bench Press) นักกีฬามักสับสนว่าจะต้องหยิบดัมเบลข้างละกี่กิโลกรัม (สูตรแนะนำชีวกลศาสตร์: ประมาณ 38%–42% ของบาร์เบล = ดัมเบลข้างละ 30–32 กก.)

---

## 2. หลักฐานและการ Reverse-Engineer จากแอปคู่แข่ง (Competitor Breakdown)

| Competitor | ชื่อฟีเจอร์ของคู่แข่ง | พฤติกรรม UX และการทำงานของระบบ | แหล่งอ้างอิง |
| :--- | :--- | :--- | :--- |
| **Hevy** | **Replace Exercise / Exercise Substitutions** | • ในระหว่างการซ้อม เมื่อกดเมนู 3 จุดบนหัวการ์ดท่าฝึก จะมีปุ่ม **"Replace Exercise"**<br>• ระบบจะเปิด Modal รายการท่าฝึกที่จัดเรียงตาม **Primary Muscle Group เดียวกันทันที**<br>• มีแถบฟิลเตอร์อุปกรณ์ (Dumbbell, Barbell, Cable, Machine, Smith Machine, Bodyweight)<br>• เมื่อเลือกท่าใหม่ ระบบจะถามว่าต้องการเก็บประวัติเซ็ตที่กรอกแล้วไว้หรือเริ่มเซ็ตใหม่ | hevyapp.com / Features (Workout Logging & Exercise Replacement) |
| **Strong** | **Swap Exercise (Strong Pro)** | • กดไอคอนสลับท่า 🔁 ที่มุมขวาบนของการ์ดท่าฝึก<br>• แสดงรายการท่าทดแทนที่จัดหมวดหมู่ตามรูปแบบการเคลื่อนไหว (Movement Pattern) เช่น Horizontal Push, Vertical Pull<br>• สามารถสลับท่าได้ใน 1 คลิกโดยไม่ทำให้เวลาพัก (Rest Timer) หรือลำดับในรูทีนหยุดชะงัก | strongapp.io / Features (Routine Management & Exercise Swapping) |
| **RP Hypertrophy** | **Biomechanical Exercise Swapping & SFR Rating** | • เน้นการสลับท่าตาม Stimulus-to-Fatigue Ratio (SFR) และความเป็นมิตรต่อข้อต่อ (Joint-Friendly Alternatives)<br>• หากมีอาการปวดไหล่ขณะเล่น Barbell Press ระบบจะแนะนำ Dumbbell Incline Press หรือ Machine Chest Press ทดแทนในมุมองศาที่ใกล้เคียงกัน | rpstrength.com / RP Hypertrophy App Guide |

### จุดแข็งที่ GYM App จะทำได้เหนือกว่าคู่แข่ง (GYM Superiority):
1. **Smart Weight Conversion Factor:** เมื่อผู้ใช้เปลี่ยนจาก Barbell เป็น Dumbbell หรือ Machine ระบบจะคำนวณและพรีฟิลค่าน้ำหนักเป้าหมายให้อัตโนมัติตามอัตราส่วนชีวกลศาสตร์ ไม่ต้องเดาน้ำหนักใหม่
2. **Context-Aware Muscle & Movement Match:** ดึงข้อมูลท่าฝึกจาก `src/data/defaultExercises.js` (กว่า 50+ ท่า) โดยจับคู่ทั้ง `muscleGroup` และองศาการออกแรง (เช่น Chest Flat / Incline / Fly)
3. **Custom Gym Profile Preferences:** บันทึกท่าทดแทนโปรดประจำตัวลงในตาราง SQLite WAL ทำให้ยิมที่ไม่มีอุปกรณ์เฉพาะทาง (เช่น ยิมคอนโดที่มีแต่ดัมเบล) จดจำท่าสำรองที่ผู้ใช้ชอบได้ตลอดไป

---

## 3. รายละเอียดสเปกการออกแบบ UX / UI (Neobrutalism Design System)

### 3.1 ตำแหน่งการแสดงผล (Placement)
- เพิ่มปุ่ม **`[ 🔄 สลับท่าทดแทน ]`** ที่ส่วนหัวการ์ดท่าฝึกใน `src/components/ExerciseCard.vue` (อยู่ข้างปุ่มลบท่า/ประวัติ)
- เมื่อแตะปุ่ม จะเปิดโมดอลแบบเต็มจอขนาดกะทัดรัด **`src/components/ExerciseSubstitutionModal.vue`**

### 3.2 Wireframe องค์ประกอบของ Component (Thai Neobrutalism Style)

#### A. ปุ่มสลับท่าบนการ์ดท่าฝึก (`ExerciseCard.vue`)
```
+-----------------------------------------------------------------------------------+
|  01  [ ท่าหลัก ] [ ใส่น้ำหนักต่อข้าง ]                                                |
|  ⭐ บาร์เบล เบนช์เพรส (Barbell Bench Press)                [ 🔄 สลับท่า ] [ ประวัติ ] [ ลบ ] |
|  [ 📌 เบาะ #3 · รูพิน #4 · ล็อคสะบัก ]                                              |
+-----------------------------------------------------------------------------------+
```

#### B. หน้าต่างเลือกท่าทดแทน (`ExerciseSubstitutionModal.vue`)
```
+-----------------------------------------------------------------------------------+
|  🔄 สลับท่าฝึกทดแทน (EXERCISE SUBSTITUTION)                                  [ ✕ ปิด ] |
|  ท่าปัจจุบัน: 🏋️ บาร์เบล เบนช์เพรส (Barbell Bench Press)                               |
|  กลุ่มกล้ามเนื้อ: 🎯 กล้ามเนื้ออก (Chest) · อุปกรณ์เดิม: บาร์เบล (Barbell)             |
+-----------------------------------------------------------------------------------+
|  ฟิลเตอร์อุปกรณ์ที่ว่างในยิม:                                                         |
|  [ ทั้งหมด ] [ ดัมเบล (Dumbbell) ] [ เคเบิล (Cable) ] [ แมชชีน ] [ สมิธแมชชีน ]    |
+-----------------------------------------------------------------------------------+
|  รายการท่าทดแทนที่แนะนำ (ตรงจุดชีวกลศาสตร์):                                         |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | 🌟 ดัมเบล เบนช์เพรส (Dumbbell Bench Press)                   [ เลือกท่านี้ ] |  |
|  | อุปกรณ์: ดัมเบล | ความตรงจุด: 100% (Horizontal Push)                         |  |
|  | 💡 น้ำหนักแนะนำ: ~30-32 กก./ข้าง (แปลงจากบาร์เบล 80 กก.)                       |  |
|  +-----------------------------------------------------------------------------+  |
|  | 🔹 เชสต์เพรส แมชชีน (Chest Press Machine)                    [ เลือกท่านี้ ] |  |
|  | อุปกรณ์: แมชชีน | ความตรงจุด: 95% (ข้อต่อปลอดภัย ล็อคโฟกัส)                     |  |
|  | 💡 น้ำหนักแนะนำ: ~75-80 กก. (Pin #6)                                        |  |
|  +-----------------------------------------------------------------------------+  |
|  | 🔹 อินไคลน์ สมิธ แมชชีน เพรส (Incline Smith Press)            [ เลือกท่านี้ ] |  |
|  | อุปกรณ์: สมิธแมชชีน | ความตรงจุด: 90% (เน้นอกบน วิถีบาร์ตรง)                    |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
|  ตัวเลือกการแปลงข้อมูลเซ็ต:                                                          |
|  [✓] คงจำนวนเซ็ตและน้ำหนักที่ปรับสัดส่วนแล้วไว้ (Preserve existing set structure)      |
|  [ ยกเลิก ]                                              [ ยืนยันการสลับท่า (44px) ] |
+-----------------------------------------------------------------------------------+
```

### 3.3 UI Specifications & Micro-interactions
- **Touch Target Standard:**
  - ปุ่ม `[ 🔄 สลับท่า ]` และทุกปุ่มเลือกท่าทดแทน มีความสูงขั้นต่ำ `min-h-[44px]` รองรับการสัมผัสด้วยนิ้วมือในสภาพเหงื่อออก
- **Neobrutalism Visual Tokens:**
  - Modal Container: `bg-paper border-4 border-plate rounded-3xl p-4 sm:p-6 shadow-[0_12px_40px_rgba(30,34,32,0.35)] max-w-lg w-full max-h-[90vh] flex flex-col`
  - Substitute Cards: `bg-white border-2 border-plate rounded-2xl p-3 sm:p-4 mb-2.5 shadow-[2px_2px_0px_#1e2220] hover:translate-x-[1px] hover:translate-y-[1px] transition-all`
  - Filter Chips: `min-h-[40px] px-3 py-1.5 rounded-xl border-2 border-plate font-mono text-xs font-bold transition-colors select-none`
    - สถานะ Active: `bg-flame text-white border-plate shadow-[2px_2px_0px_#1e2220]`
    - สถานะ Inactive: `bg-surface-low text-ink hover:bg-surface border-plate/60`
- **Strict Accessibility Compliance:**
  - ห้ามใช้คลาส `text-ink-muted/80` ให้ใช้ `text-ink-muted` หรือ `text-ink`
  - ห้ามใช้คลาส `focus:outline-none` ให้ใช้ `focus-visible:ring-2 focus-visible:ring-plate` เสมอ

---

## 4. สัญญา API และ Database Schema (Backend Specifications)

### 4.1 Database Migration (Safe SQLite WAL)
สร้างตารางใหม่เพื่อเก็บความต้องการท่าสำรองส่วนตัวของผู้ใช้ (User-configured favorite substitutions) โดยไม่แตะต้องตารางประวัติการซ้อมเดิม:

```sql
-- เพิ่มใน server/db.js (ปลอดภัย 100% ไม่กระทบตารางเดิม)
CREATE TABLE IF NOT EXISTS exercise_substitutions (
  exercise_id TEXT NOT NULL,
  substitute_id TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  notes TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (exercise_id, substitute_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_substitutions_exercise_id 
  ON exercise_substitutions(exercise_id);
```

### 4.2 API Contracts

#### Endpoint 1: ดึงรายการท่าทดแทนที่แนะนำสำหรับท่าฝึก
- **Route:** `GET /api/exercises/:id/substitutes`
- **Query Parameters:**
  - `equipment` *(optional)*: ฟิลเตอร์เฉพาะอุปกรณ์ เช่น `dumbbell`, `cable`, `machine`
- **Path Parameter:** `id` (string เช่น `barbell_bench_press`)
- **Success Response (200 OK):**
```json
{
  "exerciseId": "barbell_bench_press",
  "name": "Barbell Bench Press",
  "muscleGroup": "chest",
  "equipment": "barbell",
  "substitutes": [
    {
      "id": "incline_dumbbell_press",
      "name": "Incline Dumbbell Press",
      "muscleGroup": "chest",
      "equipment": "dumbbell",
      "isCustom": false,
      "matchScore": 95,
      "matchReason": "กล้ามเนื้ออกกลุ่มเดียวกัน (อกบน-กลาง) ดัมเบลช่วยขยายระยะยืด",
      "weightRatio": 0.40,
      "ratioExplanation": "แนะนำใช้น้ำหนักประมาณ 40% ของบาร์เบลต่อข้าง",
      "isUserFavorite": true
    },
    {
      "id": "chest_press_machine",
      "name": "Chest Press Machine",
      "muscleGroup": "chest",
      "equipment": "machine",
      "isCustom": false,
      "matchScore": 92,
      "matchReason": "กล้ามเนื้ออกระนาบตรง วิถีเครื่องปลอดภัยสูง",
      "weightRatio": 0.95,
      "ratioExplanation": "แนะนำใช้น้ำหนักใกล้เคียงบาร์เบลเดิม",
      "isUserFavorite": false
    },
    {
      "id": "cable_crossover",
      "name": "Cable Crossover",
      "muscleGroup": "chest",
      "equipment": "cable",
      "isCustom": false,
      "matchScore": 85,
      "matchReason": "แรงตึงเคเบิลคงที่ เน้นการบีบโฟกัส",
      "weightRatio": 0.30,
      "ratioExplanation": "แนะนำใช้น้ำหนักเบาลงเพื่อเน้นฟอร์มการหุบแขน",
      "isUserFavorite": false
    }
  ]
}
```
- **Edge Case (ท่าฝึกที่ไม่พบ):** ตอบกลับ `200 OK` พร้อม `substitutes: []` อย่างปลอดภัย ไม่คืนค่า 500

#### Endpoint 2: บันทึก/ปักหมุดท่าทดแทนโปรดส่วนตัว
- **Route:** `POST /api/exercises/:id/substitutes`
- **Request Body (JSON):**
```json
{
  "substituteId": "incline_dumbbell_press",
  "priority": 1,
  "notes": "ท่าสำรองเบอร์ 1 เวลาแร็คบาร์เบลเต็ม"
}
```
- **Validation:**
  - `substituteId` ต้องเป็นสตริงที่ไม่ว่าง
  - `priority` เป็นตัวเลขจำนวนเต็มบวก
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "บันทึกท่าทดแทนโปรดเรียบร้อยแล้ว",
  "record": {
    "exerciseId": "barbell_bench_press",
    "substituteId": "incline_dumbbell_press",
    "priority": 1,
    "notes": "ท่าสำรองเบอร์ 1 เวลาแร็คบาร์เบลเต็ม"
  }
}
```

#### Endpoint 3: ลบท่าทดแทนโปรดส่วนตัว
- **Route:** `DELETE /api/exercises/:id/substitutes/:substituteId`
- **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "ลบรายการท่าทดแทนเรียบร้อยแล้ว"
}
```

---

## 5. การแบ่งหน้าที่ไฟล์พัฒนา (Separation of Concerns)

| ทีมผู้รับผิดชอบ | ไฟล์ที่สร้างใหม่ / ไฟล์ที่แก้ไข | วัตถุประสงค์และขอบเขตงาน |
| :--- | :--- | :--- |
| **Backend ⚙️** | `server/exercise-substitutes.js` *(สร้างใหม่)* | Logic คำนวณความตรงจุดของท่าทดแทนตามกลุ่มกล้ามเนื้อ, สูตร Weight Conversion Ratio, ผสานท่าโปรดจาก SQLite |
| **Backend ⚙️** | `server/db.js` *(แก้ไขเฉพาะส่วน CREATE TABLE)* | เพิ่มตาราง `exercise_substitutions` แบบ `CREATE TABLE IF NOT EXISTS` |
| **Backend ⚙️** | `server/server.js` *(แก้ไขเฉพาะการ Mount Route)* | Mount เส้นทาง `GET /api/exercises/:id/substitutes`, `POST /api/exercises/:id/substitutes`, และ `DELETE` |
| **Frontend 🎨** | `src/composables/useExerciseSubstitutes.js` *(สร้างใหม่)* | Composable สำหรับดึงท่าทดแทน, จัดการตัวกรองอุปกรณ์, คำนวณแปลงน้ำหนักเซ็ต, และสั่งสลับท่าใน Active Workout |
| **Frontend 🎨** | `src/components/ExerciseSubstitutionModal.vue` *(สร้างใหม่)* | หน้าต่าง Neobrutalism Modal แสดงตัวกรองอุปกรณ์, การ์ดท่าทดแทนพร้อมคำอธิบาย, และตัวเลือกแปลงเซ็ต |
| **Frontend 🎨** | `src/components/ExerciseCard.vue` *(แก้ไขเฉพาะแทรกปุ่มสลับท่า)* | เพิ่มปุ่ม `[ 🔄 สลับท่า ]` ในแถบควบคุมบนหัวการ์ด และเปิด Modal เมื่อคลิก |
| **QA Test 🧪** | `test/test-exercise-substitutes-api.js` *(สร้างใหม่)* | Automated Unit & Integration Tests ตรวจสอบ API การดึงท่าสำรอง, การกรองอุปกรณ์, การคำนวณอัตราส่วนน้ำหนัก, และความปลอดภัยของ DB |

---

## 6. แผนการทดสอบอัตโนมัติ (Automated QA Test Plan)

ชุดทดสอบใน `test/test-exercise-substitutes-api.js` รันผ่าน Guarded Runner (`npm run test:chain`) ภายใต้เงื่อนไขห้ามแตะฐานข้อมูลจริง `data/gym.db`:

1. **Test 1: Default Substitutes Retrieval by Muscle Group:**
   - เรียก `GET /api/exercises/barbell_bench_press/substitutes`
   - ตรวจสอบว่าทุกท่าที่ตอบกลับมามี `muscleGroup === 'chest'` และมี `weightRatio > 0`
2. **Test 2: Equipment Filter Accuracy:**
   - เรียก `GET /api/exercises/barbell_bench_press/substitutes?equipment=dumbbell`
   - ตรวจสอบว่าทุกท่าที่ตอบกลับมี `equipment === 'dumbbell'`
3. **Test 3: Add & Fetch Custom Favorite Substitute:**
   - ส่ง `POST /api/exercises/barbell_bench_press/substitutes` ปักหมุด `incline_dumbbell_press`
   - ดึง `GET` ซ้ำ ตรวจสอบว่า `isUserFavorite === true`
4. **Test 4: Delete Custom Substitute:**
   - ส่ง `DELETE /api/exercises/barbell_bench_press/substitutes/incline_dumbbell_press`
   - ตรวจสอบว่าการบันทึกถูกลบออกอย่างสมบูรณ์
5. **Test 5: Graceful Handling for Non-Existent Exercise:**
   - เรียก `GET /api/exercises/non_existent_exercise/substitutes`
   - ต้องตอบกลับ `200 OK` พร้อม `substitutes: []` ไม่ทำให้ Express Server แครช
6. **Test 6: Database Isolation & Integrity:**
   - ยืนยันว่าตารางหลัก `workout_sessions`, `session_sets`, `exercise_setup_notes` ไม่ถูกดัดแปลง Schema

---

## 7. เกณฑ์ความสำเร็จที่วัดได้ (Acceptance Criteria)

- [ ] บนการ์ดท่าฝึก (`ExerciseCard.vue`) มีปุ่ม `[ 🔄 สลับท่า ]` ที่มีความสูงขั้นต่ำ 44px
- [ ] เมื่อกดปุ่ม จะเปิด `ExerciseSubstitutionModal.vue` แสดงท่าทดแทนที่ตรงกับกลุ่มกล้ามเนื้อของท่านั้นทันที
- [ ] มีแถบฟิลเตอร์เลือกอุปกรณ์ (บาร์เบล, ดัมเบล, เคเบิล, แมชชีน, บอดี้เวท) ที่ตอบสนองในระดับมิลลิวินาที
- [ ] มีการแสดงอัตราส่วนน้ำหนักแนะนำเมื่อสลับอุปกรณ์ (เช่น บาร์เบล -> ดัมเบล แนะนำ ~40% ต่อน้ำหนักแต่ละข้าง)
- [ ] สามารถสลับท่าฝึกในเซสชันได้โดยไม่ทำให้เซ็ตที่บันทึกแล้วสูญหาย
- [ ] ปราศจากคลาสที่ทำให้ Accessibility พัง (`text-ink-muted/80`, `focus:outline-none`)
- [ ] รัน `npm run test:chain` ผ่าน 100% ทุกเคสโดยไม่เกิด Side-effect หรือเขียนทับฐานข้อมูล `data/gym.db`

---
*เอกสารนี้พร้อมให้ทีม GYM Manager 👔 ใช้ส่งต่องานแก่ทีม Frontend, Backend และ QA เพื่อเริ่มพัฒนาในรอบถัดไปได้ทันที*
