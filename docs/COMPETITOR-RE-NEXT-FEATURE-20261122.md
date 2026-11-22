# 🕵️‍♂️ GYM Competitor Reverse Engineering — Next Feature Specification
> **Document:** Next High-Impact Feature Blueprint: Training Calendar & Consistency Streak  
> **Target System:** `/Users/up-mac/wokrspace/mind/gym` (Vue 3 + Tailwind CSS + SQLite WAL)  
> **Prepared by:** GYM Competitor RE 🕵️‍♂️  
> **Recipients:** GYM Manager 👔, GYM Frontend / UXUI 🎨, GYM Backend ⚙️, GYM QA Test 🧪  
> **Date:** 22 พฤศจิกายน 2026  
> **File:** `docs/COMPETITOR-RE-NEXT-FEATURE-20261122.md`  

---

## 1. Executive Summary: ฟีเจอร์ที่เลือกและเหตุผล (Why This Feature)

### 1.1 ชื่อฟีเจอร์
**Training Calendar & Consistency Streak (ปฏิทินบันทึกการฝึกซ้อมและตัวชี้วัดความสม่ำเสมอ Streak)**

### 1.2 บริบทปัจจุบันของ GYM App
โปรเจกต์ GYM พัฒนาฟีเจอร์หลักในห้องซ้อมจนทัดเทียมคู่แข่งในระดับ Core In-Workout Mechanics ไปแล้ว ได้แก่:
- Plate Calculator พร้อมระบบคลังแผ่นต่อยิม (Custom Plate Inventory + Gym Profiles)
- Smart Rest Timer ปรับเวลาต่อท่าใน SQLite (+30s/-15s, 3-2-1 Chime, Notification)
- RIR 0–4 + Dynamic e1RM + useWeightAdvisor ปรับน้ำหนักตามผลงาน
- Muscle Recovery Panel (48–72h Decay) + Weekly Volume Chart
- Monthly Summary สรุปผลงานประจำเดือน
- Body Weight Tracker บันทึกน้ำหนักตัวและวิเคราะห์แนวโน้มรายวัน

### 1.3 ช่องว่างสำคัญที่สุดที่ยังขาด (The Parity Gap)
ในหน้า `HistoryView.vue` ปัจจุบันมีเพียง **Infinite List ของ Session ย้อนหลัง** ที่เรียงตามวันเวลา:
1. **ขาดภาพรวมรายเดือน (No Calendar Visualization):** ผู้ใช้ไม่สามารถมองเห็นปฏิทินรายเดือนได้ว่า "ในสัปดาห์นี้หรือเดือนนี้ เราเข้ายิมวันไหนบ้าง พักวันไหนบ้าง" หากต้องการดูการซ้อมสัปดาห์ก่อน ต้องใช้วิธีเลื่อน Scroll หาในการ์ดยาวๆ
2. **ขาดกลไกขับเคลื่อนความสม่ำเสมอ (No Habit & Retention Loop):** การสร้างกล้ามเนื้อและรักษาวินัยขึ้นอยู่กับความต่อเนื่อง (Consistency) แอปคู่แข่งทุกเจ้าใช้ **Streak System** เป็นแรงจูงใจทางจิตวิทยาหลัก แต่ GYM App ยังไม่มีตัวนับสัปดาห์ต่อเนื่อง (🔥 Streak) หรือตัววัดเป้าหมายรายสัปดาห์ (Weekly Target Progress: เช่น 3/4 วัน)

---

## 2. หลักฐานและการ Reverse-Engineer จากแอปคู่แข่ง (Competitor Breakdown)

