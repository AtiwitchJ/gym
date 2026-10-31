import { ref, onMounted, onUnmounted } from 'vue';

const timerDuration = ref(90);
const timerRemaining = ref(90);
const isRunning = ref(false);
let timerEndTime = null;
let intervalId = null;

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    // Audio context may be blocked by autoplay policies
  }
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
  timerRemaining.value = Math.max(0, Math.ceil((timerEndTime - now) / 1000));

  if (timerRemaining.value <= 0) {
    clearInterval(intervalId);
    isRunning.value = false;
    timerEndTime = null;
    playBeep();
    triggerHaptic([250, 120, 250]);
  }
}

function startTimer() {
  if (isRunning.value) return;
  if (timerRemaining.value <= 0) {
    timerRemaining.value = timerDuration.value;
  }
  isRunning.value = true;
  timerEndTime = Date.now() + (timerRemaining.value * 1000);

  clearInterval(intervalId);
  intervalId = setInterval(checkTimerTick, 500);
}

function pauseTimer() {
  if (!isRunning.value) return;
  if (timerEndTime) {
    const now = Date.now();
    timerRemaining.value = Math.max(0, Math.ceil((timerEndTime - now) / 1000));
  }
  isRunning.value = false;
  timerEndTime = null;
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
}

function setTimerDuration(seconds) {
  timerDuration.value = seconds;
  timerRemaining.value = seconds;
  timerEndTime = null;
  clearInterval(intervalId);
  isRunning.value = false;
}

// Background sync on visibility change
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
    setTimerDuration,
    triggerHaptic
  };
}
