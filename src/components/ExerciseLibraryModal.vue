<template>
  <transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
      @click.self="emit('close')"
    >
      <div
        class="w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-paper border-t-2 sm:border-2 border-plate shadow-[4px_4px_0px_#1e2220] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        <!-- Modal Header -->
        <header class="p-3.5 sm:p-4 bg-surface border-b-2 border-plate flex items-center justify-between gap-3 flex-shrink-0">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-flame-bg border-2 border-plate shadow-[1.5px_1.5px_0px_#ea580c] flex items-center justify-center text-flame flex-shrink-0">
              <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-sm sm:text-base font-bold font-heading text-ink tracking-tight truncate">
                  {{ mode === 'picker' ? 'เลือกท่าออกกำลังกาย' : 'คลังท่าออกกำลังกาย' }}
                </h3>
                <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-paper-subtle border border-plate/30 text-ink-muted">
                  {{ filteredExercises.length }} / {{ exercises.length }}
                </span>
              </div>
              <p class="text-[11px] text-ink-muted font-body truncate">
                {{ mode === 'picker' ? 'แตะท่าเพื่อเพิ่มลงในตารางฝึกของคุณ' : 'ค้นหา คัดกรอง หรือสร้างท่าฝึกที่คุณกำหนดเอง' }}
              </p>
            </div>
          </div>

          <!-- Close Button -->
          <button
            @click="emit('close')"
            class="w-8 h-8 rounded-lg bg-surface hover:bg-paper-subtle text-ink border-2 border-plate shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center transition-all flex-shrink-0"
            title="ปิดหน้าต่าง"
          >
            <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <!-- Search Bar & Custom Exercise Action Strip -->
        <div class="p-3 sm:p-4 bg-paper-subtle border-b-2 border-plate/20 space-y-2.5 flex-shrink-0">
          <div class="flex items-center gap-2">
            <!-- Search Input -->
            <div class="relative flex-1">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-muted">
                <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="ค้นหาชื่อท่า, กลุ่มกล้ามเนื้อ, หรืออุปกรณ์..."
                class="w-full pl-9 pr-8 py-2 bg-white text-ink text-xs sm:text-sm font-body border-2 border-plate rounded-xl shadow-[2px_2px_0px_#1e2220] focus:outline-none focus:border-flame transition-all placeholder:text-ink-faint"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-ink-faint hover:text-ink"
                title="ล้างข้อความค้นหา"
              >
                <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <!-- Toggle Custom Exercise Form Button -->
            <button
              @click="toggleCustomForm"
              class="px-3 py-2 rounded-xl border-2 border-plate font-heading font-bold text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex-shrink-0"
              :class="showCustomForm ? 'bg-plate text-white' : 'bg-surface hover:bg-paper text-ink'"
              title="สร้างท่าออกกำลังกายใหม่"
            >
              <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span class="hidden xs:inline">{{ showCustomForm ? 'ซ่อนฟอร์ม' : '+ ท่าของฉัน' }}</span>
              <span class="xs:hidden">{{ showCustomForm ? 'ปิด' : '+' }}</span>
            </button>
          </div>

          <!-- Muscle Group Filter Chips -->
          <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              v-for="chip in muscleChips"
              :key="chip.id"
              @click="selectMuscleFilter(chip.id)"
              class="px-2.5 py-1 rounded-full border-2 font-mono text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0"
              :class="isMuscleActive(chip.id)
                ? 'bg-plate text-white border-plate shadow-[2px_2px_0px_#ea580c] -translate-y-0.5'
                : 'bg-surface hover:bg-paper text-ink border-plate/30 hover:border-plate shadow-[1px_1px_0px_#1e2220]'"
            >
              {{ chip.label }}
            </button>
          </div>
        </div>

        <!-- Inline Custom Exercise Form (Collapsible) -->
        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="-translate-y-4 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-4 opacity-0"
        >
          <div
            v-if="showCustomForm"
            class="p-3.5 sm:p-4 bg-flame-bg/60 border-b-2 border-plate flex-shrink-0"
          >
            <div class="bg-surface border-2 border-plate rounded-xl p-3 sm:p-4 shadow-[2px_2px_0px_#ea580c]">
              <div class="flex items-center justify-between gap-2 mb-2.5">
                <h4 class="text-xs sm:text-sm font-bold font-heading text-ink flex items-center gap-1.5">
                  <span class="w-2 h-2 rounded-full bg-flame"></span>
                  <span>สร้างท่าออกกำลังกายใหม่ (Custom Exercise)</span>
                </h4>
                <span class="text-[10px] font-mono text-ink-muted">บันทึกเก็บในเครื่องอัตโนมัติ</span>
              </div>

              <!-- Form Fields -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                <!-- Name -->
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-mono font-bold text-ink mb-1">
                    ชื่อท่าออกกำลังกาย (Name) <span class="text-flame">*</span>
                  </label>
                  <input
                    v-model="customForm.name"
                    type="text"
                    placeholder="เช่น Incline Hammer Dumbbell Curl"
                    class="w-full px-2.5 py-1.5 text-xs bg-paper border-2 border-plate rounded-lg shadow-[1.5px_1.5px_0px_#1e2220] focus:outline-none focus:border-flame"
                  />
                </div>

                <!-- Muscle Group -->
                <div>
                  <label class="block text-[11px] font-mono font-bold text-ink mb-1">
                    กลุ่มกล้ามเนื้อ (Muscle Group)
                  </label>
                  <select
                    v-model="customForm.muscleGroup"
                    class="w-full px-2 py-1.5 text-xs bg-paper border-2 border-plate rounded-lg shadow-[1.5px_1.5px_0px_#1e2220] focus:outline-none focus:border-flame"
                  >
                    <option value="chest">อก (Chest)</option>
                    <option value="back">หลัง (Back)</option>
                    <option value="quads">ขาหน้า (Quads)</option>
                    <option value="hamstrings">ขาหลัง (Hamstrings)</option>
                    <option value="delts">ไหล่ (Delts)</option>
                    <option value="arms">แขน (Arms)</option>
                    <option value="abs">หน้าท้อง (Abs)</option>
                    <option value="cardio">คาร์ดิโอ (Cardio)</option>
                    <option value="other">อื่นๆ (Other)</option>
                  </select>
                </div>

                <!-- Equipment -->
                <div>
                  <label class="block text-[11px] font-mono font-bold text-ink mb-1">
                    อุปกรณ์ที่ใช้ (Equipment)
                  </label>
                  <select
                    v-model="customForm.equipment"
                    class="w-full px-2 py-1.5 text-xs bg-paper border-2 border-plate rounded-lg shadow-[1.5px_1.5px_0px_#1e2220] focus:outline-none focus:border-flame"
                  >
                    <option value="barbell">บาร์เบล (Barbell)</option>
                    <option value="dumbbell">ดัมเบล (Dumbbell)</option>
                    <option value="cable">เคเบิล (Cable)</option>
                    <option value="machine">แมชชีน (Machine)</option>
                    <option value="smith_machine">สมิทแมชชีน (Smith Machine)</option>
                    <option value="bodyweight">บอดี้เวท (Bodyweight)</option>
                    <option value="other">อื่นๆ (Other)</option>
                  </select>
                </div>

                <!-- Notes -->
                <div class="sm:col-span-2">
                  <label class="block text-[11px] font-mono font-bold text-ink mb-1">
                    คำแนะนำ / โฟกัส (Notes)
                  </label>
                  <input
                    v-model="customForm.notes"
                    type="text"
                    placeholder="เช่น ปรับม้านั่ง 45 องศา, โฟกัสช่วงบีบสุด 1 วินาที"
                    class="w-full px-2.5 py-1.5 text-xs bg-paper border-2 border-plate rounded-lg shadow-[1.5px_1.5px_0px_#1e2220] focus:outline-none focus:border-flame"
                  />
                </div>
              </div>

              <!-- Form Actions -->
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  @click="showCustomForm = false"
                  class="px-3 py-1.5 text-xs font-mono font-bold rounded-lg border-2 border-plate/40 hover:border-plate bg-surface text-ink-muted hover:text-ink"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  @click="submitCustomExercise"
                  class="px-4 py-1.5 text-xs font-heading font-bold rounded-lg border-2 border-plate bg-flame hover:bg-flame-glow text-white shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                >
                  บันทึกท่าใหม่
                </button>
              </div>
            </div>
          </div>
        </transition>

        <!-- Exercise Cards List -->
        <div class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          <!-- Empty State -->
          <div
            v-if="filteredExercises.length === 0"
            class="text-center py-12 px-4 bg-surface border-2 border-dashed border-plate/30 rounded-xl"
          >
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-paper-dim border-2 border-plate/20 flex items-center justify-center text-ink-faint">
              <svg class="w-6 h-6 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <p class="text-sm font-bold font-heading text-ink mb-1">
              ไม่พบท่าออกกำลังกายที่ตรงกับการค้นหา
            </p>
            <p class="text-xs text-ink-muted mb-4 font-body">
              ลองเปลี่ยนคำค้นหา หรือสร้างท่าฝึกของคุณเอง
            </p>
            <div class="flex items-center justify-center gap-2">
              <button
                @click="resetFilters"
                class="px-3 py-1.5 text-xs font-mono font-bold border-2 border-plate bg-surface rounded-lg shadow-[1.5px_1.5px_0px_#1e2220]"
              >
                ล้างการค้นหา
              </button>
              <button
                @click="showCustomForm = true"
                class="px-3 py-1.5 text-xs font-heading font-bold border-2 border-plate bg-flame text-white rounded-lg shadow-[1.5px_1.5px_0px_#1e2220]"
              >
                + สร้างท่าของฉัน
              </button>
            </div>
          </div>

          <!-- Cards -->
          <div
            v-for="exercise in filteredExercises"
            :key="exercise.id"
            class="archive-card p-3 sm:p-3.5 hover:border-flame transition-all group flex flex-col gap-2"
            :class="mode === 'picker' ? 'cursor-pointer' : ''"
            @click="handleCardClick(exercise)"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap mb-1">
                  <!-- Muscle Group Tag -->
                  <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border" :class="getMuscleBadgeClass(exercise.muscleGroup)">
                    {{ getMuscleLabel(exercise.muscleGroup) }}
                  </span>

                  <!-- Equipment Tag -->
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded-full capitalize bg-surface-card border border-plate/20 text-ink-muted">
                    {{ exercise.equipment || 'อุปกรณ์ทั่วไป' }}
                  </span>

                  <!-- Custom Badge -->
                  <span
                    v-if="exercise.isCustom"
                    class="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-full bg-gold-bg text-gold border border-gold uppercase"
                  >
                    CUSTOM
                  </span>
                </div>

                <!-- Exercise Name -->
                <h4 class="text-xs sm:text-sm font-bold font-heading text-ink group-hover:text-flame transition-colors leading-tight">
                  {{ exercise.name }}
                </h4>
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-1.5 flex-shrink-0" @click.stop>
                <!-- Info Toggle Button -->
                <button
                  v-if="exercise.notes"
                  @click="toggleInfo(exercise.id)"
                  class="w-7 h-7 rounded-lg border-2 border-plate/40 hover:border-plate bg-surface text-ink-muted hover:text-ink flex items-center justify-center transition-all"
                  :class="expandedInfo[exercise.id] ? 'bg-paper-dim border-plate text-ink' : ''"
                  title="ดูรายละเอียดท่า"
                >
                  <svg class="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>

                <!-- Select Button -->
                <button
                  @click="selectExercise(exercise)"
                  class="px-2.5 sm:px-3 py-1.5 rounded-lg border-2 border-plate font-heading font-bold text-xs flex items-center gap-1 shadow-[1.5px_1.5px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
                  :class="mode === 'picker'
                    ? 'bg-flame hover:bg-flame-glow text-white'
                    : 'bg-surface hover:bg-paper-subtle text-ink'"
                >
                  <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{{ mode === 'picker' ? '+ เลือก' : 'เลือก' }}</span>
                </button>
              </div>
            </div>

            <!-- Expandable Notes / Description -->
            <div
              v-if="expandedInfo[exercise.id] && exercise.notes"
              class="pt-2 mt-1 border-t border-plate/15 text-[11px] text-ink-muted font-body leading-relaxed bg-paper-subtle/50 p-2 rounded-lg"
            >
              <strong class="font-bold text-ink">ข้อแนะนำ:</strong> {{ exercise.notes }}
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <footer class="p-3 bg-surface border-t-2 border-plate flex items-center justify-between text-xs font-mono text-ink-muted flex-shrink-0">
          <span>แสดง {{ filteredExercises.length }} ท่า</span>
          <button
            @click="emit('close')"
            class="px-3 py-1 rounded-lg border border-plate/40 text-ink font-bold hover:bg-paper-subtle"
          >
            ปิด
          </button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useExerciseStore } from '../composables/useExerciseStore.js';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    default: 'browse',
    validator: val => ['browse', 'picker'].includes(val)
  }
});

