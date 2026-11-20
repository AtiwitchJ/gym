import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Phone rest bar is compact: one 44 px line by default, the detail panel opens on tap,
 * starting a rest or skipping collapses it again, every control stays at 44 px, and the
 * page's bottom padding still follows the measured dock height (useDockPadding).
 * Source-level check; the 390 px heights are measured in the browser (see the commit report).
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Compact rest bar on phones (Manager request, 390 px)');
console.log('====================================================\n');

const rest = read('src/components/RestTimer.vue');
const template = rest.split('<script setup>')[0];

console.log('▶ [1] Default: one 44 px line with time, expand toggle, play/pause...');
assert.ok(/<div\s+class="max-w-3xl mx-auto">/.test(template), 'wrapper present');
assert.ok(/aria-controls="rest-detail"/.test(template), 'toggle controls the detail panel');
assert.ok(/:aria-expanded="expanded \? 'true' : 'false'"/.test(template), 'toggle exposes aria-expanded');
assert.ok(/class="flex items-center gap-2 min-h-\[44px\]"/.test(template), 'collapsed line is 44 px tall');
assert.ok(/sm:pointer-events-none/.test(template), 'toggle is inert on desktop where the panel is always open');
assert.ok(/class="w-4 h-4 ml-auto[^"]*sm:hidden/.test(template), 'expand arrow hidden on desktop');
console.log('  ✓ collapsed line and toggle in place\n');

console.log('▶ [2] Tap the line to expand; the panel is hidden on phones until then...');
assert.ok(/id="rest-detail"\s*\n\s*:class="expanded \? 'flex' : 'hidden'"/.test(template), 'panel shown only when expanded on phones');
assert.ok(/class="sm:flex /.test(template), 'panel always visible from 640 px up');
assert.ok(/@click="toggleExpanded"/.test(template), 'the line toggles the panel');
assert.ok(/const expanded = ref\(false\);/.test(rest), 'starts collapsed');
console.log('  ✓ panel hidden on phones until the line is tapped\n');

console.log('▶ [3] Done (a rest starts) or skip collapses the panel again...');
assert.ok(/watch\(isRunning, \(now, before\) => \{\s*if \(now && !before\) expanded\.value = false;/.test(rest), 'starting a rest collapses');
assert.ok(/function onSkip\(\) \{\s*skipTimer\(\);\s*expanded\.value = false;\s*\}/.test(rest), 'skip collapses');
assert.ok(/@click="onSkip"/.test(template), 'skip button uses onSkip');
console.log('  ✓ start and skip collapse the panel\n');

console.log('▶ [4] Every button and input is at least 44 px in the template...');
const tags = template.match(/<(button|input)\b[\s\S]*?>/g) || [];
assert.ok(tags.length >= 9,`expected the controls to be found, got ${tags.length}`);
for (const tag of tags) {
  const ok = /min-h-\[44px\]/.test(tag) || /h-11/.test(tag);
  assert.ok(ok, `control without a 44 px height: ${tag.slice(0, 120)}`);
}
console.log(`  ✓ ${tags.length} controls checked\n`);

console.log('▶ [5] Bottom padding still follows the measured dock height...');
const app = read('src/App.vue');
assert.ok(/ref="dockEl"/.test(app), 'dock element is measured');
assert.ok(/useDockPadding\(dockEl\)/.test(app), 'App uses the measured padding');
assert.ok(/paddingBottom: dockPadding/.test(app), 'page padding bound to the measured value');
const dock = read('src/composables/useDockPadding.js');
assert.ok(/ResizeObserver/.test(dock), 'ResizeObserver keeps the padding in step when the bar collapses or expands');
console.log('  ✓ padding follows the dock height\n');

console.log('✅ compact rest bar checks passed');
