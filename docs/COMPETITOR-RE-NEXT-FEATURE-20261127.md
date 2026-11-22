# GYM Competitor RE — Next Feature Specification (2026-11-27)

> ฟีเจอร์: **PR Records Timeline & Set Records** (ประวัติสถิติส่วนตัวและตารางสถิติต่อจำนวนครั้ง)
> ผู้เขียน: GYM Manager 👔 ( RE ถูกบล็อกจาก network issue ของ provider รอบนี้ จึงรับหน้าที่วิเคราะห์แทน )
> หลักฐาน: Hevy Help Centre — Personal Records (PRs) and Set Records Explained; Hevy Features — Track Exercise Performance; Strong/Hevy comparison (setgraph.app, 2026)

---

## 1. ช่องว่าง (Parity Gap)
แอปมี PR detection แบบคำนวณ e1RM อยู่แล้ว (`server/exercise-stats.js` → ใช้ใน monthly summary และ progression chart) แต่ผู้ใช้**ไม่มีหน้าที่รวมสถิติของท่านั้น** เช่น น้ำหนักสูงสุด ever, e1RM ดีที่สุด, เซ็ต volume สูงสุด, จำนวนครั้งสูงสุด และตาราง "น้ำหนักสูงสุดต่อจำนวนครั้ง (Set Records)" แบบที่ Hevy แยกไว้ต่างหากจากกราฟ

คู่แข่ง:
- Hevy แสดง heaviest weight / best 1RM / best set volume / best session volume และตาราง Set Records แยกต่างหาก พร้อมแจ้งเตือนเมื่อทำ PR ใหม่
- Strong เน้น PR + e1RM + กราฟรายท่าเป็นฟีเจอร์หลัก

## 2. สิ่งที่จะสร้าง (1 iteration slice)
คอมโพเนนต์ `PRRecordsModal.vue` ที่เปิดจากการ์ดท่า แสดง:
- การ์ดสถิติหลัก 4 แบบ: heaviest weight, best e1RM, best set volume, most reps
- ตาราง Set Records: น้ำหนักสูงสุดที่ทำได้สำหรับแต่ละจำนวนครั้ง (1, 2, 3, …)
- Timeline เหตุการณ์ทำ PR ใหม่ (date, ประเภท, ค่าใหม่, ค่าเดิม) เรียงวันที่ล่าสุดก่อน
- ปุ่ม 44px สำหรับเปิด/ปิด และสไตล์ Neobrutalism ตามธีม

## 3. สัญญา API (ล็อกให้ตรงกัน)
- `GET /api/exercises/:id/records` → 200
  ```json
  {
    "exerciseId": "barbell_bench_press",
    "records": {
      "heaviestWeight": { "value": 100, "date": "2026-11-20", "sessionId": "..." },
      "bestE1rm": { "value": 112.5, "date": "2026-11-20", "sessionId": "..." },
      "bestSetVolume": { "value": 800, "date": "2026-11-20", "sessionId": "..." },
      "mostReps": { "value": 12, "date": "2026-10-15", "sessionId": "..." }
    },
    "setRecords": [ { "reps": 1, "weight": 100, "date": "2026-11-20" }, ... ],
    "timeline": [ { "date": "2026-11-20", "type": "bestE1rm", "value": 112.5, "previousValue": 108, "sessionId": "..." } ]
  }
  ```
- ไม่มีประวัติ → 200 พร้อม `records: {}`, `setRecords: []`, `timeline: []` (ห้าม 404/แครช)
- คำนวณจาก `workout_sessions` + `session_exercises` + `session_sets` ที่มีอยู่แล้ว **ไม่สร้างตารางใหม่** ความเสี่ยง regression ต่ำสุด
- ใช้ completed working sets เท่านั้น (ตัด warmup ด้วย `isWarmupSet` จาก `server/exercise-stats.js`)

## 4. การแบ่งไฟล์ (คนละชุด ไม่ทับกัน)
| ฝ่าย | ไฟล์ |
| --- | --- |
| Backend ⚙️ | `server/pr-records.js` (ใหม่), `server/server.js` (mount route เดียว) |
| Frontend 🎨 | `src/composables/usePrRecords.js` (ใหม่), `src/components/PRRecordsModal.vue` (ใหม่), `src/components/ExerciseHistoryModal.vue` (เพิ่มปุ่มเปิด) |
| QA 🧪 | `test/test-pr-records-api.js` (ใหม่), `package.json` (เพิ่ม test:chain-steps ต่อท้าย) |

## 5. แผนเทสต์ (guarded runner, ห้ามแตะ data/gym.db)
1. ไม่มีประวัติ → 200 โครงสร้างว่าง
2. seed 3 เซสชัน (มี warm/pause ปน) → ตัวเลขสถิติตรงเฉพาะ working sets
3. ตาราง setRecords เรียง reps ASC และน้ำหนักเป็นค่าสูงสุดต่อ reps
4. timeline เรียง date DESC และ previousValue ตรงสถิติก่อนหน้า
5. schema ตารางหลักไม่เปลี่ยน; sha256 data/gym.db ไม่เปลี่ยน

## 6. Accessibility
ห้ามใช้ `text-ink-muted/30|40|60|80`, `text-ink-faint`, `text-[8px|9px|10px]`, `focus:outline-none` (test/test-contrast.js สแกนทุกไฟล์ src/); ใช้ `text-ink-muted` ธรรมดา
