import { ref, onMounted, onUnmounted } from 'vue';

const timerDuration = ref(90);
const timerRemaining = ref(90);
const isRunning = ref(false);
let timerEndTime = null;
let intervalId = null;
let lastBeepSecond = null;

/**
 * Pre-warning short beep at 3, 2, 1 seconds (660Hz E5)
 */
function playPreWarningBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {}
}

/**
 * Completion chord (880Hz A5 + 1046Hz C6)
 */
function playCompletionChord() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    [880, 1046.5].forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    });
  } catch (e) {}
}

function triggerHaptic(pattern = [200, 100, 200]) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function checkTimerTick() {
  if (!isRunning.value || !timerEndTime) return;
  const now = Date.now();
  const remaining = Math.max(0, Math.ceil((timerEndTime - now) / 1000));
  timerRemaining.value = remaining;

  // 3, 2, 1 Pre-warning Countdown
  if (remaining >= 1 && remaining <= 3 && lastBeepSecond !== remaining) {
    lastBeepSecond = remaining;
    playPreWarningBeep();
    triggerHaptic(40);
  }

  if (timerRemaining.value <= 0) {
    clearInterval(intervalId);
    isRunning.value = false;
    timerEndTime = null;
    lastBeepSecond = null;
    playCompletionChord();
    triggerHaptic([250, 120, 250]);
  }
}

function startTimer() {
  if (isRunning.value) return;
  if (timerRemaining.value <= 0) {
    timerRemaining.value = timerDuration.value;
  }
  isRunning.value = true;
  lastBeepSecond = null;
  timerEndTime = Date.now() + (timerRemaining.value * 1000);

  clearInterval(intervalId);
  intervalId = setInterval(checkTimerTick, 500);
  if (intervalId && typeof intervalId.unref === 'function') {
    intervalId.unref();
  }
}

function pauseTimer() {
  if (!isRunning.value) return;
  if (timerEndTime) {
    const now = Date.now();
    timerRemaining.value = Math.max(0, Math.ceil((timerEndTime - now) / 1000));
  }
  isRunning.value = false;
  timerEndTime = null;
  lastBeepSecond = null;
  clearInterval(intervalId);
}

function toggleTimer() {
  if (isRunning.value) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function resetTimer() {
  pauseTimer();
  timerRemaining.value = timerDuration.value;
  timerEndTime = null;
  lastBeepSecond = null;
}

/** Skip the rest now: stop the countdown and set it to 0 (no completion sound). */
function skipTimer() {
  pauseTimer();
  timerRemaining.value = 0;
  timerEndTime = null;
  lastBeepSecond = null;
}

function setTimerDuration(seconds) {
  timerDuration.value = seconds;
  timerRemaining.value = seconds;
  timerEndTime = null;
  lastBeepSecond = null;
  clearInterval(intervalId);
  isRunning.value = false;
}

/**
 * Adjust remaining seconds dynamically (+30s, -15s)
 */
function adjustRemaining(delta) {
  triggerHaptic(20);
  const current = timerRemaining.value;
  const next = Math.max(0, current + delta);
  timerRemaining.value = next;
  if (isRunning.value && timerEndTime) {
    timerEndTime += delta * 1000;
  }
  if (next <= 0 && isRunning.value) {
    checkTimerTick();
  }
}

// Background sync on visibility change & tab focus
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isRunning.value) {
      checkTimerTick();
    }
  });
  window.addEventListener('focus', () => {
    if (isRunning.value) checkTimerTick();
  });
}

export function useTimer() {
  return {
    timerDuration,
    timerRemaining,
    isRunning,
    formatTime,
    startTimer,
    pauseTimer,
    toggleTimer,
    resetTimer,
    skipTimer,
    setTimerDuration,
    adjustRemaining,
    triggerHaptic
  };
}
