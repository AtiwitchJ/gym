# 🕵️‍♂️ GYM Competitor Reverse Engineering — Next Feature Specification
> **Document:** Next High-Impact Feature Blueprint: Persistent Exercise Machine Setup & Form Cues  
> **Target System:** `/Users/up-mac/wokrspace/mind/gym` (Vue 3 + Tailwind CSS + SQLite WAL)  
> **Prepared by:** GYM Competitor RE 🕵️‍♂️  
> **Recipients:** GYM Manager 👔, GYM Frontend / UXUI 🎨, GYM Backend ⚙️, GYM QA Test 🧪  
> **Date:** 25 พฤศจิกายน 2026  
> **File:** `docs/COMPETITOR-RE-NEXT-FEATURE-20261125.md`  

---

## 1. Executive Summary: ฟีเจอร์ที่เลือกและเหตุผล (Why This Feature)

### 1.1 ชื่อฟีเจอร์
**Persistent Exercise Machine Setup & Form Cues (ระบบบันทึกตำแหน่งเครื่อง พินเบาะ และคิวฟอร์มประจำท่าแบบคงอยู่ข้ามเซสชัน)**

### 1.2 บริบทและสถานะฟีเจอร์ที่ส่งมอบแล้วใน GYM App
โปรเจกต์ GYM พัฒนาระบบติดตามการฝึกครอบคลุมฟังก์ชันหลักทั้งหมดแล้ว ได้แก่:
- Barbell Plate Calculator + คลังแผ่นต่อยิม (Custom Plate Inventory + Gym Profiles)
- Smart Rest Timer ปรับเวลาต่อท่าใน SQLite (+30s/-15s, 3-2-1 Chime, Notification)
- RIR 0–4 + Dynamic e1RM + useWeightAdvisor ปรับน้ำหนักตามผลงาน
- Muscle Recovery Panel (48–72h Decay) + Weekly Volume Chart
- Monthly Summary สรุปผลงานรายเดือน
- Body Weight Tracker บันทึกน้ำหนักตัวและวิเคราะห์แนวโน้มรายวัน
- Training Calendar & Consistency Streak ปฏิทินรายเดือนและตัวนับสัปดาห์ต่อเนื่อง (🔥)
- Per-Exercise Progression Chart & Strength Curve กราฟเส้นความก้าวหน้ารายท่าพร้อมเส้นเป้าหมาย
- Universal Workout Data Import & Export JSON/CSV รองรับ Strong และ Hevy

### 1.3 ช่องว่างสำคัญที่สุดที่ยังขาดในห้องฝึกซ้อมจริง (The Parity Gap)
ในห้องยิมจริง ปัญหาคลาสสิกที่เกิดขึ้น **ทุกครั้งที่เดินไปถึงเครื่อง Machine, ม้านั่ง (Bench), หรือสายเคเบิล (Cable)** คือ:
1. **ลืมตำแหน่งการปรับตั้งเครื่อง (Machine Setup Amnesia):** เครื่องเล่นแต่ละยิมมีระดับรูพิน (Pin height), มุมเอียงเบาะ (Bench incline notch), และระยะความกว้างของด้ามจับไม่เท่ากัน การจำว่าคราวที่แล้วปรับเบาะเบอร์อะไร พินเบอร์ไหน สำหรับท่าฝึกกว่า 20 ท่าเป็นไปไม่ได้ในทางปฏิบัติ
2. **คิวการเคลื่อนไหวเฉพาะบุคคล (Personal Form Cues):** นักกีฬาทุกคนมีจุดโฟกัสประจำตัวที่ครูฝึกเตือนหรือที่ตนเองสังเกตพบ เช่น *"อย่ากางศอกเกิน 45 องศา"*, *"วางส้นเท้าติดขอบล่าง"*, *"หนีบสะบักก่อนถอนบาร์"*
3. **สถานะปัจจุบันใน GYM App:** ใน `ExerciseCard.vue` มีเพียงข้อความบรรยายท่าภาษาอังกฤษแบบคงที่จาก `defaultExercises.js` (เช่น "Flat bench press with barbell...") แต่ผู้ใช้ **"ไม่สามารถจดหรือแก้ไขโน้ตส่วนตัวต่อท่าฝึกได้เลย"** ขาดฟีเจอร์บันทึกพินเครื่องและคิวฟอร์มที่คงอยู่ถาวรข้ามเซสชัน

