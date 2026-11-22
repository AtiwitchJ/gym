# 🕵️‍♂️ GYM Competitor Reverse Engineering — Next Feature Specification
> **Document:** Next High-Impact Feature Blueprint: Universal Workout Data Import & Export (CSV / JSON)  
> **Target System:** `/Users/up-mac/wokrspace/mind/gym` (Vue 3 + Tailwind CSS + SQLite WAL)  
> **Prepared by:** GYM Competitor RE 🕵️‍♂️  
> **Recipients:** GYM Manager 👔, GYM Frontend / UXUI 🎨, GYM Backend ⚙️, GYM QA Test 🧪  
> **Date:** 24 พฤศจิกายน 2026  
> **File:** `docs/COMPETITOR-RE-NEXT-FEATURE-20261124.md`  

---

## 1. Executive Summary: ฟีเจอร์ที่เลือกและเหตุผล (Why This Feature)

### 1.1 ชื่อฟีเจอร์
**Universal Workout Data Import & Export (ระบบนำเข้าและส่งออกข้อมูลการฝึกสำรอง CSV / JSON รองรับการย้ายค่ายจาก Strong / Hevy)**

### 1.2 บริบทและสถานะฟีเจอร์ที่ส่งมอบแล้วใน GYM App
โปรเจกต์ GYM ได้พัฒนาฟีเจอร์หลักทั้งด้านการฝึกในยิมและการวิเคราะห์ผลงานจนทัดเทียมแอปชั้นนำ ได้แก่:
- Barbell Plate Calculator พร้อมระบบคลังแผ่นต่อยิม (Custom Plate Inventory + Gym Profiles)
- Smart Rest Timer ปรับเวลาต่อท่าใน SQLite (+30s/-15s, 3-2-1 Chime, Notification)
- RIR 0–4 + Dynamic e1RM + useWeightAdvisor ปรับน้ำหนักตาม RIR/Reps
- Muscle Recovery Panel (48–72h Decay) + Weekly Volume Chart
- Monthly Summary สรุปผลงานรายเดือน
- Body Weight Tracker บันทึกน้ำหนักตัวและวิเคราะห์แนวโน้มรายวัน
- Training Calendar & Consistency Streak ปฏิทินรายเดือนและตัวนับสัปดาห์ต่อเนื่อง (🔥)
- Per-Exercise Progression Chart & Strength Curve กราฟเส้นความก้าวหน้ารายท่าพร้อมเส้นเป้าหมาย

### 1.3 ช่องว่างสำคัญที่สุดที่ยังขาด (The Parity Gap)
ใน `TODO.md` และหน้า `HistoryView.vue` ปัจจุบัน:
- **มีเพียงการส่งออกด้านเดียว:** มีปุ่ม `Export Excel (.xlsx)` เพื่อเปิดดูในคอมพิวเตอร์ และปุ่มดาวน์โหลดไฟล์ไบนารี `gym.db`
- **ไม่มีระบบนำเข้าข้อมูล (Zero Import Capability):**
  1. **ความเสี่ยงข้อมูลสูญหาย (Disaster Recovery Risk):** หากผู้ใช้ล้างแคชเบราว์เซอร์บนมือถือ (Safari / Chrome), เปลี่ยนเครื่องใหม่, หรือฐานข้อมูลในเครื่องมีปัญหา ปัจจุบันผู้ใช้ **"ไม่มีทางนำเข้าประวัติการฝึกซ้อมกลับมาได้เลย"** แม้จะมีไฟล์สำรองอยู่ก็ตาม
  2. **กำแพงการย้ายค่าย (Migration Lock-in Barrier):** ผู้เล่นเวทที่เคยใช้แอป Strong, Hevy, หรือ FitNotes มานาน 2–5 ปี ไม่กล้าเปลี่ยนมาใช้ GYM App เพราะไม่อยากทิ้งประวัติการซ้อมและสถิติ PR เดิมของตนเอง การมีระบบแปลงและนำเข้า CSV ของ Strong และ Hevy จะปลดล็อคการใช้งานทันที

---

## 2. หลักฐานและการ Reverse-Engineer จากแอปคู่แข่ง (Competitor Breakdown)

