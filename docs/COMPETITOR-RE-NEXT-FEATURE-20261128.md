# 🕵️‍♂️ GYM Competitor Reverse Engineering — Next Feature Specification
> **Document:** Next High-Impact Feature Blueprint: Set Classification & Set Tagging Engine (Normal, Warmup, Drop Set, Failure)  
> **Target System:** `/Users/up-mac/wokrspace/mind/gym` (Vue 3 + Tailwind CSS + SQLite WAL)  
> **Prepared by:** GYM Competitor RE 🕵️‍♂️  
> **Recipients:** GYM Manager 👔, GYM Frontend / UXUI 🎨, GYM Backend ⚙️, GYM QA Test 🧪  
> **Date:** 28 พฤศจิกายน 2026  
> **File:** `docs/COMPETITOR-RE-NEXT-FEATURE-20261128.md`  

---

## 1. Executive Summary: ฟีเจอร์ที่เลือกและเหตุผล (Why This Feature)

### 1.1 ชื่อฟีเจอร์
- **ภาษาไทย:** **ระบบจำแนกและแท็กประเภทเซ็ต: เซ็ตปกติ (Normal), วอร์มอัพ (Warmup W), ดรอปเซ็ต (Drop Set D), และเซ็ตล้มเหลว (Failure F)**
- **ภาษาอังกฤษ:** **Set Classification & Set Tagging Engine (Normal, Warmup, Drop Set, Failure)**

### 1.2 บริบทและสถานะฟีเจอร์ที่ส่งมอบแล้วใน GYM App
โปรเจกต์ GYM พัฒนามาถึงเวอร์ชัน v1.0.1 (commit ล่าสุด `47af99a`) โดยมีระบบติดตามการฝึกซ้อมที่แข็งแกร่งและครบถ้วน:
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
11. **Exercise Substitution & Equipment Alternative Engine:** ระบบแนะนำและสลับท่าทดแทนตามอุปกรณ์ที่ว่าง (`054a4ef`, `4986a14`)
12. **PR Records Timeline & Set Records:** ประวัติสถิติส่วนตัวและตารางสถิติต่อจำนวนครั้ง (`f222779`, `3d0f22f`)

---

### 1.3 ช่องว่างสำคัญที่สุดที่ยังขาดในห้องฝึกซ้อมจริง (The Parity Gap)
จากการลงสนามทดสอบในยิมจริงและการเปรียบเทียบกับแอปแถวหน้าของโลกอย่าง **Strong, Hevy, FitNotes, JEFIT, และ RP Hypertrophy** พบช่องว่างสำคัญในการบันทึกเซ็ต (Set Logging Bottleneck):

1. **ทุกเซ็ตถูกเหมารวมเป็นเซ็ตเดียวกัน (Single-Type Set Flattening):**
   - ในปัจจุบัน ทุกแถวเซ็ตใน `ExerciseCard.vue` ถูกแสดงผลและบันทึกเป็นเซ็ตปกติลำดับคงที่ (`เซ็ต 1`, `เซ็ต 2` ...) ผู้ใช้ไม่สามารถเปลี่ยนประเภทเซ็ตในระหว่างฝึกซ้อมได้
2. **เซ็ตวอร์มอัพ (Warmup Sets) ปนเปื้อนข้อมูลโวลุ่มทำงานและ e1RM:**
   - เมื่อผู้ใช้วอร์มอัพในท่าหลัก เช่น Barbell Bench Press (ยกบาร์เปล่า 20 กก. 10 ครั้ง หรือ 40 กก. 5 ครั้ง) หากติ๊กบันทึก เซ็ตนี้จะถูกนำไปบวกในปริมาณยกทั้งหมด (Total Working Volume) ทันที ส่งผลให้สถิติโวลุ่มรายสัปดาห์และคะแนนฟื้นตัว (Recovery Score) เพี้ยนไปจากความเป็นจริง
