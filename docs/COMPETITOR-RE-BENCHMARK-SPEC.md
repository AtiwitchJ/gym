# 🕵️‍♂️ GYM Competitor Reverse Engineering & Benchmark Specification
> **Document:** Competitor Analysis, Feature Breakdown & Engineering Specs for GYM Application  
> **Target System:** `/Users/up-mac/wokrspace/mind/gym`  
> **Prepared by:** GYM Competitor RE 🕵️‍♂️  
> **Recipients:** GYM Manager 👔, GYM Frontend / UXUI 🎨, GYM Backend ⚙️, GYM QA Test 🧪  
> **Date:** November 2026  

---

## 1. Executive Summary & Benchmark Matrix

ในการวิเคราะห์เปรียบเทียบแอปพลิเคชันสาย Fitness / Workout Tracking ชั้นนำของโลก 3 เจ้าตลาด (**Strong**, **Hevy**, **FitNotes**) ควบคู่กับแอปสาย Hypertrophy เฉพาะทาง (**RP Hypertrophy** ของ Dr. Mike Israetel) เพื่อนำจุดแข็งทางสถาปัตยกรรมและ UX มายกระดับ **GYM App** ของเรา (Vue 3 + Tailwind CSS + SQLite WAL) ได้ผลการวิเคราะห์เปรียบเทียบดังนี้:

| Feature Dimension | Strong | Hevy | FitNotes | GYM App (ปัจจุบัน) | GYM App (เป้าหมายหลังอัปเกรด) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Plate Calculator** (เครื่องคำนวณแผ่นเหล็ก) | ✓ (มี Visual Barbell Sleeve, ล็อคใน Pro) | ✓ (มี Visual Sleeve + Bottom Sheet คลีน) | — (มีแต่ Text List แบบธรรมดา) | — (ยังไม่มี ต้องคำนวณในใจ) | **✓ (Visual Sleeve SVG + Quick Bar Switch + 1-Tap Apply)** |
| **Smart Rest Timer** (จับเวลาพักอัจฉริยะ) | ✓ (Auto-start, เสียงปี๊บ, ดรอปดาวน์) | ✓ (Floating Widget ทั่วแอป, เสียงสังเคราะห์) | ✓ (Timer Popup พื้นฐาน) | ✓ (Dock Bar ด้านล่าง, Auto-start เมื่อติ๊กเซ็ต) | **✓ (Floating Pill + Quick ±30s + Web Audio Multi-tone chime)** |
| **Muscle Fatigue / Recovery** | — (ไม่มี มีแค่วัด Volume กราฟเส้น) | ✓ (Heatmap รูปคน หน้า-หลัง, คิดตามเวลา 48-72h) | — (ไม่มี มีแค่ประวัติแยกตามส่วน) | — (มีแสดงส่วนกล้ามเนื้อ แต่ยังไม่มีระบบฟื้นตัว) | **✓ (Muscle Readiness Matrix + 48-72h Decay Algorithm)** |
| **RPE / RIR Tracking** (วัดความหนักเซ็ต) | ✓ (มี RPE 6-10 scale) | ✓ (มี RPE/RIR + คำนวณ e1RM) | — (ใส่ได้แค่โน้ตทั่วไป) | — (มีคำแนะนำ +2/-2kg จาก Reps) | **✓ (RIR 0–4 Button Bar + Dynamic e1RM Engine)** |
| **Offline-First & Local DB** | ✓ (Local SQLite / Realm) | ✓ (IndexedDB / Local-first) | ✓ (Local SQLite เพียวๆ) | ✓ (SQLite WAL + Draft State Isolation) | **✓ (SQLite WAL + PWA Service Worker Cache)** |

---

## 2. Deep-Dive Reverse Engineering Analysis

### 2.1 Feature 1: Barbell Plate Calculator (เครื่องคำนวณแผ่นเหล็ก)
#### การทำงานของคู่แข่ง (Strong & Hevy):
* **Barbell Presets:** มีให้เลือกน้ำหนักบาร์มาตรฐาน ได้แก่:
  - Olympic Barbell: 20 kg (45 lbs)
  - Women's Olympic Bar: 15 kg (35 lbs)
  - EZ-Curl Bar: 10 kg (22 lbs)
  - Trap Bar / Hex Bar: 25 kg (55 lbs)
  - Smith Machine Bar (Counterbalanced): 7 kg หรือ 11 kg
