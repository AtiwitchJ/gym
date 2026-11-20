import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Density step 5 (phone, 390 px): exercise header.
 * - The description (altName) is hidden on phones until "รายละเอียด" is tapped.
 * - The target line is one line on phones (truncated); the second muscle shows from 640 px.
 * - The video thumbnail shows from 640 px; on phones a small chip opens the clip.
 * - The PR button stays at 44 px and sits on the same row as the description toggle.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'src/components/ExerciseCard.vue'), 'utf8');
const template = src.split('<script setup>')[0];

console.log('====================================================');
console.log('🧪 QA Test: Exercise header density on phones (density step 5)');
console.log('====================================================\n');

console.log('▶ [1] Description behind the "รายละเอียด" toggle on phones...');
assert.ok(template.includes(":class=\"showDetail ? 'block' : 'hidden sm:block'\""), 'description hidden on phones unless opened');
assert.ok(template.includes('{{ showDetail ? \'ซ่อนรายละเอียด\' : \'รายละเอียด\' }}'), 'toggle label reads รายละเอียด / ซ่อนรายละเอียด');
const toggleStart = template.indexOf('{{ showDetail ?');
const toggleTag = template.slice(template.lastIndexOf('<button', toggleStart), toggleStart);
assert.ok(toggleTag.includes('sm:hidden') && toggleTag.includes('min-h-[44px]'), 'toggle is phone-only and 44 px');
assert.ok(toggleTag.includes(':aria-expanded="showDetail'), 'toggle exposes aria-expanded');
assert.ok(src.includes('const showDetail = ref(false);'), 'showDetail ref declared');
console.log('  ✓ description behind a 44 px toggle on phones\n');

console.log('▶ [2] PR button stays 44 px, on the same row as the toggle...');
const prStart = template.indexOf('📈 ประวัติ &amp; PR');
const prTag = template.slice(template.lastIndexOf('<button', prStart), prStart);
assert.ok(prTag.includes('min-h-[44px] min-w-[44px]'), 'PR button is 44 px');
assert.ok(template.includes('<div class="flex flex-wrap items-center gap-1 mt-1">'), 'PR and toggle share a row');
console.log('  ✓ PR 44 px, same row as the toggle\n');

console.log('▶ [3] Target line is one line on phones...');
assert.ok(template.includes('class="mt-2 min-w-0 text-[11px] sm:text-xs text-ink-muted flex sm:flex-wrap gap-x-2.5 gap-y-0.5"'), 'target row does not wrap on phones');
assert.ok(template.includes('<span class="truncate min-w-0"><strong class="text-ink font-semibold">เป้าหมาย:</strong>'), 'main target truncates');
assert.ok(template.includes('class="hidden sm:inline text-ink-muted">• {{ exercise.subMuscle }}'), 'second muscle group from 640 px only');
console.log('  ✓ one-line target on phones\n');

console.log('▶ [4] Video: thumbnail from 640 px, a 44 px chip on phones...');
assert.ok(template.includes('class="relative hidden sm:block w-24 sm:w-36 aspect-video'), 'thumbnail hidden on phones');
assert.ok(template.includes('class="sm:hidden min-h-[44px] flex items-center gap-1 text-[11px] font-mono font-bold'), 'phone chip is 44 px and phone-only');
assert.ok(template.includes("▶ 🎬 {{ hasMultiMachineVideos ? '3 เครื่อง' : 'คลิป' }}"), 'chip label');
console.log('  ✓ thumbnail on desktop, chip on phones\n');

console.log('✅ exercise header density checks passed');
