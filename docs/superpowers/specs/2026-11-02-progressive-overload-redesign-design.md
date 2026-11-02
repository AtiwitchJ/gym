# Design Specification: Progressive Overload & Next-Session Plan Redesign

Date: 2026-11-02  
Status: Draft -> Ready for Implementation  
Author: Antigravity Assistant & User  

---

## 1. Problem Statement & User Constraints

### Current Friction
- The existing Progressive Overload recommendation banners inside `ExerciseCard.vue` and `BonusCard.vue` are cluttered with verbose explanations ("เพราะรอบล่าสุดคุณยก..."), multiple redundant alert boxes (warm-up alert + working alert), and excessive emojis.
- Users already understand gym metrics. Verbose copywriting creates noise and steals vertical space, especially on mobile devices like iPhone 15.
- There is no single bird's-eye view (ภาพรวม) showing the entire day's progression at a glance.
- Clicking recommendation buttons during an active workout risks overwriting the session's actual recorded lifts.

### User Directives
1. **Low verbosity (พยายามไม่ต้องใช้ตัวหนังสือเยอะ):** Rely on clear, structured numbers and tables; gym-goers know what weights, reps, and deltas mean.
2. **Minimal emojis (ลดการใช้อิโมจิ):** Strictly clean, high-contrast Neo-Brutalist UI without decorative emoji clutter.
3. **Hybrid Overview & Table Modal (แนวทาง 1 + 2):**
   - Compact summary on the active day page.
   - Comprehensive comparison table modal showing before/after and calculation rules.
   - Clean, compact "Next Session" target bar inside each exercise card.

---

## 2. Architecture & UI Components

### Component Hierarchy
```
App.vue
 ├── HeaderBar.vue
 ├── DayTabs.vue
 ├── NextSessionOverview.vue (NEW: Compact summary pill bar + "ตารางแผนรอบหน้า" button)
 ├── NextPlanModal.vue       (NEW: High-density comparison table & rules)
 ├── ExerciseCard.vue        (UPDATED: Clean target strip, minimal badges, no verbose text)
 ├── BonusCard.vue           (UPDATED: Same clean target strip as ExerciseCard)
 ├── PinKeypad.vue
 └── RestTimer.vue
```

### 1. `NextSessionOverview.vue` (Compact Overview Widget)
- Placed directly beneath `DayTabs.vue` on workout days (mon, tue, wed, thu).
- Shows a concise, dense row:
  - Metric chips: `[+2 kg: X ท่า]` (bg-flame), `[0 kg: Y ท่า]` (bg-emerald), `[-2 kg: Z ท่า]` (bg-amber-500)
  - Action button: `ตารางแผนรอบหน้า` (opens `NextPlanModal`)
- Responsive: single horizontal flex line, wrapping cleanly on mobile without horizontal overflow.

### 2. `NextPlanModal.vue` (Next-Session Comparison Table & Rules)
- Modal dialog with paper background (`#fdfbf7`), thick border (`2px solid #1e2220`), and sharp Neo-Brutalist shadow.
- Header: `แผนการเล่นรอบหน้า (Next Session Plan)` + close button `[ ✕ ]`.
- Table layout (minimal text, high data density):
  | ท่าฝึก | สถิติล่าสุด | เป้าหมายรอบหน้า | การปรับ |
  |---|---|---|---|
  | Incline Dumbbell Press | วอร์ม 8 kg × 22<br>จริง 12 kg × 10 | วอร์ม 10 kg<br>จริง 14 kg | +2 kg<br>+2 kg |
- Rules Footer (Terse, rule-based summary):
  - `เซ็ตวอร์ม: เป้าหมาย 15–20 ครั้ง (>20: +2 kg, <12: -2 kg)`
  - `เซ็ตจริง: เป้าหมาย 6–8 ครั้ง (>8: +2 kg, <6: -2 kg)`
  - `ซ้อมเสริม: คำนวณแยกตามเกณฑ์วอร์มและเซ็ตเล่น`

### 3. Updates to `ExerciseCard.vue` & `BonusCard.vue`
- Replace bulky alert boxes with a single sleek header strip:
  - Format: `รอบหน้า: วอร์ม [X] kg | เล่นจริง [Y] kg ([+2 kg / 0 kg / -2 kg])`
- Remove all conversational paragraphs ("เพราะรอบล่าสุด...", "แรงยังเหลือ...").
- Set row badges: Keep clean, concise status tags: `+2 kg`, `0 kg`, `-2 kg` (no redundant descriptions).

### 4. Updates to `useWeightAdvisor.js`
- Strip out conversational, wordy strings (`reasonText`, `headline`, `reason`).
- Return clean, structured data:
  - `delta`: `+2`, `0`, `-2`
  - `suggestedWeight`: number
  - `currentWeight`: number
  - `status`: `'increase'` | `'optimal'` | `'decrease'`
  - `reps`: number
  - `badgeText`: `'+2 kg'`, `'0 kg'`, `'-2 kg'`
- Maintain pure calculation functions and 100% test compatibility.

---

## 3. Data Flow

1. User records reps and weight for an exercise set.
2. `useWeightAdvisor` computes deterministic recommendations based on:
   - Working set: target 6–8 reps (>8: +2 kg, <6: -2 kg, 6–8: 0 kg).
   - Warm-up set: target 15–20 reps (>20: +2 kg, <12: -2 kg, 12–20: 0 kg).
3. `ExerciseCard` / `BonusCard` render the compact target strip immediately.
4. `NextSessionOverview` aggregates all exercises for the active day into status tallies.
5. Opening `NextPlanModal` maps through exercises to render the structured Before ➔ Next Session comparison table.

---

## 4. Verification & Testing Criteria

1. **Automated Unit Tests:**
   - Run `node test/test-advisor.js` to ensure advisor logic passes all assertions.
   - Run `node server/test-api.js` to ensure SQLite and API stability.
2. **Build Verification:**
   - `npm run build` must compile with 0 Vite/Vue errors.
3. **Mobile Layout Verification:**
   - Verify on 393 × 852 viewport (iPhone 15) with Playwright to ensure 0 horizontal overflow (`overflowingCount: 0`).
   - Verify touch targets and readable typography without text clipping.
