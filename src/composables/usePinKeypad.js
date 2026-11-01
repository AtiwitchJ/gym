import { ref, computed } from 'vue';

const isOpen = ref(false);
const title = ref('');
const subtitle = ref('');
const mode = ref('weight'); // 'weight' or 'reps'
const unit = ref('กก.');
const displayValue = ref('');
const targetHint = ref('');
const prevHint = ref('');
const suggestedHint = ref('');
const suggestedLabel = ref('');
const presets = ref([]);
let onConfirmCallback = null;

function triggerHaptic(duration = 25) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch (e) {}
  }
}

function openKeypad(config) {
  title.value = config.title || '';
  subtitle.value = config.subtitle || '';
  mode.value = config.mode || 'weight';
  unit.value = config.unit || (mode.value === 'weight' ? 'กก.' : 'ครั้ง');
  displayValue.value = config.currentValue !== undefined && config.currentValue !== null ? String(config.currentValue) : '';
  targetHint.value = config.targetHint || '';
  prevHint.value = config.prevHint || '';
  suggestedHint.value = config.suggestedHint !== undefined && config.suggestedHint !== null ? String(config.suggestedHint) : '';
  suggestedLabel.value = config.suggestedLabel || '';
  presets.value = config.presets || (mode.value === 'weight' ? [1.25, 2.5, 5, -2.5] : [1, 2, -1]);
  onConfirmCallback = config.onConfirm || null;
  isOpen.value = true;
  triggerHaptic(30);
}

function closeKeypad() {
  isOpen.value = false;
  onConfirmCallback = null;
}

function append(digit) {
  triggerHaptic(20);
  if (digit === '.') {
    if (mode.value === 'reps') return; // no decimals for reps
    if (displayValue.value.includes('.')) return;
    if (displayValue.value === '') {
      displayValue.value = '0.';
      return;
    }
  }

  // Prevent multiple leading zeroes
  if (displayValue.value === '0' && digit !== '.') {
    displayValue.value = String(digit);
    return;
  }

  // Max length check (e.g. 6 chars max)
  if (displayValue.value.length >= 6) return;

  displayValue.value += String(digit);
}

function backspace() {
  triggerHaptic(20);
  if (displayValue.value.length > 0) {
    displayValue.value = displayValue.value.slice(0, -1);
  }
}

function clear() {
  triggerHaptic(20);
  displayValue.value = '';
}

function adjust(delta) {
  triggerHaptic(25);
  const current = parseFloat(displayValue.value) || 0;
  const next = Math.max(0, current + delta);
  if (mode.value === 'reps') {
    displayValue.value = String(Math.round(next));
  } else {
    // Round to 1 decimal place if needed
    displayValue.value = String(Math.round(next * 10) / 10);
  }
}

function setValue(val) {
  triggerHaptic(25);
  displayValue.value = String(val);
}

function confirm() {
  triggerHaptic(35);
  if (onConfirmCallback) {
    onConfirmCallback(displayValue.value);
  }
  closeKeypad();
}

export function usePinKeypad() {
  return {
    isOpen,
    title,
    subtitle,
    mode,
    unit,
    displayValue,
    targetHint,
    prevHint,
    suggestedHint,
    suggestedLabel,
    presets,
    openKeypad,
    closeKeypad,
    append,
    backspace,
    clear,
    adjust,
    setValue,
    confirm
  };
}