| Competitor | ชื่อฟีเจอร์ของคู่แข่ง | พฤติกรรม UX และการทำงานของระบบ | แหล่งอ้างอิง |
| :--- | :--- | :--- | :--- |
| **Hevy** | **Workout Calendar & Weekly Streak** | • แสดง Monthly Calendar Grid บนโปรไฟล์และหน้าหลัก<br>• วันที่เข้าซ้อมจะขึ้นเป็นวงกลมสีสดใส (แสดงไอคอนท่า/กลุ่มกล้ามเนื้อ)<br>• ด้านบนมี Streak Banner: `🔥 Current Streak: X Weeks`<br>• แทร็กเป้าหมาย `3 of 4 workouts completed this week`<br>• แตะวันที่บนปฏิทินเพื่อกรองดู Session วันนั้นทันที | hevyapp.com / Official Product Overview & Help Center |
| **FitNotes** | **Core Calendar Interface** | • ใช้ Monthly Calendar เป็นหน้าหลักของแอปทั้งระบบ (Calendar-first navigation)<br>• แต่ละวันมี Dot/Badge สีตามหมวดหมู่วันซ้อม (Day 1/2/3/4)<br>• ผู้ใช้เห็นความสม่ำเสมอและความถี่ในการซ้อมของทั้งเดือนได้ในพริบตาเดียว | fitnotesapp.com / User Guide |
| **Strong** | **Calendar View in History** | • มีปุ่มสลับระหว่าง List View กับ Calendar View ในแท็บ History<br>• จุด Heatmap แสดงความหนาแน่นของการซ้อมในแต่ละสัปดาห์<br>• ช่วยให้ค้นหาประวัติย้อนหลังตามวันที่ได้รวดเร็วโดยไม่ต้องเลื่อนหน้าจอ | strongapp.io / Features & Support |

### จุดแข็งที่ GYM App จะทำได้ดีกว่าคู่แข่ง:
1. **ไม่ต้องพึ่งพาคลาวด์หรือเน็ต:** ข้อมูลทั้งหมดคำนวณจากตาราง `workout_sessions` ใน SQLite ในเครื่องแบบ Local-First 100% เร็วกว่าแอปที่ต้องรอโหลด API จากคลาวด์
2. **เชื่อมต่อกับโปรโตคอล 4-Day Split ของเราโดยตรง:** แสดงป้ายกำกับว่าวันไหนเล่น Day 1 (Push/Chest), Day 2 (Pull/Back), Day 3 (Legs), Day 4 (Arms/Shoulders) ด้วยสีประจำวันชัดเจน

---

## 3. รายละเอียดสเปกการออกแบบ UX / UI (Neobrutalism Design System)

### 3.1 การจัดวางในหน้าจอ (Screen Placement)
- การ์ดคอมโพเนนต์ใหม่ชื่อ `TrainingCalendarCard.vue`
- วางในตำแหน่งบนสุดของ `src/components/HistoryView.vue` (อยู่เหนือ `VolumeChart.vue` และ `MonthlySummary.vue`) เพื่อเป็น Hero Overview ของแท็บประวัติการฝึก

### 3.2 องค์ประกอบของ Component (Thai Neobrutalism Style)
```
+-----------------------------------------------------------------------+
|  ARCHIVE CALENDAR & STREAK                             [เป้าหมาย: 4 วัน/สัปดาห์ ⚙️] |
|  🔥 ซ้อมต่อเนื่อง 4 สัปดาห์ติด!     สัปดาห์นี้: [✓] [✓] [✓] [ ] (3/4 วัน)     |
+-----------------------------------------------------------------------+
|  < [ เดือนก่อน ]             พฤศจิกายน 2026             [ เดือนถัดไป ] >    |
|                                                                       |
|   จ.       อ.       พ.       พฤ.      ศ.       ส.       อา.           |
|  -------------------------------------------------------------------  |
|  [    ]   [    ]   [    ]   [    ]   [    ]   [    ]   [ 1  ]         |
|  [ 2🏋️]   [ 3  ]   [ 4🏋️]   [ 5  ]   [ 6🏋️]   [ 7  ]   [ 8  ]         |
|  [ 9🏋️]   [ 10 ]   [ 11🏋️]  [ 12 ]   [ 13🏋️]  [ 14 ]   [ 15 ]         |
|  [ 16🏋️]  [ 17 ]   [ 18🏋️]  [ 19 ]   [ 20🏋️]  [ 21 ]   [ 22*] (วันนี้) |
|  [ 23 ]   [ 24 ]   [ 25 ]   [ 26 ]   [ 27 ]   [ 28 ]   [ 29 ]         |
|  [ 30 ]                                                               |
+-----------------------------------------------------------------------+
|  📌 20 พ.ย. 2026: Day 3 ขา & หลังแขน (24 เซ็ต)        [ดูประวัติรอบนี้ ->] |
+-----------------------------------------------------------------------+
```