3. **ดรอปเซ็ต (Drop Sets) ถูกระบบ Weight Advisor ลงโทษอย่างไม่ถูกต้อง (False Negative Penalty):**
   - เทคนิค **Drop Set** เป็นเทคนิคพื้นฐานสำคัญในการฝึก Hypertrophy (เช่น เซ็ตที่ 3 ของ Lateral Raises ยก 12 กก. ได้ 10 ครั้ง แล้วลดน้ำหนักทันทีเหลือ 8 กก. ยกต่ออีก 10 ครั้งเพื่อกระตุ้น Metabolic Stress)
   - ปัจจุบัน เมื่อผู้ใช้บันทึก 8 กก. ต่อจาก 12 กก. อัลกอริทึม `useWeightAdvisor.js` จะเข้าใจผิดว่าผู้ใช้หมดแรงหรือยกน้ำหนักไม่ไหว แล้วแสดงป้ายเตือนแนะนำลดน้ำหนัก `-2 kg` ในรอบถัดไป ซึ่งขัดแย้งกับหลักการฝึกอย่างสิ้นเชิง
4. **ขาดการบันทึกเซ็ตสู้สุดใจจนหมดแรง (Failure Set / AMRAP):**
   - นักเพาะกายและ Powerlifter มักมีเซ็ตสุดท้ายของท่าที่เป็นเซ็ตทุ่มสุดตัวจนกล้ามเนื้อล้มเหลว (Muscular Failure, RIR 0 / RPE 10) แต่ปัจจุบันไม่มีป้ายสัญลักษณ์หรือการบันทึกว่าเซ็ตใดคือเซ็ต Failure

---

### 1.4 ทำไมฟีเจอร์นี้จึงคุ้มค่าและมี ROI สูงสุดในรอบนี้
1. **ความถี่การใช้งานสูงสุด (High-Frequency Touchpoint):** ผู้ใช้งานต้องมีปฏิสัมพันธ์กับแถวเซ็ตทุกเซ็ต ทุกวัน ทุกท่าฝึก การเพิ่มความสามารถในการระบุประเภทเซ็ตทำให้ประสบการณ์การจดบันทึกเป็นธรรมชาติและเทียบเท่าแอปสากลทันที
2. **ความพร้อมของสถาปัตยกรรม (Zero Schema Migration Risk):**
   - ตาราง `session_sets` ใน `server/db.js` มีคอลัมน์ `type TEXT NOT NULL` อยู่แล้วตั้งแต่เริ่มสร้างระบบ จึงไม่ต้องรันคำสั่ง `ALTER TABLE` หรือสร้างตารางใหม่ให้เสี่ยงต่อ Data Corruption
   - โค้ดฝั่ง Import (`server/backup.js`) มีการตรวจจับคำว่า `'warmup'`, `'dropset'`, `'failure'` รองรับไว้อยู่แล้ว การเพิ่มฟีเจอร์นี้จึงเป็นการปิด Parity Gap ให้สมบูรณ์ครบวงจร
3. **ขอบเขตงานพอดีกับ 1 Feature Iteration (1 Commit):** สามารถสร้างคอมโพเนนต์และโมดูลแยกขาด ชัดเจน ไม่มีไฟล์ทับซ้อนระหว่าง Backend, Frontend, และ QA

---

## 2. Reverse Engineering ของแอปคู่แข่งชั้นนำ (Competitor Breakdown)