---

## 2. หลักฐานและการ Reverse-Engineer จากแอปคู่แข่ง (Competitor Breakdown)

| Competitor | ชื่อฟีเจอร์ของคู่แข่ง | พฤติกรรม UX และการทำงานของระบบ | แหล่งอ้างอิง |
| :--- | :--- | :--- | :--- |
| **Strong** | **Persistent Exercise Notes** | • ใต้ชื่อท่าฝึกในการ์ดซ้อม จะมีปุ่ม/กล่องข้อความ "Note" ขนาดกะทัดรัด<br>• ผู้ใช้พิมพ์บันทึก เช่น `Seat #3, Pin #5, Cue: arch back`<br>• โน้ตนี้จะคงอยู่ถาวร (Persistent) ปรากฏอัตโนมัติทุกครั้งที่เล่นท่านั้นในเซสชันถัดไป<br>• ชูจุดขายใน App Store: *"Never forget your seat height, rack position, or technique cues"* | strongapp.io / Features (Workout Tracking & Exercise Notes) |
| **Hevy** | **Routine / Exercise Note Banner** | • มีปุ่มไอคอน 📝 หรือข้อความแสดงโน้ตอยู่ใต้ชื่อท่าฝึกในการ์ดเซ็ต<br>• เมื่อพิมพ์บันทึก ระบบจะซิงก์และจดจำข้ามสัปดาห์โดยอัตโนมัติ<br>• ช่วยให้นักกีฬาตั้งค่าอุปกรณ์ได้ทันทีภายใน 3 วินาทีแรกที่เดินถึงเครื่อง | hevyapp.com / Help Center (Exercise Notes Guide) |
| **FitNotes** | **Exercise Notes & Comments** | • แตะไอคอนโน้ตข้างชื่อท่า จะเปิดหน้าต่างบันทึกรายละเอียดตำแหน่งเครื่องและเทคนิค<br>• แยกชัดเจนระหว่างโน้ตถาวรประจำท่า (Exercise Note) กับโน้ตเฉพาะเซ็ต (Set Comment) | fitnotesapp.com / Features (Notes and Comments) |

### จุดแข็งที่ GYM App จะทำได้ดีกว่าคู่แข่ง:
1. **แยกฟิลด์ชัดเจน (Dedicated Setup vs Form Cues):** คู่แข่งส่วนใหญ่ให้เป็นกล่องข้อความธรรมดา (Plain Textarea) แต่ GYM App จะมีช่องเฉพาะสำหรับ **"ตำแหน่งเครื่อง/เบาะ (Machine Pin & Seat)"** และ **"คิวฟอร์ม (Form Cue)"** ทำให้อ่านได้ทันทีในพริบตาเดียวบนมือถือ
2. **Local-First & Offline Sync:** บันทึกและแคชใน LocalStorage ทันที และซิงก์ลงตาราง `exercise_setup_notes` ใน SQLite WAL ข้ามอุปกรณ์โดยไม่มีความล่าช้า

---

## 3. รายละเอียดสเปกการออกแบบ UX / UI (Neobrutalism Design System)

### 3.1 ตำแหน่งการแสดงผล (Placement)
- ฝังแถบสรุปย่อ **`ExerciseNotePill`** อยู่ใต้หัวการ์ดท่าฝึกใน `src/components/ExerciseCard.vue` (อยู่เหนือตารางเซ็ต)
- เมื่อแตะแถบนี้ จะเปิดหน้าต่างโมดอลแบบกะทัดรัด **`ExerciseNoteModal.vue`** เพื่อแก้ไขและบันทึก

### 3.2 องค์ประกอบของ Component (Thai Neobrutalism Style)

