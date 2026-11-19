import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readSoundSettings,
  saveSoundSettings,
  soundGain,
  readNotifyEnabled,
  writeNotifyEnabled,
  enableRestNotifications,
  shouldNotifyRestDone,
  notifyRestDone,
  SOUND_STORAGE_KEY,
  NOTIFY_STORAGE_KEY,
  NOTIFY_TITLE,
  DEFAULT_SOUND
} from '../src/composables/restAlerts.js';
import { useTimer } from '../src/composables/useTimer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    raw: data
  };
}

// Browser globals the timer touches: localStorage, window.AudioContext, document.
const storage = memoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });

const audioNodes = { contexts: 0, gains: [] };
class FakeAudioContext {
  constructor() {
    audioNodes.contexts += 1;
    this.currentTime = 0;
    this.destination = {};
  }
  createOscillator() {
    return { type: '', frequency: { setValueAtTime() {} }, connect() {}, start() {}, stop() {} };
  }
  createGain() {
    const node = {
      gain: {
        value: null,
        setValueAtTime(v) { this.value = v; },
        exponentialRampToValueAtTime() {}
      },
      connect() {}
    };
    audioNodes.gains.push(node);
    return node;
  }
}
globalThis.window = { AudioContext: FakeAudioContext };

function resetAudio() {
  audioNodes.contexts = 0;
  audioNodes.gains = [];
}

const { setTimerDuration, startTimer, adjustRemaining, isRunning } = useTimer();

// Finish a rest through the real completion path (adjustRemaining to zero while running).
function finishRest() {
  setTimerDuration(10);
  startTimer();
  adjustRemaining(-10);
}

const flush = () => new Promise((r) => setTimeout(r, 0));

console.log('====================================================');
console.log('🧪 QA Test: Rest sound settings and rest-done notification (gap item 2)');
console.log('====================================================\n');

console.log('▶ [1] Sound defaults to on / high; saved values come back; bad values fall back...');
storage.raw.clear();
assert.deepStrictEqual(readSoundSettings(storage), { enabled: true, level: 'high' });
assert.deepStrictEqual(saveSoundSettings({ enabled: false }, storage), { enabled: false, level: 'high' });
assert.deepStrictEqual(readSoundSettings(storage), { enabled: false, level: 'high' });
saveSoundSettings({ level: 'low' }, storage);
assert.strictEqual(readSoundSettings(storage).level, 'low');
saveSoundSettings({ level: 'loud-please' }, storage);
assert.strictEqual(readSoundSettings(storage).level, 'low', 'unknown level must be ignored');
storage.setItem(SOUND_STORAGE_KEY, '{not json');
assert.deepStrictEqual(readSoundSettings(storage), { ...DEFAULT_SOUND }, 'corrupt JSON -> defaults');
console.log('  ✓ defaults, save, reload and invalid values behave\n');

console.log('▶ [2] Gain: off = 0, high = original gain, low stays audible and below the original...');
assert.strictEqual(soundGain(0.18, { enabled: false, level: 'high' }), 0);
assert.strictEqual(soundGain(0.18, { enabled: true, level: 'high' }), 0.18);
assert.strictEqual(soundGain(0.12, { enabled: true, level: 'high' }), 0.12);
const low = soundGain(0.18, { enabled: true, level: 'low' });
assert.ok(low > 0.05 && low < 0.18, `low gain should be audible and quieter, got ${low}`);
console.log('  ✓ off = 0, high unchanged, low audible (' + low.toFixed(3) + ')\n');

console.log('▶ [3] Timer: sound off -> no AudioContext for the completion chord...');
storage.raw.clear();
saveSoundSettings({ enabled: false }, storage);
resetAudio();
finishRest();
assert.strictEqual(isRunning.value, false, 'rest should be finished');
assert.strictEqual(audioNodes.contexts, 0, 'muted rest must not create audio');
console.log('  ✓ no audio created while muted\n');

console.log('▶ [4] Timer: level low scales the completion gains (0.18 × 0.4)...');
storage.raw.clear();
saveSoundSettings({ enabled: true, level: 'low' }, storage);
resetAudio();
finishRest();
assert.strictEqual(audioNodes.contexts, 1);
assert.strictEqual(audioNodes.gains.length, 2, 'completion chord has two tones');
for (const g of audioNodes.gains) {
  assert.ok(Math.abs(g.gain.value - 0.072) < 1e-9, `expected 0.072, got ${g.gain.value}`);
}
console.log('  ✓ both tones at 0.072\n');

console.log('▶ [5] Timer: default level keeps the original completion gain (0.18)...');
storage.raw.clear();
resetAudio();
finishRest();
assert.ok(audioNodes.gains.length === 2 && audioNodes.gains.every((g) => g.gain.value === 0.18));
console.log('  ✓ default sound unchanged\n');

console.log('▶ [6] Enabling notifications: unsupported, denied, accepted, dismissed, error...');
const savedNotification = globalThis.Notification;
delete globalThis.Notification;
let st = memoryStorage();
assert.deepStrictEqual(await enableRestNotifications({ storage: st }), { ok: false, reason: 'unsupported' });
assert.strictEqual(readNotifyEnabled(st), false);