| แอปพลิเคชัน | กลไก Set Types | รหัสย่อ / สัญลักษณ์ | ผลต่อการคำนวณ Volume & PR | ผลต่อ Rest Timer / คำแนะนำ |
| :--- | :--- | :--- | :--- | :--- |
| **Hevy** | แตะที่ตัวเลขเซ็ตเพื่อเปิดป๊อปอัปสลับประเภท | `1, 2, 3` (Normal)<br>`W` (Warmup - ฟ้า)<br>`D` (Drop Set - ม่วง)<br>`F` (Failure - แดง) | `W` ไม่นับเข้าโวลุ่มทำงานและ PR;<br>`D` และ `F` นับโวลุ่มทำงาน | `D` ข้ามเวลาพักอัตโนมัติ (เริ่มเซ็ตถัดไปทันที); แจ้งเตือนสถิติ PR ถ้าทำได้ในเซ็ตปกติ |
| **Strong** | แตะหมายเลขเซ็ตเพื่อวนลูปหรือเปิดเมนูประเภทเซ็ต | `W` (Warm Up)<br>`D` (Drop Set)<br>`F` (Failure) | `W` ถูกคัดออกจากการคำนวณ 1RM และ Volume Progression กราฟสถิติรายท่า | ไม่ให้คำแนะนำติดลบเมื่อพบน้ำหนักที่ลดลงในดรอปเซ็ต |
| **FitNotes** | เมนูลูกศรข้างเซ็ตเลือกประเภทเซ็ต | `Warmup`, `Drop`, `Failure` | ผู้ใช้สามารถกรองดูกราฟเฉพาะ Working Sets หรือรวมทุกเซ็ตได้ | รองรับการจดบันทึกย้อนหลัง |
| **RP Hypertrophy** | แยกสเต็ปวอร์มชัดเจนจาก Working Sets | `Warm-up` (ไม่นับ RPE)<br>`Working Set` (นับ RIR) | Warm-up ไม่สร้าง Fatigue Debt ต่อตาราง Deload | บังคับนับ RIR เฉพาะเซ็ตทำงานเพื่อวางแผนโวลุ่มสัปดาห์ถัดไป |
| **GYM App (ปัจจุบัน)** | มีเฉพาะ `'warm'` แบบสถิตตายตัว ไม่สามารถเปลี่ยนประเภทในหน้าฝึกได้ | ป้ายสีฟ้า `วอร์ม` (ถ้ากำหนดไว้) หรือ `เซ็ต 1, 2` | ทุกเซ็ตที่ติ๊กถูกนับเข้าโวลุ่มรวมหมด; ดรอปเซ็ตทำให้เกิดคำแนะนำ `-2 kg` | **ช่องว่างใหญ่ที่ต้องปิดในรอบนี้** |

### แหล่งอ้างอิงข้อมูลคู่แข่ง (Public Sources & Empirical Testing):
- **Hevy Help Center:** *"Set Types in Hevy: How Warmup (W), Drop Sets (D), and Failure Sets (F) work"* (hevy.com/support)
- **Strong App Guide:** *"Tagging Sets in Strong: Warm Up, Drop Set, and Failure Sets Explained"* (strongapp.io/guide)
- **Renaissance Periodization (RP):** *"Hypertrophy Training Guide: Working Sets vs Warmup Sets for Stimulus-to-Fatigue Ratio (SFR)"* (rpstrength.com)
- **FitNotes Documentation:** *"Track Training: Set Categories and Filtering"* (fitnotesapp.com)

---

## 3. รายละเอียดสเปกการออกแบบ UX / UI (Neobrutalism Design System)

### 3.1 ตำแหน่งและการโต้ตอบ (Placement & Interaction Flow)
- **Interactive Set Badge บนแถวเซ็ต (`ExerciseCard.vue`):**
  - แทนที่ป้ายตัวเลขเซ็ตเดิมด้วยปุ่ม Neobrutalism ขนาดสัมผัสไม่ต่ำกว่า **`min-h-[44px] min-w-[44px]`**
  - แตะปุ่มป้ายเซ็ต → เปิดหน้าต่างโมดอลป๊อปอัป **`SetTypeSelectorModal.vue`**
  - เลือกประเภทเซ็ตที่ต้องการ (ปกติ, วอร์มอัพ, ดรอปเซ็ต, ล้มเหลว) → ป้ายเปลี่ยนสีและข้อความทันที ข้อมูลบันทึกลง Draft State แบบเรียลไทม์

### 3.2 ไดอะแกรมจำลองหน้าจอ (ASCII Wireframe)