| Competitor | ชื่อฟีเจอร์ของคู่แข่ง | พฤติกรรม UX และการทำงานของระบบ | แหล่งอ้างอิง |
| :--- | :--- | :--- | :--- |
| **Hevy** | **CSV Export & 1-Click Strong Importer** | • เมนู Settings -> "Export Workout Data (CSV)"<br>• เมนู "Import from Strong / Hevy CSV" นำเข้าประวัติทั้งหมดในคลิกเดียว<br>• ใช้ฟีเจอร์นี้เป็น Funnel ดูดผู้ใช้จาก Strong จนเติบโตเป็นอันดับ 1 ในตลาดปัจจุบัน<br>• มีหน้าจอก่อนนำเข้า (Preview): ตรวจจับว่าพบกี่เซสชัน กี่เซ็ต และข้ามรายการที่ซ้ำ | hevyapp.com / Help Center (Import from Strong to Hevy) |
| **Strong** | **Data Export & Import (CSV)** | • Settings -> "Export Data" ส่งออกไฟล์ `strong.csv`<br>• Settings -> "Restore / Import Data" สามารถอัปโหลดไฟล์ CSV เพื่อคืนค่าเซสชันย้อนหลังทั้งหมดได้โดยตรง | strongapp.io / Support (How to backup and restore via CSV) |
| **FitNotes** | **Zero-Lockin Backup & Restore Engine** | • จุดขายที่แข็งแกร่งที่สุดของ FitNotes: ไม่ผูกขาดข้อมูลกับคลาวด์<br>• ส่งออกและนำเข้าผ่าน CSV / SQLite Backup ได้อิสระ<br>• ตรวจสอบ Timestamp เพื่อป้องกันเซสชันซ้ำซ้อน (Idempotent Import) | fitnotesapp.com / Help (Backup & Restore Guide) |

### จุดแข็งที่ GYM App จะทำได้ดีกว่าคู่แข่ง:
1. **Local-First Transactional Import:** ทำงานภายใน SQLite Transaction (`BEGIN TRANSACTION ... COMMIT`) บนเครื่อง 100% หากไฟล์มีปัญหาแถวใดแถวหนึ่ง ระบบจะ Rollback คืนค่าเดิมทันทีโดยไม่ทำให้ฐานข้อมูลเสียหาย
2. **รองรับทั้ง JSON สมบูรณ์ และ CSV มาตรฐานสากล:**
   - **JSON Format:** แบ็กอัปข้อมูลครบทุกมิติ (Sessions, Sets, Body Weights, Gym Profiles, PRs) แบบ Lossless
   - **CSV Format:** รองรับโครงสร้างคอลัมน์มาตรฐานของ Strong, Hevy และ GYM (`Date, Workout Name, Exercise Name, Set Order, Weight, Reps, RIR`)
3. **Smart Deduplication:** ตรวจสอบวันที่และเวลาเซสชัน (`date` + `time`) หากมีอยู่แล้วจะข้ามอัตโนมัติ (Skip existing) ไม่สร้างเซสชันซ้ำซ้อน

---

## 3. รายละเอียดสเปกการออกแบบ UX / UI (Neobrutalism Design System)

### 3.1 ตำแหน่งการแสดงผล (Placement)
- เพิ่มปุ่ม **"นำเข้าข้อมูล (.json / .csv)"** สีส้ม Flame ในการ์ดส่วนหัวของ `src/components/HistoryView.vue` วางคู่กับปุ่ม Export Excel และปุ่มดาวน์โหลด .db
- คลิกแล้วเปิดหน้าต่างโมดอล **`DataBackupModal.vue`**

### 3.2 องค์ประกอบของ Component (Thai Neobrutalism Style)
```
+-----------------------------------------------------------------------+
|  DATA BACKUP & RESTORE · สำรองและกู้คืนข้อมูล                          [✕] |
+-----------------------------------------------------------------------+
|  เลือกฟังก์ชัน:                                                        |
|  [ 📥 นำเข้าข้อมูล (Import) ]         [ 📤 ส่งออกข้อมูลสำรอง (Export) ]   |
+-----------------------------------------------------------------------+
|  📂 ลากและวางไฟล์ที่นี่ หรือแตะเพื่อเลือกไฟล์ (.json, .csv)             |
|  รองรับ: GYM Backup (JSON), Strong App (CSV), Hevy (CSV)              |
+-----------------------------------------------------------------------+
|  📋 ตัวอย่างข้อมูลที่ตรวจพบ (Import Preview):                          |
|  • ประเภทไฟล์: Strong / Hevy CSV                                       |
|  • จำนวนรอบฝึก (Sessions): 18 รอบ                                     |
|  • จำนวนเซ็ตทั้งหมด (Total Sets): 216 เซ็ต                             |
|  • วันที่เริ่มต้น - สิ้นสุด: 1 ส.ค. 2026 - 20 พ.ย. 2026                |
|                                                                       |
|  ตัวเลือกการนำเข้า:                                                   |
|  (●) ข้ามรอบฝึกที่มีอยู่แล้วในเครื่อง (แนะนำ)                             |
|  ( ) นำเข้าทั้งหมด (อาจเกิดรอบซ้ำ)                                    |
+-----------------------------------------------------------------------+
|  [ ยกเลิก ]                        [ ⚡ ยืนยันการนำเข้าข้อมูล (44px) ] |
+-----------------------------------------------------------------------+
```

