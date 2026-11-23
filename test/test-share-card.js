import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SHARE_CARD_DIMENSIONS,
  escapeXml,
  formatShareDuration,
  buildShareCardModel,
  buildShareCardSvg,
  svgToDataUrl
} from '../src/composables/useShareCard.js';

/**
 * QA Test: Shareable Workout Summary Card
 * Spec: GYM Manager brief — Hevy-style share card (title, volume, duration,
 * sets, PRs, exercise breakdown) rendered as one SVG used for preview + download.
 * No database, no DOM: pure helpers plus wiring assertions.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Shareable Workout Summary Card');
console.log('====================================================\n');

console.log('▶ [1] XML escaping blocks injected markup...');
assert.strictEqual(escapeXml('Chest & Back'), 'Chest &amp; Back');
assert.strictEqual(escapeXml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
assert.strictEqual(escapeXml("it's"), 'it&apos;s');
assert.strictEqual(escapeXml(null), '');
console.log('  ✓ special characters escaped\n');

console.log('▶ [2] Duration formatting...');
assert.strictEqual(formatShareDuration(0), '00:00');
assert.strictEqual(formatShareDuration(95), '01:35');
assert.strictEqual(formatShareDuration(3725), '1:02:05');
assert.strictEqual(formatShareDuration(-10), '00:00');
console.log('  ✓ MM:SS and H:MM:SS\n');

console.log('▶ [3] Model from a session summary...');
const summary = {
  title: 'Program A — อก + หลัง',
  subtitle: 'ท่าที่บันทึกในรอบนี้',
  durationSec: 3605,
  totalVolumeKg: 4321.5,
  completedSetsCount: 9,
  totalSetsCount: 12,
  exercises: [
    { name: 'Bench Press', sets: [{ completed: true }, { completed: true }, { completed: true }] },
    { name: 'Lat Pulldown', sets: [{ completed: true }, { completed: true }, { completed: false }] },
    { name: 'Shoulder Press', sets: [{ completed: true }, { completed: false }] }
  ],
  prs: [
    { exerciseName: 'Bench Press', weight: '80', reps: '6' },
    { exerciseName: 'Lat Pulldown', weight: '55', reps: '10' }
  ]
};
const model = buildShareCardModel(summary, new Date(2026, 10, 23)); // local date: 23 Nov 2026
assert.strictEqual(model.title, 'Program A — อก + หลัง');
assert.ok(model.dateLabel.includes('2569'), 'Thai Buddhist year in the date label');
assert.strictEqual(model.volumeLabel, '4,321.5 กก.');
assert.strictEqual(model.durationLabel, '1:00:05');
assert.strictEqual(model.setsLabel, '9 / 12');
assert.strictEqual(model.exerciseLines.length, 3);
assert.strictEqual(model.exerciseLines[0].done, 3);
assert.strictEqual(model.exerciseLines[1].done, 2);
assert.deepStrictEqual(model.prLines, ['Bench Press 80 กก. × 6', 'Lat Pulldown 55 กก. × 10']);
console.log('  ✓ stats, exercise and PR lines\n');

console.log('▶ [4] Model is safe with empty / legacy-shaped input...');
const empty = buildShareCardModel(null, new Date(2026, 0, 2));
assert.strictEqual(empty.title, 'Workout Session');
assert.strictEqual(empty.volumeLabel, '0 กก.');
assert.strictEqual(empty.setsLabel, '0 / 0');
assert.deepStrictEqual(empty.exerciseLines, []);
assert.deepStrictEqual(empty.prLines, []);
const legacy = buildShareCardModel({ setsDone: 4, setsTotal: 6, exercises: [{ id: 'x', sets: [] }] });
assert.strictEqual(legacy.setsLabel, '4 / 6');
assert.strictEqual(legacy.exerciseLines[0].name, 'x');
console.log('  ✓ null-safe and legacy field names\n');

console.log('▶ [5] SVG is standalone, complete and escapes user text...');
const svg = buildShareCardSvg(model);
assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), 'standalone namespace');
assert.ok(svg.includes(`viewBox="0 0 ${SHARE_CARD_DIMENSIONS.width} ${SHARE_CARD_DIMENSIONS.height}"`));
assert.ok(svg.trimEnd().endsWith('</svg>'));
for (const value of ['WORKOUT COMPLETE', '4,321.5 กก.', '1:00:05', '9 / 12', 'Bench Press', 'PR ในรอบนี้']) {
  assert.ok(svg.includes(value), `SVG must contain ${value}`);
}
const hostile = buildShareCardModel({ title: '<script>alert(1)</script>' });
const hostileSvg = buildShareCardSvg(hostile);
assert.ok(!hostileSvg.includes('<script>'), 'no raw script tag in SVG');
assert.ok(hostileSvg.includes('&lt;script&gt;'), 'script tag rendered as text');
console.log('  ✓ namespace, content and injection safety\n');

console.log('▶ [6] Preview/download URL is encoded...');
const url = svgToDataUrl(svg);
assert.ok(url.startsWith('data:image/svg+xml;charset=utf-8,'));
assert.ok(!url.includes('<svg '), 'markup is percent-encoded');
assert.ok(url.includes('%3Csvg'), 'encoded opening tag present');
console.log('  ✓ data URL\n');

console.log('▶ [7] Component wiring in the summary modal...');
const modal = read('src/components/WorkoutSummaryModal.vue');
assert.ok(modal.includes("import ShareCard from './ShareCard.vue';"), 'modal imports the card');
assert.ok(/<ShareCard\s+:summary="summary"\s*\/>/.test(modal), 'modal renders the card with the summary');
const card = read('src/components/ShareCard.vue');
assert.ok(card.includes('buildShareCardModel'), 'card builds its model from the summary');
assert.ok(card.includes('buildShareCardSvg'), 'card uses the shared SVG builder');
assert.ok(card.includes("image.src = cardDataUrl.value"), 'PNG export draws the same data URL');
assert.ok(card.includes('downloadSvg'), 'SVG export available as fallback');
console.log('  ✓ modal -> card -> shared SVG source of truth\n');

console.log('\n====================================================');
console.log('🎉 ALL SHARE CARD TESTS PASSED!');
console.log('====================================================');