#### แถวเซ็ตในหน้าการ์ดท่าฝึก (`ExerciseCard.vue`):
```text
+-----------------------------------------------------------------------------------+
| [ 01 ] 🏋️ บาร์เบล เบนช์เพรส (Barbell Bench Press)                                    |
+-----------------------------------------------------------------------------------+
| เซ็ต · แนะนำ · เสร็จ                                            น้ำหนัก / ครั้ง (กก.) |
+-----------------------------------------------------------------------------------+
|  +--------+                                                                       |
|  |   W    |  วอร์มอัพ (Warmup)                  ครั้งก่อน 40 กก. × 10               |
|  | [ฟ้า]  |  [ - ]   40 กก.   [ + ]      [ - ]   10 ครั้ง   [ + ]     [ ✓ ติ๊ก ]      |
|  +--------+  (ไม่นับเข้าโวลุ่มทำงานหลัก)                                          |
+-----------------------------------------------------------------------------------+
|  +--------+                                                                       |
|  |   1    |  เซ็ต 1 (Normal)                    ครั้งก่อน 80 กก. × 8  [ พอดี ]     |
|  | [ขาว]  |  [ - ]   80 กก.   [ + ]      [ - ]    8 ครั้ง   [ + ]     [ ✓ ติ๊ก ]      |
|  +--------+                                                                       |
+-----------------------------------------------------------------------------------+
|  +--------+                                                                       |
|  |   D    |  ดรอปเซ็ต (Drop Set)                 ยกต่อทันที           [ ดรอป ]      |
|  | [ม่วง] |  [ - ]   60 กก.   [ + ]      [ - ]   10 ครั้ง   [ + ]     [ ✓ ติ๊ก ]      |
|  +--------+  (ระบบไม่เตือนลดน้ำหนักเซ็ตหลักในรอบหน้า)                             |
+-----------------------------------------------------------------------------------+
|  +--------+                                                                       |
|  |   F    |  เซ็ตล้มเหลว (Failure)              หมดแรงจริง (RIR 0)    [ สู้สุดใจ ]   |
|  | [ส้มไฟ]|  [ - ]   60 กก.   [ + ]      [ - ]    6 ครั้ง   [ + ]     [ ✓ ติ๊ก ]      |
|  +--------+                                                                       |
+-----------------------------------------------------------------------------------+
```

#### หน้าต่างเลือกประเภทเซ็ต (`SetTypeSelectorModal.vue`):
```text
+-----------------------------------------------------------------------------------+
|  🏷️ เลือกประเภทเซ็ต (SET CLASSIFICATION)                                  [ ✕ ปิด ] |
|  ท่า: Barbell Bench Press · ลำดับเซ็ตที่ 3                                          |
+-----------------------------------------------------------------------------------+
|  แตะเลือกประเภทเซ็ตที่ต้องการ:                                                       |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | [ 1..N ]  เซ็ตปกติ (Normal Working Set)                     [ เลือกแล้ว ✓ ]  |  |
|  | สไตล์: ป้ายขาว ขอบดำ | นับโวลุ่มทำงานและประเมิน Progressive Overload ตามปกติ    |  |
|  +-----------------------------------------------------------------------------+  |
|  | [   W   ]  เซ็ตวอร์มอัพ (Warm-up Set)                             [ เลือก ]  |  |
|  | สไตล์: ป้ายฟ้า bg-sky-bg | ปรับสภาพข้อต่อ ไม่นับเข้าโวลุ่ม ไม่รบกวนสถิติ PR    |  |
|  +-----------------------------------------------------------------------------+  |
|  | [   D   ]  ดรอปเซ็ต (Drop Set)                                   [ เลือก ]  |  |
|  | สไตล์: ป้ายม่วง bg-purple-100 | ลดน้ำหนักยกต่อทันที ไม่ถูก Weight Advisor สั่งลดน้ำหนัก|  |
|  +-----------------------------------------------------------------------------+  |
|  | [   F   ]  เซ็ตล้มเหลว (Failure / AMRAP Set)                     [ เลือก ]  |  |
|  | สไตล์: ป้ายส้มไฟ bg-flame-bg | เล่นจนกล้ามเนื้อหมดแรงจริง ตั้งค่า RIR เป็น 0 อัตโนมัติ |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
|  [ ปิดหน้าต่าง (44px) ]                                                            |
+-----------------------------------------------------------------------------------+
```

### 3.3 โทเคนการออกแบบตาม Neobrutalism (Design Tokens)
- **ป้ายประเภทเซ็ต (Set Badges):**
  - **Normal (`normal`):**
    `bg-surface-card text-ink border-2 border-plate shadow-[1.5px_1.5px_0px_#1e2220] font-mono font-extrabold`
  - **Warmup (`warmup`):**
    `bg-sky-bg text-sky-text border-2 border-sky shadow-[1.5px_1.5px_0px_#0284c7] font-mono font-extrabold`
  - **Drop Set (`drop`):**
    `bg-purple-100 text-purple-900 border-2 border-purple-600 shadow-[1.5px_1.5px_0px_#7c3aed] font-mono font-extrabold`
  - **Failure (`failure`):**
    `bg-flame-bg text-flame-text border-2 border-flame shadow-[1.5px_1.5px_0px_#e11d48] font-mono font-extrabold`