### 3.3 UI Specifications & Micro-interactions:
- **Card Styling:** `archive-card p-4 sm:p-5 border-4 border-plate rounded-3xl bg-paper shadow-[0_12px_40px_rgba(30,34,32,0.35)]`
- **Streak & Weekly Target Pill:**
  - Badge ไฟสีส้ม: `bg-flame text-white font-mono font-bold px-3 py-1.5 rounded-xl border-2 border-plate shadow-[2px_2px_0px_#1e2220]`
  - ตัวแสดงสถานะสัปดาห์ปัจจุบัน: แสดง 4 วงกลม/กล่องสี่เหลี่ยม (สำหรับเป้า 4 วัน/สัปดาห์) โดยวันที่ฝึกแล้วเป็นสีเขียว `bg-emerald text-white border-plate` และวันที่ยังไม่ได้ฝึกเป็นสีขาว `bg-white border-dashed border-plate/40`
- **ปุ่มเปลี่ยนเดือน (Month Stepper):**
  - ปุ่ม `<` และ `>` ขนาดสัมผัสอย่างน้อย 44px (`min-h-[44px] min-w-[44px]`) พร้อม `active:translate-x-[1px] active:translate-y-[1px]`
- **เซลล์ปฏิทิน (Day Cell):**
  - อัตราส่วนสี่เหลี่ยมจัตุรัส มี Padding พอดีนิ้วสัมผัสบนมือถือจอ 390px
  - **วันที่มีการซ้อม (Trained Day):** พื้นหลัง `bg-emerald/20 border-2 border-emerald text-ink font-bold shadow-[1px_1px_0px_#10b981]` พร้อมสัญลักษณ์ `🏋️` และตัวเลขวันที่เด่นชัด
  - **วันนี้ (Today):** ขอบเน้นสีส้มหนา `ring-2 ring-flame ring-offset-1`
  - **วันพัก (Rest Day):** ตัวเลขสีเทา `text-ink-muted/70 bg-paper-subtle/40 border border-plate/10`
  - **แตะวันที่ซ้อม (Tap Action):** แสดง Card สรุปย่อของวันนั้นด้านล่างปฏิทิน พร้อมปุ่มกดกระโดด Scroll ไปยังการ์ด Session นั้นในประวัติทันที

---

## 4. สัญญา API และ Database Schema (Backend Specifications)

### 4.1 Database Migration (Safe SQLite WAL)
ข้อมูลการซ้อมมีอยู่ในตาราง `workout_sessions` อยู่แล้ว (`id`, `date`, `time`, `day_key`, `day_title`, `total_sets_done`)  
เพื่อรองรับการตั้งเป้าหมายสัปดาห์ ให้เพิ่มตารางเก็บการตั้งค่าแบบปลอดภัย 100%:

```sql
-- เพิ่มใน server/db.js (ปลอดภัย ไม่กระทบข้อมูลเดิม)
CREATE TABLE IF NOT EXISTS user_training_goals (
  id TEXT PRIMARY KEY,                       -- ค่าคงที่ เช่น 'default_user'
  weekly_target_days INTEGER DEFAULT 4,      -- เป้าหมายจำนวนวันฝึกต่อสัปดาห์ (1-7)
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ใส่ค่าเริ่มต้นหากยังไม่มี
INSERT OR IGNORE INTO user_training_goals (id, weekly_target_days) VALUES ('default_user', 4);
```

### 4.2 API Contracts

#### Endpoint 1: ดึงข้อมูลปฏิทินประจำเดือน
- **Route:** `GET /api/calendar/month`
- **Query Parameters:**
  - `year`: ตัวเลข ค.ศ. เช่น `2026` (ค่าเริ่มต้น: ปีปัจจุบัน)
  - `month`: ตัวเลขเดือน `1` ถึง `12` (ค่าเริ่มต้น: เดือนปัจจุบัน)
- **Validation:**
  - `year` ต้องเป็นจำนวนเต็มระหว่าง 2000 – 2100 (หากผิด -> `400 Bad Request`)
  - `month` ต้องเป็นจำนวนเต็มระหว่าง 1 – 12 (หากผิด -> `400 Bad Request`)
