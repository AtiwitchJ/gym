import { ref, computed } from 'vue';

export const BAR_PRESETS = [
  { id: 'olympic_20', name: 'บาร์มาตรฐาน (Olympic)', weight: 20 },
  { id: 'olympic_15', name: 'บาร์สตรี / เทคนิค (Women/Tech)', weight: 15 },
  { id: 'ez_curl_10', name: 'บาร์หยัก (EZ-Curl)', weight: 10 },
  { id: 'trap_bar_25', name: 'บาร์หกเหลี่ยม (Trap Bar)', weight: 25 },
  { id: 'smith_machine_11', name: 'สมิทแมชชีน (Smith Machine)', weight: 11 }
];

export const AVAILABLE_PLATES = [
  { weight: 25, color: '#DC2626', textColor: '#FFFFFF', name: '25 kg', heightClass: 'h-28 sm:h-32', widthClass: 'w-7 sm:w-8' },
  { weight: 20, color: '#2563EB', textColor: '#FFFFFF', name: '20 kg', heightClass: 'h-28 sm:h-32', widthClass: 'w-6 sm:w-7' },
  { weight: 15, color: '#EAB308', textColor: '#000000', name: '15 kg', heightClass: 'h-24 sm:h-28', widthClass: 'w-5 sm:w-6' },
  { weight: 10, color: '#16A34A', textColor: '#FFFFFF', name: '10 kg', heightClass: 'h-20 sm:h-24', widthClass: 'w-5 sm:w-5' },
  { weight: 5,  color: '#FFFFFF', textColor: '#1E2220', name: '5 kg',  heightClass: 'h-16 sm:h-18', widthClass: 'w-4 sm:w-4', border: true },
  { weight: 2.5,color: '#DC2626', textColor: '#FFFFFF', name: '2.5',   heightClass: 'h-12 sm:h-14', widthClass: 'w-3.5 sm:w-3.5' },
  { weight: 1.25,color: '#16A34A', textColor: '#FFFFFF', name: '1.25', heightClass: 'h-10 sm:h-11', widthClass: 'w-3 sm:w-3' }
];

/**
 * Greedily calculate plates required per side
 * @param {number|string} targetTotalWeight 
 * @param {number} barWeight 
 */
export function calculatePlates(targetTotalWeight, barWeight = 20) {
  const target = Math.max(0, parseFloat(targetTotalWeight) || 0);
  const bar = parseFloat(barWeight) || 0;

  if (target <= bar) {
    return {
      success: true,
      targetWeight: target,
      barWeight: bar,
      perSideWeight: 0,
      platesPerSide: [],
      plateSummary: [],
      remainder: 0,
      achievedTotal: bar
    };
  }

  const sideTarget = Math.round(((target - bar) / 2) * 100) / 100;
  let currentRemainder = sideTarget;
  const allocatedPlates = [];

  for (const plate of AVAILABLE_PLATES) {
    while (currentRemainder >= plate.weight - 0.001) {
      allocatedPlates.push(plate);
      currentRemainder = Math.round((currentRemainder - plate.weight) * 100) / 100;
    }
  }

  const achievedSide = Math.round(allocatedPlates.reduce((sum, p) => sum + p.weight, 0) * 100) / 100;
  const achievedTotal = Math.round((bar + achievedSide * 2) * 100) / 100;

  // Group summary (e.g. 20kg x 2, 5kg x 1)
  const countMap = new Map();
  for (const p of allocatedPlates) {
    countMap.set(p.weight, (countMap.get(p.weight) || 0) + 1);
  }
  const plateSummary = Array.from(countMap.entries()).map(([wt, count]) => {
    const meta = AVAILABLE_PLATES.find(p => p.weight === wt);
    return {
      weight: wt,
      count,
      color: meta ? meta.color : '#64748b',
      textColor: meta ? meta.textColor : '#ffffff'
    };
  });

  return {
    success: true,
    targetWeight: target,
    barWeight: bar,
    perSideWeight: achievedSide,
    platesPerSide: allocatedPlates,
    plateSummary,
    remainder: Math.round(currentRemainder * 100) / 100,
    achievedTotal
  };
}

// Reactive singleton state for the modal
const isOpen = ref(false);
const targetWeight = ref(60);
const selectedBar = ref(BAR_PRESETS[0]);
let onApplyCallback = null;

const calculation = computed(() => {
  return calculatePlates(targetWeight.value, selectedBar.value.weight);
});

export function usePlateCalculator() {
  function openPlateCalculator(initialWeight = 60, onApply = null) {
    const parsed = parseFloat(initialWeight);
    targetWeight.value = !isNaN(parsed) && parsed > 0 ? parsed : 60;
    onApplyCallback = onApply;
    isOpen.value = true;
  }

  function closePlateCalculator() {
    isOpen.value = false;
    onApplyCallback = null;
  }

  function setTargetWeight(val) {
    const num = parseFloat(val);
    targetWeight.value = isNaN(num) ? 0 : Math.max(0, num);
  }

  function adjustWeight(delta) {
    const next = Math.max(0, (parseFloat(targetWeight.value) || 0) + delta);
    targetWeight.value = Math.round(next * 100) / 100;
  }

  function selectBarPreset(bar) {
    selectedBar.value = bar;
  }

  function applyWeight() {
    if (onApplyCallback) {
      onApplyCallback(targetWeight.value);
    }
    closePlateCalculator();
  }

  return {
    isOpen,
    targetWeight,
    selectedBar,
    barPresets: BAR_PRESETS,
    availablePlates: AVAILABLE_PLATES,
    calculation,
    openPlateCalculator,
    closePlateCalculator,
    setTargetWeight,
    adjustWeight,
    selectBarPreset,
    applyWeight,
    calculatePlates
  };
}