const emit = defineEmits(['close', 'select']);

const {
  exercises,
  filteredExercises,
  selectedMuscle,
  searchQuery,
  createCustomExercise
} = useExerciseStore();

// Muscle categories chip filters
const muscleChips = [
  { id: 'all', label: 'ทั้งหมด (All)' },
  { id: 'chest', label: 'อก (Chest)' },
  { id: 'back', label: 'หลัง (Back)' },
  { id: 'quads', label: 'ขาหน้า (Quads)' },
  { id: 'hamstrings', label: 'ขาหลัง (Hamstrings)' },
  { id: 'delts', label: 'ไหล่ (Delts)' },
  { id: 'arms', label: 'แขน (Arms)' },
  { id: 'abs', label: 'ท้อง (Abs)' },
  { id: 'cardio', label: 'คาร์ดิโอ (Cardio)' }
];

function isMuscleActive(chipId) {
  if (chipId === 'all') {
    return !selectedMuscle.value || selectedMuscle.value === 'all';
  }
  return selectedMuscle.value === chipId;
}

function selectMuscleFilter(chipId) {
  if (chipId === 'all') {
    selectedMuscle.value = '';
  } else if (selectedMuscle.value === chipId) {
    selectedMuscle.value = '';
  } else {
    selectedMuscle.value = chipId;
  }
}