- **Modal Container:**
  `bg-paper border-4 border-plate rounded-3xl p-4 sm:p-6 shadow-[0_12px_40px_rgba(30,34,32,0.35)] max-w-md w-full`
- **ปุ่มเลือกใน Modal:**
  ความสูงไม่ต่ำกว่า `min-h-[52px]` มีสถานะกด ยุบตัว 1.5px ด้วย `active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none`
- **กฎการเข้าถึง (Accessibility Compliance):**
  - ห้ามใช้คลาส `focus:outline-none` ให้ใช้ `focus-visible:ring-2 focus-visible:ring-plate`
  - ห้ามใช้สีเจือจาง `text-ink-muted/80` หรือ `text-ink-faint`
  - ห้ามใช้ขนาดฟอนต์เล็กกว่ามาตรฐาน `text-[8px]`, `text-[9px]`, `text-[10px]` ขนาดขั้นต่ำคือ `text-[11px]`

---

## 4. สัญญา API และ Database Schema (Backend Specifications)

### 4.1 โครงสร้างฐานข้อมูล SQLite WAL (Zero Schema Migration)
ตาราง `session_sets` ใน `server/db.js` มีคอลัมน์ `type` อยู่แล้ว:
```sql
CREATE TABLE IF NOT EXISTS session_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_exercise_id INTEGER NOT NULL,
  set_index INTEGER NOT NULL,
  type TEXT NOT NULL, -- ค่าที่รองรับ: 'normal', 'warmup', 'drop', 'failure' (รวมถึง 'warm' เดิม)
  target TEXT NOT NULL,
  weight REAL,
  actual_reps INTEGER,
  done INTEGER DEFAULT 0,
  FOREIGN KEY (session_exercise_id) REFERENCES session_exercises(id) ON DELETE CASCADE
);
```
- **การเก็บสถานะดราฟต์ (`daily_draft_state`):**
  เพิ่มคีย์ `type_${sIdx}` ใน JSON ของแต่ละท่า เช่น `{"set_0": true, "wt_0": "40", "reps_0": "10", "type_0": "warmup"}`

---

### 4.2 สัญญา API (API Contracts)

#### Endpoint: สรุปสถิติประเภทเซ็ตของท่าฝึก (Set Type Breakdown Stats)
- **Route:** `GET /api/exercises/:id/set-type-stats`
- **คำอธิบาย:** คืนค่าสถิติการฝึกของท่านั้น แบ่งตามประเภทเซ็ต (เซ็ตทำงาน, วอร์มอัพ, ดรอปเซ็ต, เซ็ตล้มเหลว) เพื่อนำไปแสดงในหน้าประวัติ
- **Success Response (200 OK):**
```json
{
  "exerciseId": "barbell_bench_press",
  "summary": {
    "totalWorkingSets": 48,
    "totalWarmupSets": 16,
    "totalDropSets": 8,
    "totalFailureSets": 6,
    "workingVolumeKg": 38400,
    "warmupVolumeKg": 6400,
    "bestDropSetWeight": 65.0,
    "bestFailureSetWeight": 85.0
  },
  "distribution": {
    "normalPercent": 61.5,
    "warmupPercent": 20.5,
    "dropPercent": 10.3,
    "failurePercent": 7.7
  }
}
```
- **Edge Case (ท่าฝึกที่ยังไม่มีประวัติการฝึก):**
  ตอบกลับ `200 OK` พร้อมโครงสร้างค่าเริ่มต้นที่เป็นศูนย์ ไม่คืนค่า 404 หรือแครช:
```json
{
  "exerciseId": "new_exercise",
  "summary": {
    "totalWorkingSets": 0,
    "totalWarmupSets": 0,
    "totalDropSets": 0,
    "totalFailureSets": 0,
    "workingVolumeKg": 0,
    "warmupVolumeKg": 0,
    "bestDropSetWeight": null,
    "bestFailureSetWeight": null
  },
  "distribution": {
    "normalPercent": 0,
    "warmupPercent": 0,
    "dropPercent": 0,
    "failurePercent": 0
  }
}
```

---

### 4.3 โมดูลตรรกะฝั่งเซิร์ฟเวอร์ (`server/set-classification.js`)
สร้างโมดูล Pure Functions สำหรับจัดการประเภทเซ็ต:
```javascript
// server/set-classification.js
const SET_TYPES = {
  NORMAL: 'normal',
  WARMUP: 'warmup',
  DROP: 'drop',
  FAILURE: 'failure'
};

const WARMUP_ALIASES = new Set(['warm', 'warmup', 'วอร์ม', 'w']);
const DROP_ALIASES = new Set(['drop', 'dropset', 'ดรอป', 'ดรอปเซ็ต', 'd']);
const FAILURE_ALIASES = new Set(['failure', 'fail', 'ล้มเหลว', 'amrap', 'f']);

function normalizeSetType(rawType) {
  if (!rawType || typeof rawType !== 'string') return SET_TYPES.NORMAL;
  const t = rawType.trim().toLowerCase();
  if (WARMUP_ALIASES.has(t)) return SET_TYPES.WARMUP;
  if (DROP_ALIASES.has(t)) return SET_TYPES.DROP;
  if (FAILURE_ALIASES.has(t)) return SET_TYPES.FAILURE;
  return SET_TYPES.NORMAL;
}

function isWorkingSet(set) {
  if (!set) return false;
  const t = normalizeSetType(set.type);
  return t === SET_TYPES.NORMAL || t === SET_TYPES.DROP || t === SET_TYPES.FAILURE;
}

function isWarmupSet(set) {
  if (!set) return false;
  return normalizeSetType(set.type) === SET_TYPES.WARMUP;
}

function isDropSet(set) {
  if (!set) return false;
  return normalizeSetType(set.type) === SET_TYPES.DROP;
}

function isFailureSet(set) {
  if (!set) return false;
  return normalizeSetType(set.type) === SET_TYPES.FAILURE;
}

module.exports = {
  SET_TYPES,
  normalizeSetType,
  isWorkingSet,
  isWarmupSet,
  isDropSet,
  isFailureSet
};
```

---

## 5. การแบ่งหน้าที่ไฟล์พัฒนา (Separation of Concerns)

เพื่อป้องกันการชนกันของโค้ด (Conflict-free single-commit delivery) การพัฒนาจะแบ่งไฟล์ที่รับผิดชอบอย่างชัดเจนระหว่างทีม:

