import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Desktop wheel scrolling. overflow-x: hidden on html, body or main makes them scroll containers,
 * and overscroll-behavior-y: none on body stops the wheel from reaching the page. The main column
 * then does not scroll with the mouse wheel. Use overflow-x: clip, and do not set overscroll to none.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8');
const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');

console.log('====================================================');
console.log('🧪 QA Test: Scroll containers (desktop wheel scrolls the page)');
console.log('====================================================\n');

// Declarations inside a plain `selector { ... }` block of the stylesheet.
function blockOf(source, selector) {
  const re = new RegExp(`(^|[\\s}])${selector}\\s*\\{([^}]*)\\}`, 'g');
  const found = [];
  let m;
  while ((m = re.exec(source)) !== null) found.push(m[2]);
  return found.join('\n');
}

const html = blockOf(css, 'html');
const body = blockOf(css, 'body');
const mainClass = (app.match(/<main\b[\s\S]*?class="([^"]*)"/) || [])[1] || '';

const BAD_OVERFLOW = /overflow(-x|-y)?\s*:\s*(hidden|scroll|auto)\b/;
const BAD_OVERSCROLL = /overscroll-behavior(-y)?\s*:\s*none/;

console.log('▶ [1] html, body and main do not use overflow hidden / scroll / auto...');
assert.ok(html.length > 0, 'html rule found in style.css');
assert.ok(body.length > 0, 'body rule found in style.css');
assert.ok(!BAD_OVERFLOW.test(html), `html must not set overflow: ${html.trim()}`);
assert.ok(!BAD_OVERFLOW.test(body), `body must not set overflow: ${body.trim()}`);
assert.ok(!/overflow-x-hidden|overflow-hidden|overflow-y-hidden|overflow-x-scroll|overflow-x-auto/.test(mainClass), `main class must not use an overflow-hidden/scroll/auto class: "${mainClass}"`);
console.log('  ✓ no hidden/scroll/auto overflow on html, body or main\n');

console.log('▶ [2] overscroll-behavior-y is not none on html, body or main...');
assert.ok(!BAD_OVERSCROLL.test(html), 'html must not set overscroll-behavior none');
assert.ok(!BAD_OVERSCROLL.test(body), 'body must not set overscroll-behavior none');
assert.ok(!/overscroll-(y-)?none/.test(mainClass), 'main must not set overscroll none');
console.log('  ✓ overscroll is not none\n');

console.log('▶ [3] The intended fix is in place: overflow-x clip on html, body and main...');
assert.ok(/overflow-x:\s*clip/.test(html), 'html: overflow-x: clip');
assert.ok(/overflow-x:\s*clip/.test(body), 'body: overflow-x: clip');
assert.ok(/\boverflow-x-clip\b/.test(mainClass), 'main: overflow-x-clip');
console.log('  ✓ clip on all three\n');

console.log('✅ scroll container checks passed');
