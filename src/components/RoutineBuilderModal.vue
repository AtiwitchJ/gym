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
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-plate/60 backdrop-blur-sm select-none"
      @click.self="handleClose"
    >
      <div
        class="w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] bg-paper border-t-2 sm:border-2 border-plate shadow-[4px_4px_0px_#1e2220] rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        <!-- Modal Header -->
        <header class="p-3.5 sm:p-4 bg-surface border-b-2 border-plate flex items-center justify-between gap-3 flex-shrink-0">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-emerald-bg border-2 border-plate shadow-[1.5px_1.5px_0px_#059669] flex items-center justify-center text-emerald-text flex-shrink-0">
              <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div class="min-w-0">
              <h3 class="text-sm sm:text-base font-bold font-heading text-ink tracking-tight truncate">
                {{ isEditMode ? 'แก้ไขตารางออกกำลังกาย' : 'สร้างตารางออกกำลังกายใหม่' }}
              </h3>
              <p class="text-[11px] text-ink-muted font-body truncate">
                กำหนดท่า เซ็ต และเป้าหมายครั้งสำหรับโปรแกรมของคุณ
              </p>
            </div>
          </div>

          <!-- Close Button -->
          <button
            @click="handleClose"
            class="w-8 h-8 rounded-lg bg-surface hover:bg-paper-subtle text-ink border-2 border-plate shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none flex items-center justify-center transition-all flex-shrink-0"
            title="ปิดหน้าต่าง"
          >
            <svg class="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <!-- Form Body (Scrollable) -->
        <div class="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          <!-- Error Alert Banner -->
          <div
            v-if="errorMessage"
            class="p-2.5 bg-rose-50 border-2 border-rose-500 rounded-xl text-rose-700 text-xs font-mono font-bold flex items-center gap-2"
          >
            <svg class="w-4 h-4 stroke-current fill-none stroke-2 flex-shrink-0" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Routine Details Card -->
          <div class="bg-surface border-2 border-plate rounded-xl p-3 sm:p-4 shadow-[2px_2px_0px_#1e2220] space-y-3">
            <div>
              <label class="block text-xs font-mono font-bold text-ink mb-1">
                ชื่อตารางฝึก (Routine Title) <span class="text-flame-text">*</span>
              </label>
              <input
                v-model="routineForm.title"
                type="text"
                placeholder="เช่น Upper Body Power & Hypertrophy"
                class="w-full px-3 py-2 text-xs sm:text-sm bg-paper border-2 border-plate rounded-lg shadow-[1.5px_1.5px_0px_#1e2220] focus-visible:outline-none focus:border-flame font-heading font-bold"
              />
            </div>

            <div>
              <label class="block text-xs font-mono font-bold text-ink mb-1">
                คำอธิบาย / จุดเน้น (Subtitle / Focus)
              </label>
              <input
                v-model="routineForm.subtitle"
                type="text"
                placeholder="เช่น เน้นอกบนและหลังปีก พักระหว่างเซ็ต 90 วินาที"
                class="w-full px-3 py-2 text-xs bg-paper border-2 border-plate rounded-lg shadow-[1.5px_1.5px_0px_#1e2220] focus-visible:outline-none focus:border-flame font-body"
              />
            </div>
          </div>

          <!-- Exercises Section -->
          <div class="space-y-3">
            <div class="flex items-center justify-between gap-2 px-1">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-flame"></span>
                <h4 class="text-xs sm:text-sm font-bold font-heading text-ink">
                  รายการท่าฝึกในตาราง ({{ routineForm.exercises.length }} ท่า)
                </h4>
              </div>

              <!-- Add Exercise Trigger Button -->
              <button
                type="button"
                @click="openExercisePicker"
                class="px-3 py-1.5 rounded-lg border-2 border-plate bg-flame hover:bg-flame-glow text-white font-heading font-bold text-xs flex items-center gap-1.5 shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              >
                <svg class="w-3.5 h-3.5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>+ เพิ่มท่าเล่น</span>
              </button>
            </div>

            <!-- Empty Exercise State -->
            <div
              v-if="routineForm.exercises.length === 0"
              class="text-center py-10 px-4 bg-surface border-2 border-dashed border-plate/30 rounded-xl"
            >
              <div class="w-10 h-10 mx-auto mb-2 rounded-full bg-paper-dim border-2 border-plate/20 flex items-center justify-center text-ink-muted">
                <svg class="w-5 h-5 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
                  <path d="M4 6h16M4 18h16M9 6v12M15 6v12M2 9h2v6H2zM20 9h2v6h-2z" />
                </svg>
              </div>
              <p class="text-xs font-bold font-heading text-ink mb-1">
                ยังไม่มีท่าในตารางนี้
              </p>
              <p class="text-[11px] text-ink-muted mb-3 font-body">
                แตะปุ่มด้านล่างเพื่อเลือกท่าจากคลัง หรือสร้างท่าใหม่
              </p>
              <button
                type="button"
                @click="openExercisePicker"
                class="px-3.5 py-1.5 text-xs font-heading font-bold border-2 border-plate bg-flame text-white rounded-lg shadow-[1.5px_1.5px_0px_#1e2220]"
              >
                + เพิ่มท่าเล่นแรก
              </button>
            </div>

            <!-- Exercises Cards List -->
            <div
              v-for="(exItem, exIdx) in routineForm.exercises"
              :key="exItem.exerciseId + '_' + exIdx"
              class="archive-card p-3 sm:p-3.5 space-y-3"
            >
              <!-- Exercise Item Header -->
              <div class="flex items-start justify-between gap-2 pb-2 border-b border-plate/15">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap mb-1">
                    <span class="w-5 h-5 rounded-md bg-plate text-white text-[11px] font-mono font-bold flex items-center justify-center">
                      #{{ exIdx + 1 }}
                    </span>
                    <span
                      class="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded-full uppercase border"
                      :class="getMuscleBadgeClass(getExerciseInfo(exItem.exerciseId)?.muscleGroup)"
                    >
                      {{ getMuscleLabel(getExerciseInfo(exItem.exerciseId)?.muscleGroup) }}
                    </span>
                    <span class="text-[11px] font-mono px-1.5 py-0.5 rounded-full capitalize bg-surface-card border border-plate/20 text-ink-muted">
                      {{ getExerciseInfo(exItem.exerciseId)?.equipment || 'อุปกรณ์' }}
                    </span>
                  </div>

                  <h5 class="text-xs sm:text-sm font-bold font-heading text-ink leading-tight truncate">
                    {{ getExerciseInfo(exItem.exerciseId)?.name || exItem.exerciseId }}
                  </h5>
                </div>

                <!-- Exercise Controls (Move Up/Down, Remove) -->
                <div class="flex items-center gap-1 flex-shrink-0">
                  <button
                    v-if="exIdx > 0"
                    type="button"
                    @click="moveExerciseUp(exIdx)"
                    class="w-6 h-6 rounded border border-plate/40 hover:border-plate bg-surface text-ink flex items-center justify-center text-[11px]"
                    title="เลื่อนขึ้น"
                  >
                    ▲
                  </button>
                  <button
                    v-if="exIdx < routineForm.exercises.length - 1"
                    type="button"
                    @click="moveExerciseDown(exIdx)"
                    class="w-6 h-6 rounded border border-plate/40 hover:border-plate bg-surface text-ink flex items-center justify-center text-[11px]"
                    title="เลื่อนลง"
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    @click="removeExercise(exIdx)"
                    class="w-6 h-6 rounded border border-rose-300 hover:border-rose-600 bg-rose-50 text-rose-600 flex items-center justify-center text-xs font-bold"
                    title="ลบท่านี้ออกจากตาราง"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <!-- Sets Table -->
              <div class="space-y-1.5">
                <div class="grid grid-cols-12 gap-1.5 text-[11px] font-mono font-bold text-ink-muted px-1">
                  <div class="col-span-1 text-center">เซ็ต</div>
                  <div class="col-span-5 text-center">ประเภท (Type)</div>
                  <div class="col-span-3 text-center">เป้าครั้ง</div>
                  <div class="col-span-2 text-center">นน. (กก.)</div>
                  <div class="col-span-1 text-center">ลบ</div>
                </div>

                <!-- Set Rows -->
                <div
                  v-for="(set, setIdx) in exItem.sets"
                  :key="setIdx"
                  class="grid grid-cols-12 gap-1.5 items-center bg-paper-subtle p-1.5 rounded-lg border border-plate/20 text-xs font-mono"
                >
                  <!-- Set Number -->
                  <div class="col-span-1 text-center font-bold text-ink text-[11px] tabular-nums">
                    {{ setIdx + 1 }}
                  </div>

                  <!-- Set Type 4-Button Segmented Group -->
                  <div class="col-span-5 grid grid-cols-4 gap-0.5 bg-paper p-0.5 rounded-md border border-plate/30">
                    <button
                      type="button"
                      @click="set.type = 'warmup'"
                      class="py-0.5 text-[11px] font-bold rounded transition-colors text-center"
                      :class="set.type === 'warmup' ? 'bg-gold text-ink font-extrabold shadow-sm' : 'text-ink-muted hover:text-ink'"
                      title="วอร์ม (Warm-up)"
                    >
                      W
                    </button>
                    <button
                      type="button"
                      @click="set.type = 'working'"
                      class="py-0.5 text-[11px] font-bold rounded transition-colors text-center"
                      :class="set.type === 'working' ? 'bg-flame text-white font-extrabold shadow-sm' : 'text-ink-muted hover:text-ink'"
                      title="เล่นจริง (Working)"
                    >
                      R
                    </button>
                    <button
                      type="button"
                      @click="set.type = 'dropset'"
                      class="py-0.5 text-[11px] font-bold rounded transition-colors text-center"
                      :class="set.type === 'dropset' ? 'bg-sky text-white font-extrabold shadow-sm' : 'text-ink-muted hover:text-ink'"
                      title="ดรอปเซ็ต (Dropset)"
                    >
                      D
                    </button>
                    <button
                      type="button"
                      @click="set.type = 'failure'"
                      class="py-0.5 text-[11px] font-bold rounded transition-colors text-center"
                      :class="set.type === 'failure' ? 'bg-rose-600 text-white font-extrabold shadow-sm' : 'text-ink-muted hover:text-ink'"
                      title="จนหมดแรง (Failure)"
                    >
                      F
                    </button>
                  </div>

                  <!-- Target Reps -->
                  <div class="col-span-3">
                    <input
                      v-model.number="set.targetReps"
                      type="number"
                      min="1"
                      max="100"
                      class="w-full px-1.5 py-1 text-center text-xs font-mono font-bold bg-white border border-plate/40 rounded focus-visible:outline-none focus:border-flame tabular-nums"
                      placeholder="8"
                    />
                  </div>

                  <!-- Target Weight -->
                  <div class="col-span-2">
                    <input
                      v-model.number="set.targetWeight"
                      type="number"
                      min="0"
                      step="0.5"
                      class="w-full px-1 py-1 text-center text-xs font-mono bg-white border border-plate/40 rounded focus-visible:outline-none focus:border-flame tabular-nums"
                      placeholder="0"
                    />
                  </div>

                  <!-- Delete Set Button -->
                  <div class="col-span-1 text-center">
                    <button
                      type="button"
                      @click="removeSet(exIdx, setIdx)"
                      :disabled="exItem.sets.length <= 1"
                      class="w-5 h-5 inline-flex items-center justify-center rounded text-ink-muted hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:text-ink-muted disabled:hover:bg-transparent"
                      title="ลบเซ็ตนี้"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <!-- Add Set Button for this exercise -->
                <div class="pt-1 flex justify-start">
                  <button
                    type="button"
                    @click="addSet(exIdx)"
                    class="px-2.5 py-1 text-[11px] font-mono font-bold rounded-md border border-plate/40 hover:border-plate bg-surface hover:bg-paper text-ink flex items-center gap-1 transition-all"
                  >
                    <span class="text-flame-text font-extrabold">+</span>
                    <span>เพิ่มเซ็ต</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer Actions -->
        <footer class="p-3 sm:p-4 bg-surface border-t-2 border-plate flex items-center justify-between gap-2 flex-shrink-0">
          <button
            type="button"
            @click="handleClose"
            class="px-4 py-2 rounded-xl border-2 border-plate/40 hover:border-plate text-xs font-mono font-bold text-ink bg-surface hover:bg-paper-subtle transition-all"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            @click="saveRoutine"
            class="px-5 py-2 rounded-xl border-2 border-plate bg-emerald hover:bg-emerald-600 text-white font-heading font-bold text-xs sm:text-sm shadow-[2px_2px_0px_#1e2220] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5"
          >
            <svg class="w-4 h-4 stroke-current fill-none stroke-2" viewBox="0 0 24 24">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>{{ isEditMode ? 'บันทึกการแก้ไข' : 'บันทึกตารางเล่น' }}</span>
          </button>
        </footer>
      </div>
    </div>
  </transition>

  <!-- Embedded Exercise Library Modal (Picker Mode) -->
  <ExerciseLibraryModal
    :is-open="isPickerOpen"
    mode="picker"
    @close="isPickerOpen = false"
    @select="handleExerciseSelected"
  />
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue';
import { useRoutineStore } from '../composables/useRoutineStore.js';
import { useExerciseStore } from '../composables/useExerciseStore.js';
import ExerciseLibraryModal from './ExerciseLibraryModal.vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  },
  initialRoutine: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'saved']);