* **Plate Inventory Model:** ผู้ใช้สามารถกำหนดแผ่นเหล็กที่มีในยิมได้ เช่น มีแผ่น `25, 20, 15, 10, 5, 2.5, 1.25 kg` หรือจำกัดจำนวนคู่ของแต่ละแผ่น
* **Algorithm (Greedy Allocation per Side):**
  $$\text{Target Side Weight} = \frac{\text{Target Weight} - \text{Bar Weight}}{2}$$
  - ทำการค้นหาแผ่นเหล็กที่ใหญ่ที่สุดที่ค่าน้อยกว่าหรือเท่ากับ Target Side Weight
  - ตรวจสอบจำนวนแผ่นคงเหลือในคลัง แล้วหักลบออก
  - หากเหลือน้ำหนักเศษที่ไม่สามารถจัดแผ่นลงตัวได้ แจ้งเตือน Delta เศษที่ขาด/เกิน (เช่น "เหลือเศษ 0.5 kg")
* **UI/UX Pattern:**
  - แสดงภาพจำลองปลายแกนบาร์เบล (Sleeve) ในแนวนอน
  - แสดงแผ่นเหล็กเรียงจากด้านใน (ติด Collar) ไปด้านนอกด้วยแผ่นใหญ่ไปเล็ก
  - ใช้สีมาตรฐานสากล (IWF Standard): **25kg = แดง (Red)**, **20kg = น้ำเงิน (Blue)**, **15kg = เหลือง (Yellow)**, **10kg = เขียว (Green)**, **5kg = ขาว (White)**, **2.5kg = แดงเล็ก**, **1.25kg = โครเมียม/เขียวเล็ก**

#### จุดบกพร่องของคู่แข่งที่ GYM App จะทำได้ดีกว่า:
1. Strong ซ่อนฟังก์ชัน Custom Plate ไว้หลัง Paywall (Pro) → ของเราเปิดฟรีและตั้งค่าง่าย
2. Hevy ต้องกดเปิด Bottom Sheet ซ้อนหลายชั้น → ของเราเชื่อมปุ่ม Plate Calc เข้ากับ **PinKeypad.vue** โดยตรง 1-tap เปิดดูและกดปุ่ม "ใช้ค่าน้ำหนักนี้" ได้ทันที

---

### 2.2 Feature 2: Smart Rest Timer (ระบบจับเวลาพักเซ็ตอัจฉริยะ)
#### การทำงานของคู่แข่ง:
* **Trigger Mechanism:** เมื่อผู้ใช้กดติ๊กถูก (✓) ว่าเล่นเซ็ตนั้นจบ จะเริ่มนับถอยหลังทันที (Auto-start)
* **Default Duration per Exercise Type:**
  - ท่า Compound หนัก (Squat, Deadlift, Bench Press): 120s – 180s
  - ท่า Isolation / Machine (Bicep Curl, Lateral Raise): 60s – 90s
  - วอร์มอัพเซ็ต: 45s – 60s
* **Audio & Haptic Feedback:**
  - 3 วินาทีสุดท้าย: สัญญาณเตือนสั้น (Beep... Beep... Beep...)
  - วินาทีที่ 0: สัญญาณเตือนยาวต่อเนื่อง 2 ครั้ง + Haptic Vibration รูปแบบหนัก (Pattern: `[250, 100, 250]`)
* **Background Audio & Drift Prevention:**
  - เมื่อย่อหน้าจอเบราว์เซอร์บนมือถือ `setInterval` จะถูก Browser Throttling ช้าลง คู่แข่งแก้ปัญหาโดยใช้ `targetEndTime = Date.now() + durationMs` แล้วคำนวณ Delta เสมอเมื่อเปิดหน้าจอขึ้นมาใหม่

#### จุดแข็งของ GYM App ปัจจุบัน และจุดที่ต้องเติมเต็ม:
* ปัจจุบันเรามี `useTimer.js` และ `RestTimer.vue` ซึ่งทำ Timestamp Delta และ Web Audio Synth ไว้แล้ว
* **สิ่งที่ต้องเพิ่ม:** ปุ่มด่วน `+30s` / `-15s` เพื่อปรับเวลาขณะเหนื่อยโดยไม่ต้องกดหยุด, เสียงเตือน 3 วินาทีก่อนหมดเวลา, และการจำระยะเวลาพักรายท่า (Per-exercise rest preset)

---

