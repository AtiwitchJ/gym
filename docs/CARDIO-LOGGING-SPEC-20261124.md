# GYM Manager — Cardio Session Logging & Weekly Summary (v1.13.0)

> ผู้เขียน: GYM Manager 👔 (RE/QA โดน Gemini individual quota รอบนี้ จึงวิเคราะห์และเขียนสเปกแทน)
> วันที่: 24 พฤศจิกายน 2026
> เป้าหมาย: ปิด Parity Gap ที่ Strong และ Hevy มี แต่ GYM ยังไม่มีเลย — **การบันทึกคาร์ดิโอ (Cardio Logging)**

---

## 1. ช่องว่าง (Parity Gap)

แอป GYM ปัจจุบันครอบคลุมการยกน้ำหนักครบทุกมิติ (PR, e1RM, Volume Landmarks, Strength Standards, Recovery, Deload ฯลฯ) แต่ยัง**ไม่มีช่องทางบันทึกการออกกำลังกายแบบคาร์ดิโอเลย** (วิ่ง / เดิน / ปั่น / พาย / ว่าย / HIIT)

- **Hevy:** มีโหมด Cardio แยกจาก Strength บันทึกเวลา ระยะทาง แคลอรี และแยกสถิติรายสัปดาห์
- **Strong:** มี Cardio logging พร้อม summary รายสัปดาห์
- **FitNotes:** ไม่มี → GYM จะเหนือกว่าในจุดนี้

## 2. สิ่งที่จะสร้าง (1 iteration slice)

- ตาราง `cardio_sessions` ใหม่ (ไม่แตะตารางเดิม — additive migration, rollback ได้ด้วย DROP TABLE)
- `server/cardio.js`: pure validation + weekly summary (MET-based calorie estimation เมื่อผู้ใช้ไม่กรอกแคลอรี)
- `GET /api/cardio`, `POST /api/cardio`, `DELETE /api/cardio/:id`
- `src/composables/useCardio.js` + `src/components/CardioCard.vue` (mount ใน `ProfileView.vue`)
- ทดสอบ pure logic + HTTP contract + UI wiring

## 3. สัญญา API

`GET /api/cardio` → 200
```json
{
  "sessions": [{ "id": 1, "date": "2026-11-24", "type": "run", "durationMin": 30,
                 "distanceKm": 5.2, "calories": 310, "note": "", "createdAt": "..." }],
  "summary": {
    "weekStart": "2026-11-23", "weekEnd": "2026-11-29",
    "thisWeek": { "sessions": 3, "totalMinutes": 90, "totalDistanceKm": 15.6, "totalCalories": 900 },
    "lastWeek": { "...": "..." },
    "delta": { "sessions": 1, "totalMinutes": 20, "totalDistanceKm": 2.1, "totalCalories": 120 },
    "byType": [{ "id": "run", "labelTh": "วิ่ง", "icon": "🏃", "sessions": 3, "...": "..." }],
    "allTime": { "...": "..." }
  }
}
```

- `POST /api/cardio` → 201 พร้อม `{ session, summary }`; input ไม่ถูกต้อง → 400 (ห้าม 500)
- `DELETE /api/cardio/:id` → 200 พร้อม `{ deleted: true, summary }`, ไม่พบ → 404

## 4. Accessibility & Design

- ปุ่มทุกปุ่ม `min-h-[44px] min-w-[44px]` + `touch-manipulation`
- `role="region"` + `aria-label`, `role="status"`, `role="alert"`
- ไม่ใช้สีอย่างเดียว — มีป้ายข้อความกำกับเสมอ
- หลีกเลี่ยงคลาสต้องห้าม: `focus:outline-none`, `text-ink-muted/80`, ฟอนต์ < `text-[11px]`

## 5. ความเสี่ยง / Rollback

ตารางใหม่ไม่กระทบข้อมูลเดิม — `DROP TABLE cardio_sessions` คืนสถานะได้ทันที Production มี backup DB ก่อน deploy อยู่แล้ว (`gym.db.backup_pre_daf212c`)