### 3.3 UI Specifications & Micro-interactions:
- **Card & Modal Styling:**
  - `bg-paper border-4 border-plate rounded-3xl p-5 sm:p-6 shadow-[0_12px_40px_rgba(30,34,32,0.35)] select-none max-w-lg w-full`
- **ปุ่มเลือกโหมดและปุ่มแอคชัน (Buttons):**
  - ปุ่มทุกปุ่มมีขนาดสัมผัสขั้นต่ำ 44px (`min-h-[44px] min-w-[44px] touch-manipulation`)
  - ปุ่มยืนยันการนำเข้า: `bg-emerald hover:bg-emerald/90 text-white font-heading font-extrabold text-sm rounded-xl border-2 border-plate shadow-[3px_3px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px]`
- **Dropzone File Uploader:**
  - พื้นที่ขอบเส้นประหนา 2px `border-2 border-dashed border-plate rounded-2xl p-6 bg-surface text-center hover:bg-paper-dim transition-all cursor-pointer`
  - มีไอคอนโฟลเดอร์ 📂 และข้อความระบุชัดเจนว่ารองรับทั้ง JSON และ CSV
- **Preview & Validation Box:**
  - เมื่อผู้ใช้เลือกไฟล์ จะทำการ Parse ในหน่วยความจำทันทีและแสดงกล่องพรีวิวสรุปข้อมูล
  - หากไฟล์ผิดรูปแบบ จะแสดงข้อความเตือนสีแดงชัดเจน `bg-red-50 border-2 border-red-600 text-red-700 rounded-xl p-3 text-xs` พร้อมปุ่มเลือกไฟล์ใหม่
- **Accessibility & Safe Tailwind Classes:**
  - ไม่ใช้คลาสที่ผิดระเบียบหรือทำให้การทดสอบพัง (ห้ามใช้ `text-ink-muted/80`, ห้ามใช้ `focus:outline-none`)
  - รักษาโฟกัสริงมาตรฐาน `focus-visible:ring-2 focus-visible:ring-plate`

---

## 4. สัญญา API และ Database Schema (Backend Specifications)

### 4.1 Database Migration (Safe SQLite WAL)
ข้อมูลการซ้อมจะถูกนำเข้าลงในตารางหลักเดิม (`workout_sessions`, `session_exercises`, `session_sets`)  
เพื่อเก็บบันทึกประวัติการนำเข้าและป้องกันข้อผิดพลาด ให้เพิ่มตารางบันทึกประวัติการแบ็กอัปแบบปลอดภัย:

```sql
-- เพิ่มใน server/db.js (ปลอดภัย 100% ไม่กระทบตารางเดิม)
CREATE TABLE IF NOT EXISTS backup_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  source_format TEXT NOT NULL,         -- 'json_gym' | 'csv_strong' | 'csv_hevy' | 'csv_gym'
  sessions_count INTEGER DEFAULT 0,
  sets_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success'        -- 'success' | 'failed'
);
```

### 4.2 API Contracts