#### A. มุมมองบนการ์ดท่าฝึก (`ExerciseCard.vue`)
```
+-----------------------------------------------------------------------+
|  ⭐ บาร์เบล เบนช์เพรส (Barbell Bench Press)                [ประวัติ] [ลบ] |
|  [📌 เบาะ #3 · รูพิน #4 · ล็อคสะบักก่อนดัน]               [ ✏️ แก้ไขโน้ต ] |
+-----------------------------------------------------------------------+
|  เซ็ต   เป้าหมาย    น้ำหนัก (กก.)    ครั้งจริง    RIR     สถานะ       |
|  ...                                                                  |
```
- หากยังไม่มีการบันทึกโน้ต จะแสดงปุ่มเบาๆ: `[ + บันทึกพินเครื่อง / ฟอร์มการเล่น ]` (ความสูงขั้นต่ำ 44px)

#### B. หน้าต่างแก้ไขโน้ตประจำท่า (`ExerciseNoteModal.vue`)
```
+-----------------------------------------------------------------------+
|  EXERCISE SETUP & FORM CUES · ตั้งค่าเครื่อง & คิวฟอร์ม                  [✕] |
|  🏋️ บาร์เบล เบนช์เพรส (Barbell Bench Press)                            |
+-----------------------------------------------------------------------+
|  ⚙️ ตำแหน่งอุปกรณ์ / เบาะ / พิน (Machine & Seat Setup):                 |
|  [ เบาะระดับ 3, พินเคเบิลเบอร์ 4, ที่ล็อคขารูที่ 2                   ] |
|                                                                       |
|  💡 คิวฟอร์ม & เทคนิคสำคัญ (Technique & Form Cues):                    |
|  [ บีบสะบักกดลงล่าง, ข้อศอกกาง 45 องศา, ดันระเบิดขึ้น                   ] |
|                                                                       |
|  📝 บันทึกเพิ่มเติม (General Notes):                                    |
|  [ ใช้กริปแบบ Thumbless, ระวังข้อมือซ้ายงอ                             ] |
+-----------------------------------------------------------------------+
|  [ ยกเลิก ]                             [ 💾 บันทึกการตั้งค่า (44px) ] |
+-----------------------------------------------------------------------+
```

### 3.3 UI Specifications & Micro-interactions:
- **Pill Styling บนการ์ด:**
  - `bg-paper-subtle border border-plate/30 rounded-xl px-2.5 py-1.5 flex items-center justify-between text-xs font-mono text-ink shadow-[1px_1px_0px_#1e2220] hover:bg-paper-dim transition-all`
- **Modal Styling:**
  - `bg-paper border-4 border-plate rounded-3xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(30,34,32,0.35)] select-none max-w-md w-full`
- **ปุ่มและช่องกรอก (Inputs & Buttons):**
  - ช่อง Input: `min-h-[44px] w-full px-3 py-2 rounded-xl border-2 border-plate bg-white text-sm font-body text-ink focus-visible:ring-2 focus-visible:ring-plate`
  - ปุ่มบันทึก: `min-h-[44px] px-4 py-2 rounded-xl border-2 border-plate bg-emerald hover:bg-emerald/90 text-white font-heading font-extrabold text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px]`
- **Accessibility & Safe Tailwind Classes:**
  - ไม่ใช้คลาสที่ผิดระเบียบหรือทำให้การทดสอบพัง (ห้ามใช้ `text-ink-muted/80`, ห้ามใช้ `focus:outline-none`)
  - รักษาโฟกัสริงมาตรฐาน `focus-visible:ring-2 focus-visible:ring-plate`

---

## 4. สัญญา API และ Database Schema (Backend Specifications)

### 4.1 Database Migration (Safe SQLite WAL)
สร้างตารางใหม่เพื่อเก็บโน้ตและการตั้งค่าเครื่องรายท่า โดยไม่กระทบตารางเดิม:

