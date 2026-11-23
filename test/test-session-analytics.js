import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeRestIntervals,
  computeSessionAnalytics,
  formatDuration,
  MIN_REST_SEC,
  MAX_REST_SEC
} from '../src/composables/useSessionAnalytics.js';
import { buildSessionSummary } from '../src/composables/useSessionSummary.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const T0 = Date.UTC(2026, 0, 1, 0, 0, 0);
const iso = (sec) => new Date(T0 + sec * 1000).toISOString();

const session = (gaps, durationSec = 300) => ({
  durationSec,
  exercises: [{
    name: 'Bench',
    sets: gaps.map((at) => ({ completed: true, completedAt: iso(at) }))
  }]
});

console.log('====================================================');
console.log('🧪 QA Test: Session active time / rest time / average rest analytics');
console.log('====================================================\n');

console.log('▶ [1] Empty and legacy summaries are safe (all zeros)...');
assert.deepStrictEqual(computeRestIntervals(null), []);
const empty = computeSessionAnalytics(null);
assert.strictEqual(empty.totalSec, 0);
assert.strictEqual(empty.restSec, 0);
assert.strictEqual(empty.activeSec, 0);
assert.strictEqual(empty.avgRestSec, 0);
assert.strictEqual(empty.restCount, 0);
assert.strictEqual(empty.hasTimestamps, false);
assert.strictEqual(computeSessionAnalytics({ durationSec: 120 }).hasTimestamps, false);
console.log('✓ Null / no-timestamp input verified.');

console.log('▶ [2] Rest gaps between completed sets, active time = total - rest...');
const s2 = session([0, 60, 120], 300);
assert.deepStrictEqual(computeRestIntervals(s2), [60, 60]);
const a2 = computeSessionAnalytics(s2);
assert.strictEqual(a2.totalSec, 300);
assert.strictEqual(a2.restSec, 120);
assert.strictEqual(a2.activeSec, 180);
assert.strictEqual(a2.avgRestSec, 60);
assert.strictEqual(a2.restCount, 2);
assert.strictEqual(a2.hasTimestamps, true);
console.log('✓ Rest 120s, active 180s, average 60s over 2 rests.');

console.log('▶ [3] Timestamps are sorted across exercises, not trusted in order...');
const s3 = {
  durationSec: 400,
  exercises: [
    { sets: [{ completed: true, completedAt: iso(120) }, { completed: true, completedAt: iso(0) }] },
    { sets: [{ completed: true, completedAt: iso(60) }] }
  ]
};
assert.deepStrictEqual(computeRestIntervals(s3), [60, 60]);
console.log('✓ Out-of-order set timestamps sorted before diffing.');

console.log('▶ [4] Implausible gaps are dropped, incomplete sets ignored...');
const s4 = {
  durationSec: 7200,
  exercises: [{ sets: [
    { completed: true, completedAt: iso(0) },
    { completed: true, completedAt: iso(2) },       // 2s  -> below 5s minimum
    { completed: true, completedAt: iso(62) },      // 60s -> real rest
    { completed: true, completedAt: iso(4262) },    // 4200s -> above 600s cap
    { completed: true, completedAt: iso(4322) },    // 60s -> real rest
    { completed: false, completedAt: iso(4400) },   // not a completed set
    { completed: true }                              // missing timestamp
  ] }]
};
assert.deepStrictEqual(computeRestIntervals(s4), [60, 60]);
assert.strictEqual(MIN_REST_SEC, 5);
assert.strictEqual(MAX_REST_SEC, 600);
console.log('✓ Sub-5s, over-600s, unchecked and untimed sets excluded.');

console.log('▶ [5] Epoch-ms timestamps also accepted, invalid ones skipped...');
const s5 = {
  durationSec: 200,
  exercises: [{ sets: [
    { completed: true, completedAt: T0 },
    { completed: true, completedAt: T0 + 90 * 1000 },
    { completed: true, completedAt: 'not-a-date' },
    { completed: true, completedAt: null }
  ] }]
};
assert.deepStrictEqual(computeRestIntervals(s5), [90]);
assert.strictEqual(computeSessionAnalytics(s5).avgRestSec, 90);
console.log('✓ ISO strings and epoch-ms handled; garbage ignored.');

console.log('▶ [6] Total time falls back to startedAt/finishedAt when durationSec is missing...');
const a6 = computeSessionAnalytics({
  startedAt: iso(0),
  finishedAt: iso(245),
  exercises: [{ sets: [{ completed: true, completedAt: iso(0) }, { completed: true, completedAt: iso(45) }] }]
});
assert.strictEqual(a6.totalSec, 245);
assert.strictEqual(a6.restSec, 45);
assert.strictEqual(a6.activeSec, 200);
console.log('✓ Wall-clock fallback and active/rest split verified.');

console.log('▶ [7] Duration formatting shared with the cards...');
assert.strictEqual(formatDuration(0), '00:00');
assert.strictEqual(formatDuration(75), '01:15');
assert.strictEqual(formatDuration(3661), '1:01:01');
assert.strictEqual(formatDuration(null), '00:00');
assert.strictEqual(formatDuration(-5), '00:00');
console.log('✓ MM:SS and HH:MM:SS formats verified.');

console.log('▶ [8] Day-view save path exposes set timestamps for the same analytics...');
const dayData = {
  title: 'Analytics Day',
  exercises: [{ id: 'e1', name: 'Bench', sets: [{ type: 'working' }, { type: 'working' }, { type: 'working' }] }]
};
const dayState = {
  e1: {
    set_0: true, ts_0: iso(0),
    set_1: true, ts_1: iso(70),
    set_2: true, ts_2: iso(140)
  }
};
const built = buildSessionSummary(dayData, dayState);
assert.deepStrictEqual(built.exercises[0].sets.map((x) => x.completed), [true, true, true]);
assert.strictEqual(built.exercises[0].sets[1].completedAt, iso(70));
const a8 = computeSessionAnalytics({ ...built, durationSec: 300 });
assert.deepStrictEqual(computeRestIntervals({ ...built, durationSec: 300 }), [70, 70]);
assert.strictEqual(a8.restCount, 2);
assert.strictEqual(a8.restSec, 140);
assert.strictEqual(a8.activeSec, 160);
assert.strictEqual(a8.avgRestSec, 70);
assert.ok(read('src/composables/useWorkoutStore.js').includes('userState[day][exId][`ts_${setIdx}`] = new Date().toISOString()'), 'toggleSetDone stores the timestamp');
console.log('✓ Day-save path feeds the same pure analytics function.');

console.log('▶ [9] Shared summary modal renders the three new stats...');
const modal = read('src/components/WorkoutSummaryModal.vue');
assert.ok(modal.includes("from '../composables/useSessionAnalytics.js'"), 'modal imports analytics');
assert.ok(modal.includes('computeSessionAnalytics(props.summary)'), 'modal computes from the summary it receives');
assert.ok(modal.includes('sessionAnalytics.hasTimestamps'), 'legacy summaries without timestamps hide the row');
assert.ok(modal.includes('เวลาออกแรง (Active)') && modal.includes('เวลาพัก (Rest)') && modal.includes('พักเฉลี่ย/เซ็ต'), 'all three labels rendered');
assert.ok(modal.includes('formatDuration(sessionAnalytics.activeSec)')
  && modal.includes('formatDuration(sessionAnalytics.restSec)')
  && modal.includes('formatDuration(sessionAnalytics.avgRestSec)'), 'values are bound');
console.log('✓ Modal wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL SESSION-ANALYTICS TESTS PASSED!');
console.log('====================================================');
