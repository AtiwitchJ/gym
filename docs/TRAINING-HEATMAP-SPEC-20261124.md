# GYM Manager — 12-Month Training Consistency Heatmap (v1.14.0)

> ผู้เขียน: GYM Manager 👔 (RE/QA/FE/BE โดน Gemini individual quota รอบนี้ จึงวิเคราะห์และพัฒนาแทน)
> วันที่: 24 พฤศจิกายน 2026
> เป้าหมาย: ปิด Parity Gap ด้าน Analytics ที่ Hevy / Strong มี แต่ GYM ยังไม่มี — **ภาพรวมความสม่ำเสมอรายปี**

---

## 1. ช่องว่าง (Parity Gap)

`TrainingCalendarCard` แสดงเฉพาะ **ตารางรายเดือน** พร้อมสตรีคต่อสัปดาห์ ผู้ใช้ sees ไม่เห็นภาพรวม 12 เดือนว่าฝึกต่อเนื่องแค่ไหน วันไหนในสัปดาห์ที่ฝึกบ่อยที่สุด หรือเดือนไหนที่ทำได้มากสุด

- **Hevy:** Training calendar + workout frequency analytics แบบ heatmap รายปี
- **Strong:** Workout history พร้อม consistency streak และ graf ความถี่
- **FitNotes:** ไม่มี → GYM จะเหนือกว่าในจุดนี้

## 2. สิ่งที่สร้าง (1 iteration slice)

- `server/training-heatmap.js` — pure analytics: aggregated day cells, intensity levels 0–4, current/best streak, weekday + monthly distribution
- `GET /api/training-heatmap?days=365` — อ่านข้อมูลจาก `repo.getHistory()` ที่มีอยู่แล้ว **ไม่สร้าง/alter ตารางใด** (zero DB migration)
- `src/composables/useTrainingHeatmap.js` + `src/components/TrainingHeatmapCard.vue` — mount ใน `ProfileView.vue` ต่อจาก `CardioCard`
- `test/test-training-heatmap.js` + `test/test-training-heatmap-api.js`

## 3. สัญญา API

`GET /api/training-heatmap` → 200 เสมอ (แม้ไม่มีประวัติ)

```json
{
  "range": { "start": "2025-11-25", "end": "2026-11-24", "days": 365 },
  "leadingBlanks": 1,
  "weeks": [[null, { "date": "2025-11-25", "sessions": 0, "sets": 0, "volumeKg": 0, "level": 0 }, "..."]],
  "days": [{ "date": "2026-11-24", "sessions": 1, "sets": 2, "volumeKg": 1300, "level": 1 }],
  "summary": {
    "totalSessions": 3, "totalSets": 4, "totalVolumeKg": 1300,
    "activeDays": 3, "totalDays": 365, "coveragePct": 0.8,
    "currentStreakDays": 2, "bestStreakDays": 2,
    "lastActiveDate": "2026-11-24", "mostActiveDate": "2026-11-24",
    "avgSetsPerActiveDay": 1.3
  },
  "weekdayDistribution": [{ "day": 0, "labelTh": "จ.", "sessions": 1, "sets": 2 }],
  "monthlyDistribution": [{ "month": "2026-11", "labelTh": "พ.ย. 2569", "sessions": 3, "sets": 4 }]
}
```

- `?days=` ถูก clamp ให้อยู่ในช่วง 30–365 วัน; ค่าไม่ถูกต้อง fallback เป็น 365
- เซ็ต `warm`/`warmup` และเซ็ตที่ยังไม่ติ๊กdone ถูกตัดออกจาก `sets` และ `volumeKg`
- วันที่ผิดรูปแบบ / อยู่นอก window ถูกรวม (ignored) ไม่ทำให้ endpoint ล่ม

## 4. Accessibility & Design

- `role="region"` + `aria-label`, `role="alert"`, `role="status"`, `role="img"` บนเซลล์พร้อม aria-label ระบุวัน/เซ็ต
- ปุ่มรีเฟรช `min-h-[44px] min-w-[44px]` + `touch-manipulation`
- ไม่ใช้สีอย่างเดียว — มี legend ข้อความ "ไม่ได้ฝึก → ฝึกหนักขึ้น"
- ฟอนต์ขั้นต่ำ `text-[11px]`; หลีกเลี่ยง `focus:outline-none`, `text-ink-muted/80`

## 5. ความเสี่ยง / Rollback

ไม่มี schema migration — เป็น read-only derivation จาก `workout_sessions` + `session_sets` ที่มีอยู่แล้ว ลบไฟล์/route/component/card ออกได้ทันทีโดยไม่กระทบข้อมูล Production มี backup DB ก่อน deploy อยู่แล้ว (`gym.db.backup_pre_43a3821`)