#### Endpoint 1: ส่งออกข้อมูลสมบูรณ์เป็น JSON (Export Full JSON)
- **Route:** `GET /api/backup/export/json`
- **Success Response (200 OK):**
```json
{
  "version": 1,
  "exportedAt": "2026-11-24T10:00:00.000Z",
  "sessions": [
    {
      "id": "session_1732089600000",
      "date": "2026-11-20",
      "time": "18:30:00",
      "dayKey": "day3",
      "dayTitle": "ขา & หลังแขน (Legs & Triceps)",
      "totalSetsDone": 20,
      "exercises": [
        {
          "exerciseId": "barbell_squat",
          "exerciseName": "บาร์เบล สควอท (Barbell Squat)",
          "category": "ขา",
          "sets": [
            { "setIndex": 0, "type": "work", "target": "6-8", "weight": 100.0, "actualReps": 8, "done": 1, "rir": 2 }
          ]
        }
      ]
    }
  ],
  "bodyWeights": [
    { "date": "2026-11-20", "weight": 72.4, "note": "หลังตื่นนอน" }
  ]
}
```

#### Endpoint 2: นำเข้าข้อมูล (Import Sessions & Sets)
- **Route:** `POST /api/backup/import`
- **Request Body (JSON):**
```json
{
  "format": "json", // หรือ "csv"
  "content": "...",  // payload object กรณี json หรือ string กรณี csv
  "dedupe": true     // true = ข้ามเซสชันที่มีวันที่และเวลาซ้ำกัน, false = นำเข้าทั้งหมด
}
```
- **Validation:**
  - `format` ต้องเป็น `'json'` หรือ `'csv'` (มิฉะนั้นตอบ `400 Bad Request`)
  - `content` ต้องไม่ว่างเปล่า และต้องมีโครงสร้างที่สามารถ Parse ได้
- **Success Response (200 OK):**
```json
{
  "success": true,
  "sessionsImported": 18,
  "setsImported": 216,
  "duplicatesSkipped": 3,
  "bodyWeightsImported": 12
}
```
- **Error Response (400 Bad Request):**
```json
{
  "error": "รูปแบบไฟล์ไม่ถูกต้อง หรือไม่พบข้อมูลเซสชันการฝึกที่รองรับ"
}
```

---

## 5. การแบ่งหน้าที่ไฟล์พัฒนา (Separation of Concerns)

เพื่อให้ทีม Backend, Frontend และ QA ทำงานขนานกันได้อย่างราบรื่นและสามารถจบได้ใน 1 commit ตามระเบียบ:

| ทีมผู้รับผิดชอบ | ไฟล์ที่สร้างใหม่ / ไฟล์ที่แก้ไข | วัตถุประสงค์และขอบเขตงาน |
| :--- | :--- | :--- |
| **Backend ⚙️** | `server/backup.js` *(สร้างใหม่)* | Logic ตัวแปลงไฟล์ (Parser CSV ของ Strong/Hevy/GYM, Parser JSON), การตรวจสอบความถูกต้อง, และการทำ SQLite Transaction นำเข้าข้อมูลแบบ Atomic |
| **Backend ⚙️** | `server/db.js` *(แก้ไขเฉพาะส่วน CREATE TABLE)* | เพิ่มตาราง `backup_logs` ปลอดภัยแบบ `CREATE TABLE IF NOT EXISTS` |
| **Backend ⚙️** | `server/server.js` *(แก้ไขเฉพาะการ Mount Route)* | Mount เส้นทาง `GET /api/backup/export/json` และ `POST /api/backup/import` |
| **Frontend 🎨** | `src/composables/useDataBackup.js` *(สร้างใหม่)* | Composable จัดการอ่านไฟล์ (FileReader API), แปลงพรีวิวสรุปข้อมูล, ส่งเรียก API นำเข้า, และดาวน์โหลดไฟล์ JSON สำรอง |
| **Frontend 🎨** | `src/components/DataBackupModal.vue` *(สร้างใหม่)* | คอมโพเนนต์ UI โมดอลนำเข้า/ส่งออกสไตล์ Neobrutalism, Dropzone, ตารางพรีวิวก่อนนำเข้า, และปุ่มสัมผัส 44px |
| **Frontend 🎨** | `src/components/HistoryView.vue` *(แก้ไข 2-3 บรรทัด)* | เพิ่มปุ่ม "นำเข้าข้อมูล" ในการ์ดส่วนหัว และเชื่อมโยงเปิด `DataBackupModal.vue` |
| **QA Test 🧪** | `test/test-backup-api.js` *(สร้างใหม่)* | ชุดทดสอบอัตโนมัติรันผ่าน Runner ปลอดภัย ตรวจสอบการส่งออก JSON, การนำเข้า CSV (Strong/Hevy format), การข้ามข้อมูลซ้ำ, และการ Rollback เมื่อไฟล์พัง |