- **Success Response (200 OK):**
```json
{
  "year": 2026,
  "month": 11,
  "daysInMonth": 30,
  "firstDayOfWeek": 6,
  "workouts": [
    {
      "date": "2026-11-02",
      "sessionId": "session_1730534400000",
      "dayKey": "day1",
      "dayTitle": "อก & แขน (Chest & Arms)",
      "totalSetsDone": 18
    },
    {
      "date": "2026-11-20",
      "sessionId": "session_1732089600000",
      "dayKey": "day3",
      "dayTitle": "ขา & ไหล่ (Legs & Shoulders)",
      "totalSetsDone": 24
    }
  ],
  "totalWorkoutsThisMonth": 12,
  "totalSetsThisMonth": 216
}
```

#### Endpoint 2: ดึงสถิติความสม่ำเสมอและ Streak
- **Route:** `GET /api/calendar/streak`
- **Success Response (200 OK):**
```json
{
  "currentStreakWeeks": 4,
  "bestStreakWeeks": 7,
  "thisWeekWorkouts": 3,
  "weeklyTarget": 4,
  "isTargetMetThisWeek": false,
  "lastWorkoutDate": "2026-11-20",
  "weeklyHistory": [
    { "weekNumber": 47, "year": 2026, "daysTrained": 3, "targetMet": false },
    { "weekNumber": 46, "year": 2026, "daysTrained": 4, "targetMet": true },
    { "weekNumber": 45, "year": 2026, "daysTrained": 4, "targetMet": true },
    { "weekNumber": 44, "year": 2026, "daysTrained": 4, "targetMet": true }
  ]
}
```

#### Endpoint 3: ปรับเปลี่ยนเป้าหมายจำนวนวันฝึกต่อสัปดาห์
- **Route:** `PUT /api/calendar/target`
- **Request Body:**
```json
{
  "weeklyTarget": 4
}
```
- **Validation:**
  - `weeklyTarget` ต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 7 (หากไม่ใช่ -> `400 Bad Request`)
- **Success Response (200 OK):**
```json
{
  "success": true,
  "weeklyTarget": 4
}
```

---

## 5. การแบ่งหน้าที่ไฟล์พัฒนา (Separation of Concerns)

เพื่อป้องกันการชนกันของโค้ด (Merge Conflicts) และให้ทีมพัฒนาสามารถแยกทำงานอิสระพร้อมกันได้ตามแม่แบบ `BodyWeightCard`:

| ทีมผู้รับผิดชอบ | ไฟล์ที่สร้างใหม่ / ไฟล์ที่แก้ไข | วัตถุประสงค์การทำงาน |
| :--- | :--- | :--- |
| **Backend ⚙️** | `server/calendar.js` *(สร้างใหม่)* | Logic คำนวณวันในเดือน, กรอง Session ตามช่วงเวลา, คำนวณ Streak ต่อเนื่อง และตรวจสอบสัปดาห์ ISO |
| **Backend ⚙️** | `server/db.js` *(แก้ไข)* | เพิ่มตาราง `user_training_goals` (CREATE TABLE IF NOT EXISTS) |
| **Backend ⚙️** | `server/server.js` *(แก้ไข)* | Mount เส้นทาง `/api/calendar/*` เข้ากับ Express App |
| **Frontend 🎨** | `src/composables/useTrainingCalendar.js` *(สร้างใหม่)* | Composable จัดการ State การเลือกเดือน/ปี, Fetch ข้อมูล, สร้าง Matrix ตาราง 7x5 หรือ 7x6 วัน, และแคช LocalStorage |
| **Frontend 🎨** | `src/components/TrainingCalendarCard.vue` *(สร้างใหม่)* | คอมโพเนนต์ UI ปฏิทิน Neobrutalism, Streak Banner, ตัวเลือกเดือน และปุ่มลัด 44px |
| **Frontend 🎨** | `src/components/HistoryView.vue` *(แก้ไข 2-3 บรรทัด)* | นำเข้า `<TrainingCalendarCard />` มาวางไว้ด้านบนสุดของหน้า |
| **QA Test 🧪** | `test/test-calendar-api.js` *(สร้างใหม่)* | ชุดทดสอบครอบคลุม Endpoint ปฏิทิน, Streak Edge cases, Leap year, และ Validation |