### 2.3 Feature 3: Muscle Fatigue & Recovery Indicator
#### การทำงานของคู่แข่ง (Hevy & RP Hypertrophy):
* **Hevy Recovery Model:**
  - ใช้แบบจำลองเวลาฟื้นตัว 48–72 ชั่วโมงแบบ Linear/Exponential Decay:
    $$\text{Recovery \%} = \min\left(100, \frac{\text{Hours Elapsed since last trained}}{48 \text{ to } 72} \times 100\right)$$
  - แบ่งระดับเป็น 3 สเตตัส:
    - `0% – 49%`: **Fatigued (เมื่อยล้า/กำลังซ่อมแซม)** 🔴
    - `50% – 84%`: **Recovering (เริ่มฟื้นตัว)** 🟡
    - `85% – 100%`: **Optimal / Ready to Train (พร้อมซ้อมเต็มที่)** 🟢
* **RP Hypertrophy Method:**
  - Dr. Mike Israetel ชี้ว่าการฟื้นตัวไม่ได้ขึ้นกับเวลาอย่างเดียว แต่ขึ้นกับ **จำนวนเซ็ตจริง (Working Sets)** และ **RIR**:
  - ท่ากล้ามเนื้อมัดใหญ่ (ขา, หลัง) ฟื้นตัวช้ากว่า (48–72 ชม.)
  - ท่ากล้ามเนื้อมัดเล็ก (ไหล่ข้าง, แขน, น่อง) ฟื้นตัวเร็วกว่า (24–36 ชม.)

---

### 2.4 Feature 4: RPE / RIR Tracker (Rate of Perceived Exertion / Reps In Reserve)
#### การทำงานของคู่แข่ง:
* **RIR (Reps In Reserve):** จำนวนครั้งที่รู้สึกว่า "ยังยกไหวอีกกี่ครั้งก่อนหมดแรงจริง"
  - `RIR 0` (RPE 10): ยกต่อไม่ได้แม้แต่ครั้งเดียว (Absolute Failure)
  - `RIR 1` (RPE 9): เหลือแรงอีกแค่ 1 ครั้ง
  - `RIR 2` (RPE 8): เหลือแรงอีก 2 ครั้ง (Hypertrophy Sweet Spot)
  - `RIR 3+` (RPE 7 หรือต่ำกว่า): สบายเกินไปสำหรับเซ็ตจริง
* **Estimated 1RM (e1RM) Formula:**
  สูตรดัดแปลงจาก Epley & Brzycki ร่วมกับ RIR:
  $$\text{Effective Reps} = \text{Actual Reps} + \text{RIR}$$
  $$\text{e1RM} = \text{Weight} \times \left(1 + \frac{\text{Effective Reps}}{30}\right)$$
  *ตัวอย่าง:* ยก 80 kg ได้ 8 ครั้ง โดยมี RIR 2 (เทียบเท่าฝืนได้ 10 ครั้ง) → $e1RM = 80 \times (1 + \frac{10}{30}) = 80 \times 1.333 = 106.6\text{ kg}$

---

## 3. High-Impact Engineering Specifications for GYM App

เราคัดเลือก **3 ฟีเจอร์ที่มี Impact สูงสุด** ต่อประสบการณ์ผู้ใช้งานจริงในยิม เพื่อให้ทีม Frontend และ Backend พัฒนาได้ทันที:

---

### 📐 SPEC 1: Barbell Plate Calculator Modal (`PlateCalculatorModal.vue` & `usePlateCalculator.js`)

#### 1.1 วัตถุประสงค์ (Objective)
สร้างหน้าต่าง Modal ช่วยคำนวณแผ่นน้ำหนักสำหรับท่า Barbell พร้อมภาพจำลอง Sleeve สไตล์บาร์เบลโอลิมปิก สีสันตามมาตรฐานสากล สามารถเรียกใช้จาก `PinKeypad.vue` และแสดงผลเรียงแผ่นเหล็กต่อข้างได้อย่างถูกต้อง