---

## 6. แผนการทดสอบอัตโนมัติ (Automated QA Test Plan)

ชุดทดสอบใน `test/test-backup-api.js` ต้องรันผ่าน Guarded Runner (`npm run test:chain`) โดยห้ามแตะฐานข้อมูลจริง `data/gym.db`:

1. **Test 1: Full JSON Export & Re-import Roundtrip:**
   - จำลองใส่ข้อมูลใน `workout_sessions`, `session_exercises`, `session_sets`, `body_weights`
   - เรียก `GET /api/backup/export/json` ตรวจสอบความครบถ้วนของโครงสร้าง
   - นำผลลัพธ์ยิงกลับไปที่ `POST /api/backup/import` ด้วย `dedupe: true` ตรวจสอบว่าระบบรายงาน `duplicatesSkipped` ถูกต้อง
2. **Test 2: Strong / Hevy CSV Parser & Ingestion:**
   - ป้อนสตริง CSV จำลองฟอร์แมต Strong: `Date,Workout Name,Exercise Name,Set Order,Weight,Reps,RPE`
   - ป้อนสตริง CSV จำลองฟอร์แมต Hevy: `Date,Workout Name,Exercise Title,Set Type,Weight (kg),Reps,RIR`
   - ตรวจสอบว่าระบบสามารถระบุคอลัมน์และสร้างเรคคอร์ดใน `workout_sessions` และ `session_sets` ได้ถูกต้องครบถ้วน
3. **Test 3: Transactional Rollback on Malformed Data:**
   - จำลองยิง Payload ที่มีข้อมูลเสียอยู่ตรงกลาง (เช่น เซ็ตที่ค่าน้ำหนักไม่ใช่ตัวเลข หรือฟิลด์สำคัญขาดหาย)
   - ตรวจสอบว่า API ตอบกลับ `400 Bad Request` และฐานข้อมูลถูก Rollback ข้อมูลไม่มีการบันทึกค้างคาแม้แต่แถวเดียว
4. **Test 4: Input Validation & Boundary Checks:**
   - ส่ง Request Body ว่างเปล่า `{}` หรือ `{ format: 'unknown' }` -> ต้องตอบกลับ `400 Bad Request`
5. **Test 5: Zero Data Integrity Impact:**
   - ตรวจสอบว่าตารางหลัก `workout_sessions`, `exercise_rest`, `gym_profiles`, `user_training_goals`, `exercise_goals` ยังคงรักษา Schema เดิม 100%

---

## 7. เกณฑ์ความสำเร็จที่วัดได้ (Acceptance Criteria)

- [ ] ผู้ใช้สามารถกดปุ่ม "นำเข้าข้อมูล" จากหน้าประวัติ (`HistoryView.vue`) เพื่อเปิดโมดอลนำเข้าได้
- [ ] สามารถเลือกไฟล์ `.json` หรือ `.csv` (รองรับไฟล์ส่งออกจาก Strong และ Hevy) แล้วแสดงกล่องพรีวิวจำนวนเซสชันและเซ็ตได้อย่างถูกต้องก่อนกดยืนยัน
- [ ] เมื่อกดยืนยัน ข้อมูลเซสชัน ท่าฝึก และเซ็ตถูกบันทึกลงใน SQLite และหน้าประวัติรีเฟรชแสดงเซสชันที่นำเข้าได้ทันที
- [ ] ตัวเลือก Deduplication ข้ามเซสชันที่มีวันที่และเวลาตรงกับในเครื่อง ป้องกันการบันทึกซ้ำซ้อน
- [ ] ทุกปุ่มสัมผัสมีขนาดขั้นต่ำ 44px บนจอมือถือ (390px viewport) และใช้คลาสสีตามมาตรฐาน Neobrutalism
- [ ] ไม่ใช้คลาส accessibility ที่ผิดระเบียบ (`text-ink-muted/80`, `focus:outline-none`)
- [ ] รัน `npm run test:chain` ผ่านทุกเคส 100% ภายในเวลาไม่เกิน 5 วินาที โดยไม่แตะต้องไฟล์ฐานข้อมูลจริง

---
*เอกสารนี้พร้อมให้ทีม Frontend, Backend และ QA ใช้งานเป็นพิมพ์เขียวในการพัฒนาฟีเจอร์รอบนี้ได้ทันที*