const routineStore = useRoutineStore();
const exerciseStore = useExerciseStore();

const isPickerOpen = ref(false);
const errorMessage = ref('');

const isEditMode = computed(() => Boolean(props.initialRoutine && props.initialRoutine.id));

const routineForm = reactive({
  title: '',
  subtitle: '',
  exercises: []
});

// Sync form with props on open/change
watch(
  () => [props.isOpen, props.initialRoutine],
  ([newIsOpen, newInit]) => {
    if (newIsOpen) {
      errorMessage.value = '';
      if (newInit) {
        routineForm.title = newInit.title || '';
        routineForm.subtitle = newInit.subtitle || '';
        routineForm.exercises = Array.isArray(newInit.exercises)
          ? JSON.parse(JSON.stringify(newInit.exercises))
          : [];
      } else {
        routineForm.title = '';
        routineForm.subtitle = '';
        routineForm.exercises = [];
      }
    }
  },
  { immediate: true }
);

function getExerciseInfo(exerciseId) {
  return exerciseStore.getExerciseById(exerciseId);
}

function openExercisePicker() {
  isPickerOpen.value = true;
}

function handleExerciseSelected(exercise) {
  if (!exercise || !exercise.id) return;

  // Add selected exercise with standard 4-set template: 1 warmup + 3 working sets
  routineForm.exercises.push({
    exerciseId: exercise.id,
    sets: [
      { type: 'warmup', targetReps: 15, targetWeight: 0 },
      { type: 'working', targetReps: 8, targetWeight: 0 },
      { type: 'working', targetReps: 8, targetWeight: 0 },
      { type: 'working', targetReps: 8, targetWeight: 0 }
    ]
  });

  isPickerOpen.value = false;
  errorMessage.value = '';
}

