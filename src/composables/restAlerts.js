// Rest-timer alerts: sound on/off + level (gap item 2 in the competitor list) and
// a "rest is done" notification that only asks for permission when the user turns it on.
// Storage is injectable so the node tests can run without a browser.

export const SOUND_STORAGE_KEY = 'atiwitch_rest_sound';
export const NOTIFY_STORAGE_KEY = 'atiwitch_rest_notify';

// Multiplier applied to the existing beep gains (0.12 pre-warning, 0.18 completion).
// 'high' = 1 keeps the old sound exactly.
export const SOUND_LEVELS = { low: 0.4, mid: 0.7, high: 1 };
export const SOUND_LEVEL_OPTIONS = [
  { value: 'low', label: 'เบา' },
  { value: 'mid', label: 'กลาง' },
  { value: 'high', label: 'ดัง' }
];
export const DEFAULT_SOUND = Object.freeze({ enabled: true, level: 'high' });

export const NOTIFY_TITLE = 'พักครบแล้ว';
export const NOTIFY_BODY = 'ถึงเวลาเซ็ตถัดไปแล้ว';

// Shown under the notification toggle when turning it on did not work.
export const NOTIFY_STATUS_TEXT = {
  unsupported: 'เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน — ยังมีเสียงและการสั่นในแอป',
  denied: 'ถูกปฏิเสธไว้ — เปิดได้ที่การตั้งค่าของเบราว์เซอร์',
  dismissed: 'ยังไม่ได้อนุญาต — กดเปิดอีกครั้งเพื่อขอสิทธิ์',
  error: 'เปิดการแจ้งเตือนไม่สำเร็จ ลองอีกครั้ง'
};

function storageOf(storage) {
  if (storage) return storage;
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch (e) {
    return null;
  }
}

// ---- Sound ----

export function readSoundSettings(storage) {
  const st = storageOf(storage);
  try {
    const raw = st ? st.getItem(SOUND_STORAGE_KEY) : null;
    if (!raw) return { ...DEFAULT_SOUND };
    const parsed = JSON.parse(raw) || {};
    return {
      enabled: parsed.enabled !== false,
      level: Object.prototype.hasOwnProperty.call(SOUND_LEVELS, parsed.level) ? parsed.level : DEFAULT_SOUND.level
    };
  } catch (e) {
    return { ...DEFAULT_SOUND };
  }
}

/** Merge a patch into the saved sound settings. Invalid values are ignored. */
export function saveSoundSettings(patch, storage) {
  const current = readSoundSettings(storage);
  const next = {
    enabled: typeof patch?.enabled === 'boolean' ? patch.enabled : current.enabled,
    level: Object.prototype.hasOwnProperty.call(SOUND_LEVELS, patch?.level) ? patch.level : current.level
  };
  const st = storageOf(storage);
  try {
    if (st) st.setItem(SOUND_STORAGE_KEY, JSON.stringify(next));
  } catch (e) {}
  return next;
}

/** Gain for a beep: 0 when sound is off, otherwise the base gain scaled by the level. */
export function soundGain(baseGain, settings) {
  if (!settings || !settings.enabled) return 0;
  const mult = SOUND_LEVELS[settings.level] ?? SOUND_LEVELS[DEFAULT_SOUND.level];
  return baseGain * mult;
}

// ---- Notification ----

export function readNotifyEnabled(storage) {
  const st = storageOf(storage);
  try {
    return !!st && st.getItem(NOTIFY_STORAGE_KEY) === '1';
  } catch (e) {
    return false;
  }
}

export function writeNotifyEnabled(on, storage) {
  const st = storageOf(storage);
  try {
    if (st) st.setItem(NOTIFY_STORAGE_KEY, on ? '1' : '0');
  } catch (e) {}
}

function notificationImplOf(NotificationImpl) {
  if (NotificationImpl !== undefined) return NotificationImpl;
  return typeof globalThis.Notification !== 'undefined' ? globalThis.Notification : undefined;
}

/**
 * Called only from the user's tap on the toggle. Asks for permission at most once per
 * tap, never after a denial, and turns the setting on only when permission is granted.
 */
export async function enableRestNotifications({ NotificationImpl, storage } = {}) {
  const N = notificationImplOf(NotificationImpl);
  if (!N) return { ok: false, reason: 'unsupported' };
  let perm = N.permission;
  if (perm === 'denied') return { ok: false, reason: 'denied' };
  if (perm !== 'granted') {
    try {
      // Called synchronously inside the tap handler, so browsers accept the prompt.
      perm = await N.requestPermission();
    } catch (e) {
      return { ok: false, reason: 'error' };
    }
  }
  if (perm === 'granted') {
    writeNotifyEnabled(true, storage);
    return { ok: true, reason: 'granted' };
  }
  writeNotifyEnabled(false, storage);
  return { ok: false, reason: perm === 'denied' ? 'denied' : 'dismissed' };
}

/** Notify only when the user turned it on, the browser allowed it, and the tab is in the background. */
export function shouldNotifyRestDone({ enabled, permission, visibility }) {
  return enabled === true && permission === 'granted' && visibility !== 'visible';
}

/**
 * Show the "rest done" notification. Prefers the service worker (works in the background
 * on phones), falls back to a page Notification, and never throws.
 * Returns 'skipped' | 'sw' | 'page' | 'failed'.
 */
export async function notifyRestDone({
  NotificationImpl,
  swContainer,
  storage,
  visibility
} = {}) {
  const N = notificationImplOf(NotificationImpl);
  const vis = visibility !== undefined
    ? visibility
    : (typeof document !== 'undefined' ? document.visibilityState : undefined);
  const should = shouldNotifyRestDone({
    enabled: readNotifyEnabled(storage),
    permission: N ? N.permission : 'unsupported',
    visibility: vis
  });
  if (!should) return 'skipped';

  const options = { body: NOTIFY_BODY, tag: 'rest-done', renotify: false, icon: './icon-192.png' };
  const sw = swContainer !== undefined
    ? swContainer
    : (typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined);
  try {
    if (sw && typeof sw.getRegistration === 'function') {
      const reg = await sw.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(NOTIFY_TITLE, options);
        return 'sw';
      }
    }
  } catch (e) {}
  try {
    if (N) {
      new N(NOTIFY_TITLE, options);
      return 'page';
    }
  } catch (e) {}
  return 'failed';
}