| ทีมผู้รับผิดชอบ | ไฟล์ที่สร้างใหม่ / ไฟล์ที่แก้ไข | วัตถุประสงค์และขอบเขตงาน |
| :--- | :--- | :--- |
| **Backend ⚙️** | `server/set-classification.js` *(สร้างใหม่)* | โมดูลตรรกะบริสุทธิ์: Normalization, Type Matcher, Volume Filter, Set Type Breakdown aggregation |
| **Backend ⚙️** | `server/server.js` *(แก้ไขเฉพาะ Mount Route)* | เชื่อมต่อ Endpoint `GET /api/exercises/:id/set-type-stats` |
| **Backend ⚙️** | `server/exercise-stats.js` *(แก้ไขจุดตรวจสอบ Warmup)* | นำเข้า `server/set-classification.js` เพื่อให้การคำนวณ PR และสถิติโวลุ่มใช้เกณฑ์เดียวกันทั้งระบบ |
| **Frontend 🎨** | `src/composables/useSetTypes.js` *(สร้างใหม่)* | Composable จัดการ state ประเภทเซ็ตประจำท่า, ฟังก์ชันสลับประเภท (`cycleSetType`, `setSetType`), โทเคนป้ายสี และป้ายข้อความ |
| **Frontend 🎨** | `src/components/SetTypeSelectorModal.vue` *(สร้างใหม่)* | หน้าต่าง Neobrutalism Modal สำหรับเลือกประเภทเซ็ต 4 รูปแบบ (Normal, Warmup, Drop, Failure) พร้อมปุ่ม 44px+ |
| **Frontend 🎨** | `src/components/ExerciseCard.vue` *(แก้ไขป้ายเซ็ตให้กดได้)* | แปลงป้ายเซ็ตเดิมให้เป็นปุ่มสัมผัสเปิด `SetTypeSelectorModal.vue`, นำเข้า `useSetTypes.js` |
| **Frontend 🎨** | `src/composables/useWeightAdvisor.js` *(แก้ไขไม่ให้เตือนติดลบในดรอปเซ็ต)* | ตรวจสอบประเภทเซ็ต หากเป็น `'drop'` ให้แสดงป้าย `ดรอปเซ็ต` แทนการแนะนำลดน้ำหนัก `-2 kg` |
| **Frontend 🎨** | `src/composables/sessionPayload.js` *(แก้ไขการส่ง Type)* | อัปเดต `buildExercise` ให้อ่านและแนบ `type: exState['type_' + sIdx] || 'normal'` ลงใน payload ที่บันทึก |
| **QA Test 🧪** | `test/test-set-types-api.js` *(สร้างใหม่)* | ชุดทดสอบอัตโนมัติ: Normalization, แยก Volume วอร์ม/ทำงาน, ป้องกัน Weight Advisor เพี้ยน, ความปลอดภัย DB ชั่วคราว |
| **QA Test 🧪** | `package.json` *(เพิ่ม script ทดสอบ)* | ต่อท้าย `node test/test-set-types-api.js` ใน `test:chain-steps` |

---

## 6. แผนการทดสอบอัตโนมัติ (Automated QA Test Plan)

การทดสอบต้องทำงานผ่าน Guarded Test Runner (`npm run test:chain`) ภายใต้เงื่อนไขความปลอดภัยสูงสุด **ห้ามแตะต้องฐานข้อมูลจริง `data/gym.db`**:

1. **Test 1: Set Type Normalization & Fallbacks:**
   - ตรวจสอบว่าคำว่า `'warm'`, `'warmup'`, `'วอร์ม'` ถูก Normalize เป็น `'warmup'`
   - ตรวจสอบว่าคำว่า `'drop'`, `'dropset'`, `'ดรอป'` ถูก Normalize เป็น `'drop'`
   - ตรวจสอบว่าคำว่า `'failure'`, `'fail'`, `'ล้มเหลว'` ถูก Normalize เป็น `'failure'`
   - ข้อมูลว่าง หรือข้อความที่ไม่รู้จัก ต้องตกเป็น `'normal'` เสมอ
2. **Test 2: Working Volume Calculation Isolation:**
   - จำลองเซสชัน 4 เซ็ต:
     - เซ็ต 1: Warmup 40 กก. × 10 ครั้ง (Volume = 400)
     - เซ็ต 2: Normal 80 กก. × 8 ครั้ง (Volume = 640)
     - เซ็ต 3: Normal 80 กก. × 8 ครั้ง (Volume = 640)
     - เซ็ต 4: Drop 60 กก. × 10 ครั้ง (Volume = 600)
   - ยืนยันว่า `workingVolumeKg === 1880` (ไม่รวม 400 ของวอร์มอัพ)
   - ยืนยันว่า `warmupVolumeKg === 400`
3. **Test 3: Weight Advisor Exemption for Drop Sets:**
   - เมื่อเซ็ตก่อนหน้ายก 80 กก. และเซ็ตปัจจุบันเป็น Drop Set 60 กก.
   - อัลกอริทึมต้องไม่แสดงคำแนะนำติดลบ `-2 kg` ในเซ็ตถัดไป
4. **Test 4: PR Records Exclusion of Warmup Sets:**
   - แม้เซ็ตวอร์มอัพจะบันทึกจำนวนครั้งสูงสุด (เช่น 40 กก. 15 ครั้ง) ต้องไม่แย่งตำแหน่ง Best e1RM หรือ Heaviest Weight ของเซ็ตทำงาน
