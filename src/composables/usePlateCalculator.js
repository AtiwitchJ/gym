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

export const PLATE_INVENTORY_STORAGE_KEY = 'gym_plate_inventory_v1';

// Default inventory: standard pairs per plate weight in a well-equipped gym
export const DEFAULT_PLATE_INVENTORY = {
  25: 4,
  20: 4,
  15: 2,
  10: 2,
  5: 2,
  2.5: 2,
  1.25: 2
};

/**
 * Load plate inventory from localStorage with safe fallback to DEFAULT_PLATE_INVENTORY
 */
export function loadPlateInventory() {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_PLATE_INVENTORY };
  }
  try {
    const raw = localStorage.getItem(PLATE_INVENTORY_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PLATE_INVENTORY };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_PLATE_INVENTORY };

    const result = { ...DEFAULT_PLATE_INVENTORY };
    for (const plate of AVAILABLE_PLATES) {
      const val = parsed[plate.weight] !== undefined ? parsed[plate.weight] : parsed[String(plate.weight)];
      if (val !== undefined && val !== null && !isNaN(Number(val))) {
        result[plate.weight] = Math.max(0, Math.floor(Number(val)));
      }
    }
    return result;
  } catch (e) {
    return { ...DEFAULT_PLATE_INVENTORY };
  }
}

/**
 * Persist plate inventory to localStorage
 */
export function savePlateInventory(inventory) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PLATE_INVENTORY_STORAGE_KEY, JSON.stringify(inventory));
  } catch (e) {
    console.error('Failed to save plate inventory to localStorage', e);
  }
}

// Reactive singleton state for inventory
const plateInventory = ref(loadPlateInventory());

/**
 * Helper to get available pairs for a specific plate weight from an inventory object or map
 */
function getAvailablePairs(inv, weight) {
  if (!inv) return Infinity;
  let val;
  if (inv instanceof Map) {
    val = inv.has(weight) ? inv.get(weight) : inv.get(String(weight));
  } else if (typeof inv === 'object') {
    val = inv[weight] !== undefined ? inv[weight] : inv[String(weight)];
  }
  if (val === undefined || val === null) {
    return 0;
  }
  const num = Number(val);
  return isNaN(num) ? 0 : Math.max(0, Math.floor(num));
}

/**
 * Set the number of pairs for a specific plate weight
 */
export function setPlatePairs(weight, pairs) {
  const numWeight = parseFloat(weight);
  const count = Math.max(0, parseInt(pairs, 10) || 0);
  plateInventory.value = {
    ...plateInventory.value,
    [numWeight]: count
  };
  savePlateInventory(plateInventory.value);
  return plateInventory.value;
}

/**
 * Reset plate inventory back to default pairs
 */
export function resetPlateInventory() {
  plateInventory.value = { ...DEFAULT_PLATE_INVENTORY };
  savePlateInventory(plateInventory.value);
  return plateInventory.value;
}

/**
 * Greedily calculate plates required per side respecting plate inventory
 * @param {number|string} targetTotalWeight
 * @param {number} barWeight
 * @param {Object|Map|null} [inventory] Optional inventory map (weight -> pairs). If omitted, uses current reactive inventory/default.
 */
export function calculatePlates(targetTotalWeight, barWeight = 20, inventory) {
  const target = Math.max(0, parseFloat(targetTotalWeight) || 0);
  const bar = parseFloat(barWeight) || 0;

  let effectiveInventory = inventory;
  if (effectiveInventory === undefined || effectiveInventory === null) {
    effectiveInventory = plateInventory?.value || DEFAULT_PLATE_INVENTORY;
  }

  if (target <= bar) {
    return {
      success: true,
      targetWeight: target,
      barWeight: bar,
      perSideWeight: 0,
      platesPerSide: [],
      plateSummary: [],
      remainder: 0,
      achievedTotal: bar,
      shortage: 0,
      shortagePerSide: 0,
      shortageTotal: 0,
      hasShortage: false,
      notes: ''
    };
  }

  const sideTarget = Math.round(((target - bar) / 2) * 100) / 100;
  let currentRemainder = sideTarget;
  const allocatedPlates = [];

  const remainingPairs = new Map();
  for (const plate of AVAILABLE_PLATES) {
    remainingPairs.set(plate.weight, getAvailablePairs(effectiveInventory, plate.weight));
  }

  let ranOutOfPlates = false;

  for (const plate of AVAILABLE_PLATES) {
    while (currentRemainder >= plate.weight - 0.001) {
      const avail = remainingPairs.get(plate.weight) || 0;
      if (avail > 0) {
        allocatedPlates.push(plate);
        currentRemainder = Math.round((currentRemainder - plate.weight) * 100) / 100;
        remainingPairs.set(plate.weight, avail - 1);
      } else {
        ranOutOfPlates = true;
        break;
      }
    }
  }

  const achievedSide = Math.round(allocatedPlates.reduce((sum, p) => sum + p.weight, 0) * 100) / 100;
  const achievedTotal = Math.round((bar + achievedSide * 2) * 100) / 100;
  const shortageTotal = Math.max(0, Math.round((target - achievedTotal) * 100) / 100);
  const shortagePerSide = Math.max(0, Math.round(currentRemainder * 100) / 100);
  const hasShortage = shortageTotal > 0 && (ranOutOfPlates || shortageTotal > 0.001);

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

  let notes = '';
  if (hasShortage) {
    notes = `แผ่นเหล็กในคลังไม่พอ ขาดอีก ${shortageTotal} กก. (ข้างละ ${shortagePerSide} กก.)`;
  } else if (currentRemainder > 0) {
    notes = `เศษน้ำหนักข้างละ ${currentRemainder} กก. (รวม ${Math.round(currentRemainder * 2 * 100) / 100} กก.)`;
  }

  return {
    success: true,
    targetWeight: target,
    barWeight: bar,
    perSideWeight: achievedSide,
    platesPerSide: allocatedPlates,
    plateSummary,
    remainder: Math.round(currentRemainder * 100) / 100,
    achievedTotal,
    shortage: shortageTotal,
    shortagePerSide,
    shortageTotal,
    hasShortage,
    notes,
    note: notes
  };
}

// Reactive singleton state for the modal
const isOpen = ref(false);
const targetWeight = ref(60);
const selectedBar = ref(BAR_PRESETS[0]);
let onApplyCallback = null;

const calculation = computed(() => {
  return calculatePlates(targetWeight.value, selectedBar.value.weight, plateInventory.value);
});

/**
 * Barbell-style exercise (plate calculator is offered only for these, step 6c).
 * The exercise name decides: a dumbbell name is never barbell even if the alternate mentions Smith.
 */
export function isBarbellExercise(ex) {
  const name = String(ex?.name || '');
  const alt = String(ex?.altName || '');
  if (/dumbbell|ดัมเบล/i.test(name)) return false;
  return /barbell|บาร์เบล|smith|trap bar/i.test(`${name} ${alt}`);
}

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
    plateInventory,
    plateInventoryStorageKey: PLATE_INVENTORY_STORAGE_KEY,
    defaultPlateInventory: DEFAULT_PLATE_INVENTORY,
    setPlatePairs,
    resetPlateInventory,
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