function resetFilters() {
  selectedMuscle.value = '';
  searchQuery.value = '';
}

// Custom exercise inline form state
const showCustomForm = ref(false);
const customForm = reactive({
  name: '',
  muscleGroup: 'chest',
  equipment: 'barbell',
  notes: ''
});

function toggleCustomForm() {
  showCustomForm.value = !showCustomForm.value;
}

function submitCustomExercise() {
  if (!customForm.name || !customForm.name.trim()) {
    alert('กรุณากรอกชื่อท่าออกกำลังกาย');
    return;
  }

  const created = createCustomExercise({
    name: customForm.name.trim(),
    muscleGroup: customForm.muscleGroup,
    equipment: customForm.equipment,
    notes: customForm.notes.trim()
  });

  // Reset form
  customForm.name = '';
  customForm.notes = '';
  showCustomForm.value = false;

  // If in picker mode, auto-select newly created exercise
  if (props.mode === 'picker') {
    emit('select', created);
  }
}

// Exercise info collapse toggling
const expandedInfo = reactive({});
function toggleInfo(id) {
  expandedInfo[id] = !expandedInfo[id];
}

// Card Selection Handler
function selectExercise(exercise) {
  emit('select', exercise);
}

function handleCardClick(exercise) {
  if (props.mode === 'picker') {
    selectExercise(exercise);
  }
}

