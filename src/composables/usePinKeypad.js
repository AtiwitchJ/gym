import { ref, computed, watch } from 'vue';

// Entry draft (data-integrity fix): the value being typed is kept until OK, so a reload restores it.
export const KEYPAD_DRAFT_KEY = 'atiwitch_keypad_draft';
let currentDraftKey = null;

function defaultStorage() {
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

export function saveKeypadDraft(draft, storage = defaultStorage()) {
  if (storage) storage.setItem(KEYPAD_DRAFT_KEY, JSON.stringify(draft));
}

export function readKeypadDraft(storage = defaultStorage()) {
  try {
    const raw = storage ? storage.getItem(KEYPAD_DRAFT_KEY) : null;
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function clearKeypadDraft(storage = defaultStorage()) {
  if (storage) storage.removeItem(KEYPAD_DRAFT_KEY);
}

/**
 * Put a saved entry draft back into the day state (weight or reps of one set).
 * It only sets the typed value; it never writes history. Returns true when something was restored.
 */
export function applyKeypadDraft(state, draft) {
  if (!draft || !draft.draftKey) return false;
  const { dayKey, exId, field, setIdx } = draft.draftKey;
  if (!dayKey || !exId || (field !== 'wt' && field !== 'reps') || setIdx === undefined || setIdx === null) return false;
  if (draft.value === undefined || draft.value === null || draft.value === '') return false;
  state[dayKey] = state[dayKey] || {};
  state[dayKey][exId] = state[dayKey][exId] || {};
  state[dayKey][exId][`${field}_${setIdx}`] = String(draft.value);
  return true;
}

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

// Keep the draft in step with what is typed while the keypad is open.
watch(displayValue, (value) => {
  if (isOpen.value && currentDraftKey) {
    saveKeypadDraft({ draftKey: currentDraftKey, mode: mode.value, value });
  }
});

// Review fix: the first digit after opening replaces the pre-filled value (35 + 1 was 351, then 3510).
let freshEntry = false;
// Review fix: no entry can go above these limits, so a typo like 3510 kg cannot be typed or saved.
export const MAX_WEIGHT_INPUT = 400;
export const MAX_REPS_INPUT = 99;

/**
 * Detects whether entered weight is an abnormal typo compared to previous record
 * e.g. entering 2 kg while previous was 20 kg (too low, missing zero)
 * or entering 200 kg while previous was 20 kg (too high, extra zero)
 * or < 5 kg on a machine/cable exercise
 */
export function detectWeightAnomaly(currentWeight, prevWeight, exerciseTitle = '', exerciseSubtitle = '', unitStr = 'กก.') {
  const curr = parseFloat(currentWeight);
  const prev = parseFloat(prevWeight);

  if (isNaN(curr) || curr <= 0) {
    return { isAnomaly: false, reason: null, type: null };
  }

  // Check if machine or cable exercise
  const combined = `${exerciseTitle || ''} ${exerciseSubtitle || ''}`.toLowerCase();
  const isDumbbellOnly = (unitStr && unitStr.includes('ข้าง')) || (combined.includes('dumbbell') && !combined.includes('cable') && !combined.includes('machine'));
  const isMachineOrCable = !isDumbbellOnly;

  // 1. Differ from previous record by > 50% (either drop > 50% or spike > 50%)
  if (!isNaN(prev) && prev > 0) {
    const diff = Math.abs(curr - prev) / prev;
    if (diff > 0.5) {
      const percentStr = Math.round(diff * 100);
      return {
        isAnomaly: true,
        type: curr < prev ? 'too_low' : 'too_high',
        ratio: Math.round((curr / prev) * 100),
        reason: curr < prev
          ? `ค่าน้ำหนัก ${curr} ${unitStr || 'กก.'} น้อยกว่าครั้งก่อน (${prev} ${unitStr || 'กก.'}) มากผิดปกติ (${percentStr}% ต่างกันเกิน 50% อาจลืมพิมพ์เลข 0)`
          : `ค่าน้ำหนัก ${curr} ${unitStr || 'กก.'} มากกว่าครั้งก่อน (${prev} ${unitStr || 'กก.'}) มากผิดปกติ (${percentStr}% ต่างกันเกิน 50% อาจพิมพ์เลข 0 เกิน)`
      };
    }
  }

  // 2. Abnormally low weight (< 5 kg) for machine / cable
  if (isMachineOrCable && curr < 5) {
    return {
      isAnomaly: true,
      type: 'too_low',
      reason: `ค่าน้ำหนัก ${curr} ${unitStr || 'กก.'} ต่ำผิดปกติสำหรับท่าแมชชีน/เคเบิล (< 5 กก.)`
    };
  }

  // 3. Absolute extreme weight (> 400 kg)
  if (curr > 400) {
    return {
      isAnomaly: true,
      type: 'too_high',
      reason: `น้ำหนัก ${curr} ${unitStr || 'กก.'} สูงผิดปกติ กรุณาตรวจสอบอีกครั้ง`
    };
  }

  return { isAnomaly: false, reason: null, type: null };
}

const anomalyInfo = computed(() => {
  if (mode.value !== 'weight') {
    return { isAnomaly: false, reason: null, type: null };
  }
  return detectWeightAnomaly(displayValue.value, prevHint.value, title.value, subtitle.value, unit.value);
});

const isAbnormal = computed(() => anomalyInfo.value.isAnomaly);
const anomalyWarning = computed(() => anomalyInfo.value.reason || '');

let confirmPromptHandler = null;

export function setConfirmPromptHandler(handler) {
  confirmPromptHandler = handler;
}

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
  freshEntry = true;
  currentDraftKey = config.draftKey || null;
  onConfirmCallback = config.onConfirm || null;
  isOpen.value = true;
  triggerHaptic(30);
}

function closeKeypad() {
  isOpen.value = false;
  currentDraftKey = null;
  clearKeypadDraft();
  guardAcknowledged.value = false;
  onConfirmCallback = null;
}

function append(digit) {
  triggerHaptic(20);
  guardAcknowledged.value = false;

  // The first digit after opening starts a new number (the pre-filled value is replaced).
  if (freshEntry && !(digit === '.' && mode.value === 'reps')) {
    freshEntry = false;
    displayValue.value = '';
  }

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

  // Hard limit: an entry above the cap is refused, so it cannot be saved (review fix).
  const limit = mode.value === 'reps' ? MAX_REPS_INPUT : MAX_WEIGHT_INPUT;
  const candidate = displayValue.value + String(digit);
  if (Number(candidate) > limit) return;

  displayValue.value = candidate;
}

function backspace() {
  triggerHaptic(20);
  guardAcknowledged.value = false;
  freshEntry = false;
  if (displayValue.value.length > 0) {
    displayValue.value = displayValue.value.slice(0, -1);
  }
}

function clear() {
  triggerHaptic(20);
  guardAcknowledged.value = false;
  freshEntry = false;
  displayValue.value = '';
}

function adjust(delta) {
  triggerHaptic(25);
  guardAcknowledged.value = false;
  freshEntry = false;
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
  freshEntry = false;
  displayValue.value = String(val);
}

function confirm(force = false) {
  triggerHaptic(35);

  // Guard against abnormal weight entry
  if (mode.value === 'weight' && isAbnormal.value && !guardAcknowledged.value && !force) {
    if (confirmPromptHandler) {
      const ok = confirmPromptHandler(anomalyWarning.value);
      if (!ok) return false;
      // If confirmed through handler, proceed with saving
    } else if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const ok = window.confirm(`[แจ้งเตือนตรวจสอบน้ำหนัก]\n${anomalyWarning.value}\n\nคุณแน่ใจหรือไม่ว่าต้องการใช้ค่าน้ำหนักนี้?`);
      if (!ok) {
        guardAcknowledged.value = false;
        return false;
      }
    } else {
      guardAcknowledged.value = true;
      return false;
    }
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
    confirm,
    detectWeightAnomaly,
    setConfirmPromptHandler
  };
}
