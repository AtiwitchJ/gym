import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dockPaddingPx, DOCK_GAP_PX } from '../src/composables/useDockPadding.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('====================================================');
console.log('🧪 QA Test: the page keeps clear of the bottom dock (regular tester item 2)');
console.log('====================================================\n');

console.log('▶ [1] Padding = measured dock height + a gap...');
assert.strictEqual(dockPaddingPx(188), 188 + DOCK_GAP_PX, 'a 188 px dock needs 188 + gap');
assert.strictEqual(dockPaddingPx(188.2), 189 + DOCK_GAP_PX, 'fractional heights round up');
assert.strictEqual(dockPaddingPx(0), DOCK_GAP_PX, 'no dock measured yet -> just the gap');
assert.strictEqual(dockPaddingPx(undefined), DOCK_GAP_PX, 'missing height is safe');
assert.strictEqual(dockPaddingPx(-5), DOCK_GAP_PX, 'negative height is treated as 0');
console.log('✓ Padding maths verified.');

console.log('▶ [2] App measures the dock and uses that as the page padding (no fixed pb classes)...');
const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');
assert.ok(app.includes('ref="dockEl"'), 'the dock element is measured');
assert.ok(app.includes(':style="{ paddingBottom: dockPadding }"'), 'the main container uses the measured padding');
assert.ok(!app.includes('pb-36') && !app.includes('pb-24'), 'the fixed padding classes are gone');
assert.ok(app.includes("import { useDockPadding } from './composables/useDockPadding.js';"), 'App uses the composable');
const composable = fs.readFileSync(path.join(root, 'src/composables/useDockPadding.js'), 'utf8');
assert.ok(composable.includes('ResizeObserver') && composable.includes('observer.observe(dockRef.value)'), 'the dock height is observed');
console.log('✓ Wiring verified.');

console.log('\n====================================================');
console.log('🎉 ALL DOCK PADDING TESTS PASSED!');
console.log('====================================================');