// Thai label mappings for muscle groups
const muscleLabels = {
  chest: 'อก',
  back: 'หลัง',
  quads: 'ขาหน้า',
  hamstrings: 'ขาหลัง',
  delts: 'ไหล่',
  arms: 'แขน',
  abs: 'หน้าท้อง',
  cardio: 'คาร์ดิโอ',
  other: 'อื่นๆ'
};

function getMuscleLabel(group) {
  return muscleLabels[group] || group || 'ทั่วไป';
}

function getMuscleBadgeClass(group) {
  switch (group) {
    case 'chest':
      return 'bg-flame-bg text-flame border-flame';
    case 'back':
      return 'bg-sky-bg text-sky border-sky';
    case 'quads':
    case 'hamstrings':
      return 'bg-emerald-bg text-emerald border-emerald';
    case 'delts':
      return 'bg-gold-bg text-gold border-gold';
    case 'arms':
      return 'bg-purple-50 text-purple-700 border-purple-400';
    case 'abs':
      return 'bg-rose-50 text-rose-700 border-rose-400';
    case 'cardio':
      return 'bg-cyan-50 text-cyan-700 border-cyan-400';
    default:
      return 'bg-surface-card text-ink-muted border-plate/30';
  }
}
</script>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
/* Hide scrollbar for IE, Edge and Firefox */
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>