---

## 6. แผนการทดสอบอัตโนมัติ (Automated QA Test Plan)

ชุดทดสอบใน `test/test-calendar-api.js` ต้องรันผ่าน Guarded Test Runner (`npm run test:chain`) โดยห้ามแตะฐานข้อมูลจริง `data/gym.db`:

1. **Test 1: Month Endpoint Date Correctness & Leap Year Handling:**
   - ทดสอบเรียกดูเดือน ก.พ. ปีอธิกสุรทิน (Feb 2024 ต้องได้ 29 วัน) และปีปกติ (Feb 2025/2026 ต้องได้ 28 วัน)
   - ตรวจสอบ `firstDayOfWeek` ว่าเริ่มต้นตรงตามวันจริงของสัปดาห์
2. **Test 2: Workout Mapping & Aggregation:**
   - จำลองใส่ข้อมูลใน `workout_sessions` วันที่ 2, 4, 6 พ.ย. 2026
   - ตรวจสอบว่า `GET /api/calendar/month?year=2026&month=11` ส่งกลับ `workouts` ตรงตามวัน และรวม `totalSetsThisMonth` ถูกต้อง
3. **Test 3: Streak Calculation Algorithm:**
   - กรณีไม่มีข้อมูลการซ้อมเลย: `currentStreakWeeks` ต้องเท่ากับ 0
   - กรณีซ้อมครบเป้าหมายต่อเนื่อง 3 สัปดาห์: `currentStreakWeeks` ต้องเท่ากับ 3
   - กรณีหยุดซ้อมข้ามสัปดาห์ (Gap): Streak ต้องถูกรีเซ็ตอย่างถูกต้อง ไม่นับสะสมข้ามสัปดาห์ที่ขาด
   - กรณีซ้อมหลายรอบในวันเดียวกัน: ต้องนับเป็น 1 วันซ้อมสำหรับเป้าหมายวันฝึก ไม่นับเบิ้ล
4. **Test 4: Input Validation & Boundary Checks:**
   - `GET /api/calendar/month?month=13` -> 400 Bad Request
   - `GET /api/calendar/month?year=1999` -> 400 Bad Request
   - `PUT /api/calendar/target` ส่ง `{ weeklyTarget: 8 }` หรือ `{ weeklyTarget: -1 }` -> 400 Bad Request
5. **Test 5: Zero Data Integrity Impact:**
   - ตรวจสอบว่าตารางหลัก `workout_sessions`, `session_exercises`, `session_sets`, `body_weights` ไม่ถูกเปลี่ยนแปลงโครงสร้างเดิมใดๆ ทั้งสิ้น

---

## 7. เกณฑ์ความสำเร็จที่วัดได้ (Acceptance Criteria)

- [ ] ปฏิทินแสดงผลช่องวันตรงกับปฏิทินสากล 100% (วันจันทร์-อาทิตย์ เรียงถูกต้อง)
- [ ] วันที่มีการฝึกซ้อมแสดงไอคอน `🏋️` สีเขียวเด่นชัด พร้อมระบุรหัสวันหรือจำนวนเซ็ต
- [ ] เมื่อแตะวันที่มีการซ้อม สามารถแสดงกล่องสรุปการซ้อมของวันนั้น และคลิกเพื่อนำทางไปยังการ์ดประวัติได้
- [ ] การแสดงผล Streak Banner (🔥) คำนวณตามสัปดาห์จริงและอัปเดตทันทีเมื่อบันทึกการซ้อมเสร็จสิ้น
- [ ] Touch Target ของปุ่มเปลี่ยนเดือนและปุ่มเลือกวันมีขนาดอย่างน้อย 44px บนหน้าจอมือถือ (ผ่านเกณฑ์ Mobile Density)
- [ ] รัน `npm run test:chain` ผ่านทุกเคส 100% ภายในเวลาไม่เกิน 5 วินาที โดยไม่แตะต้องไฟล์ฐานข้อมูลจริง

---
*เอกสารนี้พร้อมให้ทีม Frontend, Backend และ QA ใช้งานเป็นพิมพ์เขียวในการพัฒนาฟีเจอร์รอบนี้ได้ทันที*