#### 1.2 Frontend Composable Architecture (`src/composables/usePlateCalculator.js`)
```javascript
import { ref, computed } from 'vue';

export const BAR_PRESETS = [
  { id: 'olympic_20', name: 'บาร์มาตรฐาน (Olympic)', weight: 20 },
  { id: 'olympic_15', name: 'บาร์สตรี / เทคนิค', weight: 15 },
  { id: 'ez_curl_10', name: 'บาร์หยัก (EZ-Curl)', weight: 10 },
  { id: 'trap_bar_25', name: 'บาร์หกเหลี่ยม (Trap Bar)', weight: 25 },
  { id: 'smith_machine_11', name: 'สมิทแมชชีน (Smith)', weight: 11 }
];

export const AVAILABLE_PLATES = [
  { weight: 25, color: '#DC2626', textColor: '#FFFFFF', name: '25 kg', widthClass: 'w-7 sm:w-8 h-28 sm:h-32' },
  { weight: 20, color: '#2563EB', textColor: '#FFFFFF', name: '20 kg', widthClass: 'w-6 sm:w-7 h-28 sm:h-32' },
  { weight: 15, color: '#EAB308', textColor: '#000000', name: '15 kg', widthClass: 'w-5 sm:w-6 h-24 sm:h-28' },
  { weight: 10, color: '#16A34A', textColor: '#FFFFFF', name: '10 kg', widthClass: 'w-5 sm:w-5 h-20 sm:h-24' },
  { weight: 5,  color: '#FFFFFF', textColor: '#1E2220', name: '5 kg',  widthClass: 'w-4 sm:w-4 h-16 sm:h-18', border: true },
  { weight: 2.5,color: '#DC2626', textColor: '#FFFFFF', name: '2.5',   widthClass: 'w-3.5 sm:w-3.5 h-12 sm:h-14' },
  { weight: 1.25,color: '#16A34A', textColor: '#FFFFFF', name: '1.25', widthClass: 'w-3 sm:w-3 h-10 sm:h-11' }
];

export function calculatePlates(targetTotalWeight, barWeight = 20) {
  const target = parseFloat(targetTotalWeight) || 0;
  if (target <= barWeight) {
    return {
      success: true,
      perSideWeight: 0,
      platesPerSide: [],
      remainder: 0,
      achievedTotal: barWeight
    };
  }

  let sideTarget = (target - barWeight) / 2;
  let currentRemainder = sideTarget;
  const allocatedPlates = [];

  for (const plate of AVAILABLE_PLATES) {
    while (currentRemainder >= plate.weight - 0.001) {
      allocatedPlates.push(plate);
      currentRemainder = Math.round((currentRemainder - plate.weight) * 100) / 100;
    }
  }

  const achievedSide = allocatedPlates.reduce((sum, p) => sum + p.weight, 0);
  const achievedTotal = barWeight + achievedSide * 2;

  return {
    success: true,
    targetWeight: target,
    barWeight,
    perSideWeight: achievedSide,
    platesPerSide: allocatedPlates,
    remainder: Math.round(currentRemainder * 100) / 100,
    achievedTotal
  };
}
```

#### 1.3 UI Visual Sleeve Layout
- สัดส่วน Barbell Sleeve ทำด้วย Tailwind CSS:
  - ฝั่งซ้ายคือ Collar กั้นแผ่น (`bg-stone-700 w-3 h-36 rounded-l`)
  - แกนบาร์ (`bg-stone-400 h-6`)
  - แผ่นเหล็กซ้อนกันจากในไปนอกพร้อมตัวเลขอ่านง่าย
  - Badge แจ้งสรุป: เช่น `แต่ละข้าง: 20kg x 2, 5kg x 1 (รวมบาร์ 20kg = 70kg)`

---

### ⏱️ SPEC 2: Smart Rest Timer Enhancements (`useTimer.js` & `RestTimer.vue`)

#### 2.1 วัตถุประสงค์
อัปเกรดตัวจับเวลาพักเซ็ตให้มีความยืดหยุ่น เพิ่มปุ่มปรับแต่งความเร็ว `+30s` / `-15s`, เพิ่มสัญญาณเตือน 3-2-1 Countdown Chime, และป้องกันปัญหา Background tab throttling บนมือถือ

#### 2.2 Audio Synthesizer Engine (Web Audio API)
ไม่ต้องพึ่งพาไฟล์เสียง mp3 ภายนอก ใช้ Web Audio API สร้าง Chime 2 สเตจ:
1. **Pre-warning (3, 2, 1 วินาทีสุดท้าย):** โน้ตความถี่สูงสั้น 660 Hz (E5) ยาว 80ms
2. **Time's Up (0 วินาที):** คอร์ดคู่ 880 Hz (A5) สลับ 1046 Hz (C6) ยาว 300ms + Haptic `navigator.vibrate([200, 100, 200])`

#### 2.3 Quick Controls Interface
- ปุ่ม `+30s` (เมื่อรู้สึกยังหายใจไม่ทัน ต้องการพักเพิ่ม)
- ปุ่ม `-15s` (เมื่อพร้อมเล่นก่อนเวลา)
- ปุ่ม `Skip / Reset` สำหรับเริ่มเซ็ตใหม่ทันที