let asks = 0;
const deniedN = { permission: 'denied', requestPermission: async () => { asks += 1; return 'granted'; } };
assert.deepStrictEqual(await enableRestNotifications({ NotificationImpl: deniedN, storage: st }), { ok: false, reason: 'denied' });
assert.strictEqual(asks, 0, 'never ask again after a denial');
assert.strictEqual(readNotifyEnabled(st), false);

const acceptN = { permission: 'default', requestPermission: async () => { asks += 1; return 'granted'; } };
assert.deepStrictEqual(await enableRestNotifications({ NotificationImpl: acceptN, storage: st }), { ok: true, reason: 'granted' });
assert.strictEqual(asks, 1, 'asked exactly once');
assert.strictEqual(readNotifyEnabled(st), true);

st = memoryStorage();
const dismissN = { permission: 'default', requestPermission: async () => 'default' };
assert.deepStrictEqual(await enableRestNotifications({ NotificationImpl: dismissN, storage: st }), { ok: false, reason: 'dismissed' });
assert.strictEqual(readNotifyEnabled(st), false);

const throwN = { permission: 'default', requestPermission: async () => { throw new Error('boom'); } };
assert.deepStrictEqual(await enableRestNotifications({ NotificationImpl: throwN, storage: st }), { ok: false, reason: 'error' });
assert.strictEqual(readNotifyEnabled(st), false);
globalThis.Notification = savedNotification;
console.log('  ✓ no prompt after denial; only an accepted tap turns it on\n');

console.log('▶ [7] Notify only when on, granted, and the tab is in the background...');
assert.strictEqual(shouldNotifyRestDone({ enabled: true, permission: 'granted', visibility: 'hidden' }), true);
assert.strictEqual(shouldNotifyRestDone({ enabled: true, permission: 'granted', visibility: 'visible' }), false);
assert.strictEqual(shouldNotifyRestDone({ enabled: false, permission: 'granted', visibility: 'hidden' }), false);
assert.strictEqual(shouldNotifyRestDone({ enabled: true, permission: 'denied', visibility: 'hidden' }), false);
assert.strictEqual(shouldNotifyRestDone({ enabled: true, permission: 'default', visibility: 'hidden' }), false);
console.log('  ✓ decision table holds\n');

console.log('▶ [8] Sending: service worker first, page Notification second, never throws...');
const shown = [];
const sw = {
  getRegistration: async () => ({ showNotification: async (title, opts) => { shown.push(['sw', title, opts.tag]); } })
};
class PageN { constructor(title, opts) { shown.push(['page', title, opts.tag]); } }
PageN.permission = 'granted';
writeNotifyEnabled(true, storage);
assert.strictEqual(await notifyRestDone({ NotificationImpl: PageN, swContainer: sw, storage, visibility: 'hidden' }), 'sw');
assert.strictEqual(await notifyRestDone({ NotificationImpl: PageN, swContainer: {}, storage, visibility: 'hidden' }), 'page');
assert.strictEqual(await notifyRestDone({ NotificationImpl: PageN, swContainer: undefined, storage, visibility: 'visible' }), 'skipped');
writeNotifyEnabled(false, storage);
assert.strictEqual(await notifyRestDone({ NotificationImpl: PageN, swContainer: sw, storage, visibility: 'hidden' }), 'skipped');
writeNotifyEnabled(true, storage);
class BrokenN { static permission = 'granted'; constructor() { throw new Error('no notifications here'); } }
assert.strictEqual(await notifyRestDone({ NotificationImpl: BrokenN, swContainer: {}, storage, visibility: 'hidden' }), 'failed');
assert.deepStrictEqual(shown.map((s) => s[0]), ['sw', 'page'], 'sw path and page path both used once');
assert.ok(shown.every((s) => s[1] === NOTIFY_TITLE && s[2] === 'rest-done'));
console.log('  ✓ sw → page → failed fallback without an error\n');

console.log('▶ [9] One rest finished = one notification, even if the timer ticks again...');
globalThis.Notification = PageN;
globalThis.document = { visibilityState: 'hidden', addEventListener() {} };
writeNotifyEnabled(true, storage);
const before = shown.length;
finishRest();
await flush();
adjustRemaining(0);
await flush();
assert.strictEqual(shown.length - before, 1, 'exactly one notification per finished rest');
delete globalThis.document;
delete globalThis.Notification;
console.log('  ✓ one notification per rest\n');

console.log('▶ [10] Permission is only requested from the settings tap; service worker handles clicks...');
const srcRoot = path.join(root, 'src');
const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(js|vue)$/.test(name)) files.push(p);
  }
})(srcRoot);
const asking = files.filter((f) => fs.readFileSync(f, 'utf8').includes('requestPermission'));
assert.deepStrictEqual(asking.map((f) => path.relative(root, f)), ['src/composables/restAlerts.js']);
const swSource = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
assert.ok(swSource.includes("addEventListener('notificationclick'"), 'sw.js needs a notificationclick handler');
assert.ok(!swSource.includes('requestPermission'), 'the service worker must not ask for permission');
console.log('  ✓ only restAlerts.js asks; sw.js handles the click\n');

console.log('✅ rest sound and notification checks passed');