function addSet(exerciseIndex) {
  const ex = routineForm.exercises[exerciseIndex];
  if (!ex) return;
  ex.sets.push({
    type: 'working',
    targetReps: 8,
    targetWeight: 0
  });
}

function removeSet(exerciseIndex, setIndex) {
  const ex = routineForm.exercises[exerciseIndex];
  if (!ex || ex.sets.length <= 1) return;
  ex.sets.splice(setIndex, 1);
}

function removeExercise(index) {
  routineForm.exercises.splice(index, 1);
}

function moveExerciseUp(index) {
  if (index <= 0) return;
  const temp = routineForm.exercises[index];
  routineForm.exercises[index] = routineForm.exercises[index - 1];
  routineForm.exercises[index - 1] = temp;
}

function moveExerciseDown(index) {
  if (index >= routineForm.exercises.length - 1) return;
  const temp = routineForm.exercises[index];
  routineForm.exercises[index] = routineForm.exercises[index + 1];
  routineForm.exercises[index + 1] = temp;
}

function saveRoutine() {
  errorMessage.value = '';

  const cleanTitle = (routineForm.title || '').trim();
  if (!cleanTitle) {
    errorMessage.value = 'กรุณาระบุชื่อตารางออกกำลังกาย';
    return;
  }

  if (routineForm.exercises.length === 0) {
    errorMessage.value = 'กรุณาเพิ่มอย่างน้อย 1 ท่าในตารางออกกำลังกาย';
    return;
  }

  // Ensure each exercise has valid sets
  const cleanExercises = routineForm.exercises.map(ex => ({
    exerciseId: ex.exerciseId,
    sets: ex.sets.map(s => ({
      type: s.type || 'working',
      targetReps: Number(s.targetReps) > 0 ? Number(s.targetReps) : 8,
      targetWeight: Number(s.targetWeight) >= 0 ? Number(s.targetWeight) : 0
    }))
  }));

  let result;
  if (isEditMode.value) {
    result = routineStore.updateRoutine(props.initialRoutine.id, {
      title: cleanTitle,
      subtitle: (routineForm.subtitle || '').trim(),
      exercises: cleanExercises
    });
  } else {
    result = routineStore.createRoutine({
      title: cleanTitle,
      subtitle: (routineForm.subtitle || '').trim(),
      exercises: cleanExercises
    });
  }

  emit('saved', result);
  emit('close');
}

function handleClose() {
  emit('close');
}

// Thai muscle labels and badge colors
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
      return 'bg-flame-bg text-flame-text border-flame';
    case 'back':
      return 'bg-sky-bg text-sky-text border-sky';
    case 'quads':
    case 'hamstrings':
      return 'bg-emerald-bg text-emerald-text border-emerald';
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