---

### 📊 SPEC 3: RIR (Reps In Reserve) Logging & e1RM Calculator

#### 3.1 วัตถุประสงค์
เพิ่มการบันทึกระดับความพยายาม (RIR: 0 ถึง 4+) ในแต่ละเซ็ต เพื่อนำมาประเมินความล้าสะสม คำนวณขีดจำกัดความแข็งแรงสูงสุด (Estimated 1RM) และวิเคราะห์สภาวะกล้ามเนื้อฟื้นตัว

#### 3.2 Database Schema Migration (SQLite `server/db.js`)
```sql
-- Migration: เพิ่มคอลัมน์ rir ใน session_sets และ exercise_last_weights
ALTER TABLE session_sets ADD COLUMN rir INTEGER DEFAULT NULL;
ALTER TABLE exercise_last_weights ADD COLUMN rir INTEGER DEFAULT NULL;
```

#### 3.3 Formula & Logic Implementation (`src/composables/useRpeAdvisor.js`)
```javascript
/**
 * คำนวณ Estimated 1RM จากน้ำหนัก, จำนวนครั้ง และค่า RIR
 * @param {number} weight - น้ำหนักที่ยก (กก.)
 * @param {number} reps - จำนวนครั้งที่ยกสำเร็จ
 * @param {number|null} rir - จำนวนครั้งที่เหลือในถัง (0-4)
 * @returns {number} ค่าประมาณการ 1RM (กก.)
 */
export function calculateEstimated1RM(weight, reps, rir = 0) {
  const w = parseFloat(weight) || 0;
  const r = parseInt(reps, 10) || 0;
  const reserve = rir !== null && rir !== undefined ? parseInt(rir, 10) : 0;
  
  if (w <= 0 || r <= 0) return 0;
  
  // Effective reps = ครั้งที่ยกจริง + ครั้งสำรอง
  const effectiveReps = r + reserve;
  
  // Brzycki / Epley Hybrid Formula
  const e1rm = w * (1 + effectiveReps / 30);
  return Math.round(e1rm * 10) / 10;
}
```

#### 3.4 UI Integration ใน `PinKeypad.vue`
- ในโหมดกรอกจำนวนครั้ง (Reps Mode) หรือแถบ RIR Selector:
  - มีปุ่มแท็บลอย 4 ตัวเลือก: `RIR 0 (หมดแรง)`, `RIR 1 (อีก 1 ครั้ง)`, `RIR 2 (พอดี)`, `RIR 3+ (เบา)`
  - เมื่อผู้ใช้เลือก ระบบจะบันทึกลง Draft State อัตโนมัติ

---

## 4. Implementation Roadmap for Teams

### สำหรับ GYM Backend ⚙️
1. เพิ่มคอลัมน์ `rir` ในฐานข้อมูล `server/db.js` ผ่าน Safe `ALTER TABLE`
2. อัปเดต `repo.saveSession` ให้รับและบันทึกฟิลด์ `rir` ของแต่ละเซ็ต
3. รองรับการดึงข้อมูลสถิติ e1RM สูงสุดผ่าน endpoint `/api/history`

### สำหรับ GYM Frontend / UXUI 🎨
1. ติดตั้ง Composable `usePlateCalculator.js` และสร้างคอมโพเนนต์ `PlateCalculatorModal.vue`
2. เชื่อมโยงปุ่มไอคอนบาร์เบล/แผ่นเหล็กใน `PinKeypad.vue`
3. เพิ่มปุ่ม `+30s` / `-15s` ใน `RestTimer.vue` และเสียงเตือน 3-2-1
4. สร้าง Badge แสดง `e1RM` เล็กๆ ใน `ExerciseCard.vue`

### สำหรับ GYM QA Test 🧪
1. เพิ่ม Unit Test สำหรับ `calculatePlates` (กรณีเลขคู่, เลขคี่, น้ำหนักต่ำกว่าบาร์, เศษทศนิยม 1.25/2.5)
2. เพิ่ม Unit Test สำหรับ `calculateEstimated1RM` และการคงอยู่ของค่า `rir` ใน Draft state / SQLite

---
*เอกสารนี้จัดทำโดย GYM Competitor RE 🕵️‍♂️ เพื่อเป็น Blueprint อ้างอิงอย่างเป็นทางการสำหรับทีมพัฒนา GYM Application*