```sql
-- เพิ่มใน server/db.js (ปลอดภัย 100% ไม่กระทบตารางเดิม)
CREATE TABLE IF NOT EXISTS exercise_setup_notes (
  exercise_id TEXT PRIMARY KEY,
  pin_setting TEXT DEFAULT '',          -- ข้อความตั้งค่าพิน/เบาะ เช่น "เบาะ #3, พิน #4"
  form_cues TEXT DEFAULT '',            -- ข้อความคิวฟอร์ม เช่น "บีบสะบัก, ศอก 45 องศา"
  general_note TEXT DEFAULT '',         -- บันทึกทั่วไป
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 API Contracts

#### Endpoint 1: ดึงโน้ตประจำท่าฝึก
- **Route:** `GET /api/exercises/:id/note`
- **Path Parameter:** `id` (string เช่น `barbell_bench_press`)
- **Success Response (200 OK — มีข้อมูล):**
```json
{
  "exerciseId": "barbell_bench_press",
  "pinSetting": "เบาะระดับ 3, พินเคเบิลเบอร์ 4",
  "formCues": "บีบสะบักกดลงล่าง, ข้อศอกกาง 45 องศา",
  "generalNote": "ใช้กริปแบบ Thumbless",
  "updatedAt": "2026-11-25T10:00:00.000Z"
}
```
- **Success Response (200 OK — ยังไม่มีข้อมูล):**
```json
{
  "exerciseId": "barbell_bench_press",
  "pinSetting": "",
  "formCues": "",
  "generalNote": "",
  "updatedAt": null
}
```

#### Endpoint 2: บันทึกหรืออัปเดตโน้ตประจำท่าฝึก
- **Route:** `PUT /api/exercises/:id/note`
- **Request Body (JSON):**
```json
{
  "pinSetting": "เบาะระดับ 3, พินเคเบิลเบอร์ 4",
  "formCues": "บีบสะบักกดลงล่าง, ข้อศอกกาง 45 องศา",
  "generalNote": "ใช้กริปแบบ Thumbless"
}
```
- **Validation:**
  - `pinSetting`, `formCues`, `generalNote` ต้องเป็น string ความยาวไม่เกิน 500 ตัวอักษรต่อฟิลด์ (หากเกิน -> `400 Bad Request`)
  - รองรับการล้างข้อมูล (ส่ง string ว่าง `""`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "exerciseId": "barbell_bench_press",
  "note": {
    "pinSetting": "เบาะระดับ 3, พินเคเบิลเบอร์ 4",
    "formCues": "บีบสะบักกดลงล่าง, ข้อศอกกาง 45 องศา",
    "generalNote": "ใช้กริปแบบ Thumbless",
    "updatedAt": "2026-11-25T10:00:00.000Z"
  }
}
```

---

## 5. การแบ่งหน้าที่ไฟล์พัฒนา (Separation of Concerns)

เพื่อให้ทีม Backend, Frontend และ QA ทำงานขนานกันได้อิสระแบบ 1 commit ต่อฟีเจอร์:

| ทีมผู้รับผิดชอบ | ไฟล์ที่สร้างใหม่ / ไฟล์ที่แก้ไข | วัตถุประสงค์และขอบเขตงาน |
| :--- | :--- | :--- |
| **Backend ⚙️** | `server/exercise-notes.js` *(สร้างใหม่)* | Logic ตัวจัดการโน้ตประจำท่า (GET / PUT), ตรวจสอบความยาวตัวอักษร, ทำ Upsert (`ON CONFLICT(exercise_id) DO UPDATE`), และอัปเดต timestamp |
| **Backend ⚙️** | `server/db.js` *(แก้ไขเฉพาะส่วน CREATE TABLE)* | เพิ่มตาราง `exercise_setup_notes` ปลอดภัยแบบ `CREATE TABLE IF NOT EXISTS` |
| **Backend ⚙️** | `server/server.js` *(แก้ไขเฉพาะการ Mount Route)* | Mount เส้นทาง `GET /api/exercises/:id/note` และ `PUT /api/exercises/:id/note` |
| **Frontend 🎨** | `src/composables/useExerciseNotes.js` *(สร้างใหม่)* | Composable จัดการดึงข้อมูล, แคชใน LocalStorage, ตรวจจับการเปลี่ยนแปลง, และส่งซิงก์ API |
| **Frontend 🎨** | `src/components/ExerciseNoteModal.vue` *(สร้างใหม่)* | คอมโพเนนต์ UI โมดอลสไตล์ Neobrutalism, ฟิลด์กรอกพินเบาะ, คิวฟอร์ม, และปุ่มสัมผัส 44px |
| **Frontend 🎨** | `src/components/ExerciseCard.vue` *(แก้ไขเฉพาะแทรก Pill)* | เพิ่มแถบ `ExerciseNotePill` ใต้ชื่อท่าฝึก และเชื่อมโยงเปิด `ExerciseNoteModal.vue` |
| **QA Test 🧪** | `test/test-exercise-notes-api.js` *(สร้างใหม่)* | ชุดทดสอบอัตโนมัติรันผ่าน Runner ปลอดภัย ตรวจสอบ GET ค่าว่าง, PUT บันทึกใหม่, PUT อัปเดตซ้ำ (Upsert), Validation ข้อความยาวเกิน, และความปลอดภัยของ DB |

