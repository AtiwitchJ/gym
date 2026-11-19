import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

// WCAG relative luminance and contrast ratio
function lum(hex) {
  const c = hex.replace('#', '').match(/../g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

console.log('====================================================');
console.log('🧪 QA Test: contrast, minimum text size, and focus ring (accessibility items 1 and 2)');
console.log('====================================================\n');

console.log('▶ [1] The text colours used for small labels pass 4.5:1 on white...');
const WHITE = '#ffffff';
const INK_MUTED = '#4a544f';
const EMERALD_TEXT = '#047857';
const FLAME_TEXT = '#c2410c';
const SKY_TEXT = '#0369a1';
assert.ok(ratio(INK_MUTED, WHITE) >= 4.5, `ink-muted ${ratio(INK_MUTED, WHITE).toFixed(2)}`);
assert.ok(ratio(EMERALD_TEXT, WHITE) >= 4.5, `emerald-text ${ratio(EMERALD_TEXT, WHITE).toFixed(2)}`);
assert.ok(ratio(FLAME_TEXT, WHITE) >= 4.5, `flame-text ${ratio(FLAME_TEXT, WHITE).toFixed(2)}`);
assert.ok(ratio(SKY_TEXT, WHITE) >= 4.5, `sky-text ${ratio(SKY_TEXT, WHITE).toFixed(2)}`);
const tw = read('tailwind.config.js');
assert.ok(tw.includes("'emerald-text': '#047857'") && tw.includes("'flame-text': '#c2410c'") && tw.includes("'sky-text': '#0369a1'"), 'the text variants are in the palette');
console.log('✓ Contrast ratios: ink-muted ' + ratio(INK_MUTED, WHITE).toFixed(1) + ', emerald-text ' + ratio(EMERALD_TEXT, WHITE).toFixed(1) + ', flame-text ' + ratio(FLAME_TEXT, WHITE).toFixed(1) + ', sky-text ' + ratio(SKY_TEXT, WHITE).toFixed(1));

console.log('▶ [2] No text is below 11 px, and no faint or washed-out text colour remains...');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const sources = walk(path.join(root, 'src')).filter((f) => /\.(vue|js)$/.test(f));
const offenders = [];
for (const f of sources) {
  const s = fs.readFileSync(f, 'utf8');
  if (/text-\[(8|9|10)px\]/.test(s)) offenders.push(`${path.relative(root, f)}: small text`);
  if (/text-ink-faint/.test(s)) offenders.push(`${path.relative(root, f)}: faint text`);
  if (/text-ink-muted\/(30|40|60|80)/.test(s)) offenders.push(`${path.relative(root, f)}: washed-out text`);
}
assert.deepStrictEqual(offenders, [], 'no small or faint text left');
console.log('✓ Minimum size and colours verified.');

console.log('▶ [3] The keyboard focus ring is 2 px with at least 3:1 contrast...');
const css = read('src/style.css');
assert.ok(css.includes(':focus-visible {\n  outline: 2px solid #1e2220;\n  outline-offset: 2px;\n}'), 'a 2 px focus ring');
assert.ok(ratio('#1e2220', WHITE) >= 3, `focus ring ${ratio('#1e2220', WHITE).toFixed(1)}:1`);
const outlineNone = sources.filter((f) => /(^|[^-])focus:outline-none/.test(fs.readFileSync(f, 'utf8')));
assert.deepStrictEqual(outlineNone.map((f) => path.relative(root, f)), [], 'no plain focus:outline-none removes the ring');
console.log('✓ Focus ring verified (' + ratio('#1e2220', WHITE).toFixed(1) + ':1).');

console.log('\n====================================================');
console.log('🎉 ALL CONTRAST AND FOCUS TESTS PASSED!');
console.log('====================================================');