5. **Test 5: Set Type Stats Endpoint Contract (`GET /api/exercises/:id/set-type-stats`):**
   - รันผ่าน Temporary DB ยืนยันการตอบกลับ JSON ตรงตาม Schema ทุกประการ
   - ทดสอบท่าที่ไม่มีประวัติ ต้องตอบ 200 OK พร้อมค่าเริ่มต้นศูนย์
6. **Test 6: Design Tokens & Accessibility Verification:**
   - สแกนไฟล์ใหม่ไม่ให้มีคลาส `focus:outline-none`, `text-ink-muted/80`, หรือฟอนต์ `text-[8-10px]`
   - ตรวจสอบว่าทุกปุ่มเลือกประเภทเซ็ตมี `min-h-[44px]`

---

## 7. เกณฑ์ความสำเร็จที่วัดได้ (Acceptance Criteria)

- [ ] บนแถวเซ็ตของการ์ดท่าฝึก (`ExerciseCard.vue`) มีปุ่มป้ายเซ็ตแบบกดได้ (ขนาดขั้นต่ำ 44×44px)
- [ ] เมื่อแตะปุ่มป้ายเซ็ต จะเปิดหน้าต่าง `SetTypeSelectorModal.vue` เพื่อสลับประเภทเซ็ตได้อย่างราบรื่น
- [ ] แต่ละประเภทเซ็ตแสดงสีและตัวย่อ Neobrutalism ชัดเจน: ปกติ (`1..N`), วอร์ม (`W` สีฟ้า), ดรอปเซ็ต (`D` สีม่วง), ล้มเหลว (`F` สีส้มไฟ)
- [ ] การเลือกประเภทเซ็ตบันทึกลง Draft State ทันที ไม่สูญหายเมื่อเปลี่ยนแท็บวัน
- [ ] ปริมาณโวลุ่มทำงานรวม (Working Volume) ในสรุปเซสชันคัดแยกเซ็ตวอร์มอัพออกอย่างถูกต้อง
- [ ] ระบบแนะนำน้ำหนัก (`useWeightAdvisor`) ไม่แนะนำลดน้ำหนักเซ็ตหลักเมื่อผู้ใช้เล่นดรอปเซ็ต
- [ ] ไม่มีคลาสที่ขัดต่อ Accessibility (`text-ink-muted/80`, `focus:outline-none`)
- [ ] รัน `npm run test:chain` ผ่าน 100% ครบทุกเคสโดยไม่เกิด Side-effect หรือเขียนทับฐานข้อมูล `data/gym.db`

---

## 8. ความเสี่ยงและข้อควรระวัง (Risks & Mitigations)

1. **ความเสี่ยงข้อมูลเซสชันเก่า (Backward Compatibility):**
   - *ข้อกังวล:* เซสชันในอดีตที่บันทึกคำว่า `'เล่นจริง'`, `'ซ้อมเสริม'`, หรือสตริงภาษาไทยอื่นๆ ในคอลัมน์ `type` อาจทำให้การสรุปสถิติผิดพลาด
   - *มาตรการป้องกัน:* ฟังก์ชัน `normalizeSetType` ใน `server/set-classification.js` ถูกออกแบบให้มองค่าที่ไม่ตรงกับ W/D/F ว่าเป็น `'normal'` เสมอ ทำให้เซสชันเดิมทำงานต่อได้ 100% โดยไม่ต้อง Migrate ข้อมูลเก่า
2. **ความเสี่ยงการกดพลาดในหน้าจอมือถือ (Accidental Touch):**
   - *ข้อกังวล:* ระหว่างยกเวท ผู้ใช้อาจเผลอโดนปุ่มประเภทเซ็ต
   - *มาตรการป้องกัน:* การเปลี่ยนประเภทเซ็ตทำผ่าน Modal Confirmation ที่มีปุ่มปิดชัดเจน และขนาดเป้าสัมผัสกว้าง ไม่เปลี่ยนค่าแบบสุ่มหรือคลิกเดียวเปลี่ยนทันทีหากผู้ใช้ไม่ตั้งใจ

---
*เอกสารนี้จัดทำโดย GYM Competitor RE 🕵️‍♂️ เพื่อให้ GYM Manager 👔 สามารถ Dispatch งานให้ทีม Backend ⚙️, Frontend 🎨, และ QA 🧪 เริ่มพัฒนาได้ทันที*