---

## 6. แผนการทดสอบอัตโนมัติ (Automated QA Test Plan)

ชุดทดสอบใน `test/test-exercise-notes-api.js` ต้องรันผ่าน Guarded Runner (`npm run test:chain`) โดยห้ามแตะฐานข้อมูลจริง `data/gym.db`:

1. **Test 1: Non-existent Exercise Note Retrieval:**
   - เรียก `GET /api/exercises/unknown_exercise/note` ต้องตอบกลับ `200 OK` พร้อมฟิลด์ว่าง `pinSetting: ""`, `formCues: ""`, `generalNote: ""` โดยไม่แครช
2. **Test 2: Create & Upsert Note:**
   - ส่ง `PUT /api/exercises/bench_press/note` ด้วยข้อมูลเบาะและคิวฟอร์ม
   - ตรวจสอบว่า `GET /api/exercises/bench_press/note` ได้ข้อมูลตรงกับที่บันทึก
   - ส่ง `PUT` ซ้ำด้วยข้อความใหม่ ตรวจสอบว่าระบบอัปเดตทับเรคคอร์ดเดิม ไม่เกิด Duplicate Key Error
3. **Test 3: Input Validation & Length Limits:**
   - ส่งข้อความความยาวเกิน 500 ตัวอักษร -> ต้องตอบกลับ `400 Bad Request`
   - ส่ง Request Body ไม่ใช่ JSON หรือไม่มีฟิลด์ที่ถูกต้อง -> ต้องจัดการอย่างปลอดภัย
4. **Test 4: Clearing Notes:**
   - ส่ง `PUT` ด้วยค่าสตริงว่าง `""` ทุกฟิลด์ ตรวจสอบว่าสามารถล้างโน้ตได้สำเร็จ
5. **Test 5: Zero Data Integrity Impact:**
   - ตรวจสอบว่าตารางหลัก `workout_sessions`, `session_sets`, `exercise_rest`, `gym_profiles`, `exercise_goals` ยังคงรักษา Schema เดิม 100%

---

## 7. เกณฑ์ความสำเร็จที่วัดได้ (Acceptance Criteria)

- [ ] บนการ์ดท่าฝึก (`ExerciseCard.vue`) แสดงแถบสรุปพินเครื่องและคิวฟอร์มอย่างกะทัดรัด
- [ ] เมื่อแตะแถบโน้ต จะเปิดหน้าต่าง `ExerciseNoteModal.vue` ให้แก้ไขได้อย่างสะดวก
- [ ] เมื่อบันทึก โน้ตจะปรากฏบนการ์ดท่าฝึกนั้นทันที และคงอยู่ถาวรเมื่อเปิดเซสชันในวันถัดไป
- [ ] รองรับการทำงานแบบ Offline (แคชใน LocalStorage ก่อนซิงก์ SQLite)
- [ ] ทุกปุ่มสัมผัสมีขนาดขั้นต่ำ 44px บนจอมือถือ (390px viewport) และใช้คลาสสีตามมาตรฐาน Neobrutalism
- [ ] ไม่ใช้คลาส accessibility ที่ผิดระเบียบ (`text-ink-muted/80`, `focus:outline-none`)
- [ ] รัน `npm run test:chain` ผ่านทุกเคส 100% ภายในเวลาไม่เกิน 5 วินาที โดยไม่แตะต้องไฟล์ฐานข้อมูลจริง

---
*เอกสารนี้พร้อมให้ทีม Frontend, Backend และ QA ใช้งานเป็นพิมพ์เขียวในการพัฒนาฟีเจอร์รอบนี้ได้ทันที*
