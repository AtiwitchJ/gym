# Progressive Overload Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign progressive overload advice into a high-density, low-verbosity overview bar and comparison table modal, stripping verbose copy and emoji clutter while preserving exact mathematical advice rules.

**Architecture:** A top-level summary widget (`NextSessionOverview.vue`) feeds into a detailed Before/After comparison modal (`NextPlanModal.vue`), while individual exercise cards (`ExerciseCard.vue`, `BonusCard.vue`) adopt a clean, single-line "Next Target" strip. The core calculation logic in `useWeightAdvisor.js` remains pure and deterministic.

**Tech Stack:** Vue 3 Composition API, Vite, Tailwind CSS, SQLite backend, Playwright E2E verification.

## Global Constraints

- Zero emoji clutter; prioritize crisp typography, badges, and monospace numeric tables.
- Minimal text: avoid long conversational paragraphs or repetitive motivational copy.
- Mobile first: guaranteed 0 horizontal overflow on iPhone 15 (393 × 852 viewport).
- Keep 100% backward compatibility with existing saved weights and draft states.

---

### Task 1: Streamline `useWeightAdvisor.js` and Verify with Unit Tests

- [ ] Update `src/composables/useWeightAdvisor.js` to return concise metadata (`delta`, `suggestedWeight`, `status`, `badgeText`) without wordy copy.
- [ ] Update `test/test-advisor.js` to match the streamlined properties.
- [ ] Run `npm test` and confirm all tests pass.
- [ ] Commit changes.

### Task 2: Build `NextPlanModal.vue`

- [ ] Create `src/components/NextPlanModal.vue` with a high-density data table comparing current workout vs next-session targets.
- [ ] Add clean, minimal rules guide at the bottom (Warmup: 15–20 reps, Working: 6–8 reps).
- [ ] Ensure mobile-friendly responsive table with safe-area spacing and escape/close triggers.
- [ ] Commit changes.

### Task 3: Build `NextSessionOverview.vue` & Wire into `App.vue`

- [ ] Create `src/components/NextSessionOverview.vue` showing a compact pill bar (`+2 kg`, `0 kg`, `-2 kg`) and button to open `NextPlanModal`.
- [ ] Integrate `NextSessionOverview` and `NextPlanModal` into `src/App.vue`.
- [ ] Commit changes.

### Task 4: Streamline `ExerciseCard.vue` and `BonusCard.vue`

- [ ] Replace bulky double-banner alerts with a sleek, single-line target bar: `รอบหน้า: วอร์ม X kg | เล่นจริง Y kg (+2 kg)`.
- [ ] Clean up set row badges into minimal tags: `+2 kg`, `0 kg`, `-2 kg`.
- [ ] Remove wordy reason text and emojis.
- [ ] Commit changes.

### Task 5: Verification & Mobile Visual QA

- [ ] Run `npm test && npm run build` to ensure 0 build errors.
- [ ] Use Playwright to test on iPhone 15 viewport (393 × 852 pt):
  - Check `NextSessionOverview` and `NextPlanModal` open/close.
  - Check horizontal scroll (`hasHorizontalScroll: false`, `overflowingCount: 0`).
- [ ] Commit and push to `main`.
