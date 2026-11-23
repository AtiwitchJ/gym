# GYM Manager — Deload Week Detection & Tapering Advisor Specification

> **Date:** 23 November 2026 (routine run 22:00 ICT)
> **Author:** GYM Manager 👔 — selection based on GYM Competitor RE 🕵️‍♂️ ranked report (14:08Z, at commit `7befdb9`)
> **Baseline:** `main` @ `d2fda46`, version 1.6.0, `data/gym.db` sha256 `39fad98b18143ca62ee47fdb2504a8b85b8206c75390f094fb29c72cbb871d48`
> **Status:** Dispatched to Backend ⚙️ / Frontend 🎨 / QA 🧪 — integration by Manager pending

## 1. Selection rationale

RE's ranked list at `7befdb9`:

1. **Post-Workout sRPE & Muscle Soreness Debrief** — shipped as v1.6.0 (`d2fda46`).
2. **Deload Week Detection & Volume/Intensity Tapering Advisor** — this run.
3. Weekly Muscle Set Target Landmarks (MEV / MAV / MRV) — deferred.

Feature #1 added `sessionLoadAu` (`round(durationSec/60 × sessionRpe)`) to `workout_sessions`. Feature #2 is the direct consumer: it turns that per-session load into a six-week fatigue trend and a concrete deload recommendation, matching RP Hypertrophy / JEFIT autoregulation. No new account, service, or migration is required.

## 2. API contract — `GET /api/deload` (200)

```json
{
  "weeks": [
    { "weekStart": "YYYY-MM-DD", "sessions": 0, "loadAu": 0, "workingSets": 0 }
  ],
  "current": {
    "weekStart": "YYYY-MM-DD",
    "acuteLoadAu": 0,
    "chronicLoadAu": 0,
    "acwr": null,
    "risingWeeks": 0
  },
  "recommendation": {
    "status": "hold",
    "labelTh": "รักษาจังหวะ",
    "reasonTh": "ข้อมูลยังไม่พอสำหรับวิเคราะห์ความล้า",
    "signals": [],
    "taper": { "setReductionPct": 50, "targetRir": "3–4", "suggestedSetsPerExercise": 3 }
  }
}
```

`weeks` is six entries, oldest first, including empty weeks. `acwr` is `Math.round(x*100)/100`, or `null` when chronic load is zero. Empty history returns the zeroed shape above with HTTP 200.

## 3. Computation rules (pure)

- Week buckets use `weekStartOf` from `server/volume.js` (UTC Monday).
- Per session: `loadAu = Number(sessionLoadAu)` when finite and `> 0`, else `0`.
- `workingSets` counts sets where `done` is truthy and `isWarmupSet({type})` from `server/exercise-stats.js` is false.
- `acute` = current-week load; `chronic` = rounded mean of the four preceding weeks (zero if none).
- `acwr` = `round2(acute / chronic)`; `risingWeeks` = consecutive weeks ending now with strictly increasing load.
- Signals: `acwr_high` (`acwr > 1.5`), `rising_4w` (`risingWeeks >= 4`), `joint_pain` (any session in the current or preceding week has `jointComfort === 'pain'`), `low_acwr` (`acwr < 0.8`).
- Status: `deload` if any of `acwr_high` / `rising_4w` / `joint_pain`; else `push` if `low_acwr`; else `hold`.

Input is `repo.getHistory()`; no new table or migration.

## 4. Separation of concerns

| Team | Files |
| :--- | :--- |
| Backend ⚙️ | `server/deload.js` (new, pure), `server/server.js` (mount route only) |
| Frontend 🎨 | `src/composables/useDeload.js` (new), `src/components/DeloadAdvisorCard.vue` (new), `src/components/HistoryView.vue` (mount card near VolumeChart) |
| QA 🧪 | `test/test-deload-api.js` (new, ≥7 cases), `package.json` (`test:chain-steps` line only) |
| Manager 👔 | integration, `npm test`, version bump 1.6.0 → 1.7.0, commit with Co-authored trailer, notify `monitor up-laptop` |

## 5. Guardrails

No commit/push or version bump by teammates. No writes to the real `data/gym.db`; tests use `GYM_DB_PATH` temp + `GYM_FORBID_REAL_DB=1`. UI is Neobrutalism with ≥44px touch targets; no `focus:outline-none`, `text-ink-muted/80`, or fonts below `text-[11px]`.
