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
const guardAcknowledged = ref(false);
let onConfirmCallback = null;

/**
 * Detects whether entered weight is an abnormal typo compared to previous record
 * e.g. entering 2 kg while previous was 20 kg (too low, missing zero)
 * or entering 200 kg while previous was 20 kg (too high, extra zero)
 */
export function detectWeightAnomaly(currentWeight, prevWeight) {
  const curr = parseFloat(currentWeight);
  const prev = parseFloat(prevWeight);

  if (isNaN(curr) || curr <= 0) {
    return { isAnomaly: false, reason: null, type: null };
  }

  // Without previous record, flag extreme absolute weight (> 400 kg)
  if (isNaN(prev) || prev <= 0) {
    if (curr > 400) {
      return {
        isAnomaly: true,
        type: 'extreme_high',
        reason: `น้ำหนัก ${curr} กก. สูงผิดปกติ กรุณาตรวจสอบอีกครั้ง`
      };
    }
    return { isAnomaly: false, reason: null, type: null };
  }

  // Significant drop: <= 40% of previous weight (e.g. 2 kg vs 20 kg, or 5 kg vs 50 kg)
  if (curr <= prev * 0.4) {
    return {
      isAnomaly: true,
      type: 'too_low',
      ratio: Math.round((curr / prev) * 100),
      reason: `ค่าน้ำหนัก ${curr} กก. น้อยกว่าครั้งก่อน (${prev} กก.) มากผิดปกติ (อาจลืมพิมพ์เลข 0)`
    };
  }

  // Significant spike: >= 2.5x of previous weight (e.g. 200 kg vs 20 kg)
  if (curr >= prev * 2.5) {
    return {
      isAnomaly: true,
      type: 'too_high',
      ratio: Math.round((curr / prev) * 100),
      reason: `ค่าน้ำหนัก ${curr} กก. มากกว่าครั้งก่อน (${prev} กก.) มากผิดปกติ (อาจพิมพ์เลข 0 เกิน)`
    };
  }

  return { isAnomaly: false, reason: null, type: null };
}

const anomalyInfo = computed(() => {
  if (mode.value !== 'weight') {
    return { isAnomaly: false, reason: null, type: null };
  }
  return detectWeightAnomaly(displayValue.value, prevHint.value);
});

const isAbnormal = computed(() => anomalyInfo.value.isAnomaly);
const anomalyWarning = computed(() => anomalyInfo.value.reason || '');

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
  guardAcknowledged.value = false;
  onConfirmCallback = config.onConfirm || null;
  isOpen.value = true;
  triggerHaptic(30);
}

function closeKeypad() {
  isOpen.value = false;
  guardAcknowledged.value = false;
  onConfirmCallback = null;
}

function append(digit) {
  triggerHaptic(20);
  guardAcknowledged.value = false;

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
  guardAcknowledged.value = false;
  if (displayValue.value.length > 0) {
    displayValue.value = displayValue.value.slice(0, -1);
  }
}

function clear() {
  triggerHaptic(20);
  guardAcknowledged.value = false;
  displayValue.value = '';
}

function adjust(delta) {
  triggerHaptic(25);
  guardAcknowledged.value = false;
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
  guardAcknowledged.value = false;
  displayValue.value = String(val);
}

function confirm(force = false) {
  triggerHaptic(35);

  // Guard against abnormal weight entry
  if (mode.value === 'weight' && isAbnormal.value && !guardAcknowledged.value && !force) {
    guardAcknowledged.value = true;
    return false;
  }

  if (onConfirmCallback) {
    onConfirmCallback(displayValue.value);
  }
  closeKeypad();
  return true;
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
    isAbnormal,
    anomalyWarning,
    guardAcknowledged,
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
